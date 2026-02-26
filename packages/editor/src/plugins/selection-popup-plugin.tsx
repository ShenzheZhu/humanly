import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $createRangeSelection,
  $setSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import { createPortal } from 'react-dom';

export interface SelectionInfo {
  text: string;
  start: number;
  end: number;
  rect: DOMRect;
}

export interface SelectionPopupPluginProps {
  onSelectionChange?: (selection: SelectionInfo | null) => void;
  renderPopup?: (props: {
    selection: SelectionInfo;
    onClose: () => void;
    replaceSelection: (newText: string) => void;
    cancelAIAction: () => void;
  }) => React.ReactNode;
}

/**
 * SelectionPopupPlugin detects text selection and can render a floating popup
 */
export function SelectionPopupPlugin({
  onSelectionChange,
  renderPopup,
}: SelectionPopupPluginProps): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [selectionInfo, setSelectionInfo] = useState<SelectionInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const isProcessingAIAction = useRef(false); // Track if AI action is in progress

  const updateSelection = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();

      if (!$isRangeSelection(selection) || selection.isCollapsed()) {
        setSelectionInfo(null);
        setIsVisible(false);
        onSelectionChange?.(null);
        return;
      }

      const text = selection.getTextContent();
      if (!text || text.trim().length === 0) {
        setSelectionInfo(null);
        setIsVisible(false);
        onSelectionChange?.(null);
        return;
      }

      // Get the DOM selection to position the popup
      const nativeSelection = window.getSelection();
      if (!nativeSelection || nativeSelection.rangeCount === 0) {
        return;
      }

      const range = nativeSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      const anchor = selection.anchor;
      const focus = selection.focus;
      const start = Math.min(anchor.offset, focus.offset);
      const end = Math.max(anchor.offset, focus.offset);

      const info: SelectionInfo = {
        text,
        start,
        end,
        rect,
      };

      setSelectionInfo(info);
      setIsVisible(true);
      onSelectionChange?.(info);
    });
  }, [editor, onSelectionChange]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setSelectionInfo(null);
    isProcessingAIAction.current = false; // Reset flag when closing
  }, []);

  const cancelAIAction = useCallback(() => {
    console.log('[SelectionPopupPlugin] AI action cancelled, unlocking popup');
    isProcessingAIAction.current = false;
  }, []);

  // Replace the current selection with new text
  const replaceSelection = useCallback((newText: string) => {
    console.log('[SelectionPopupPlugin] replaceSelection called with:', newText);

    // Store the selection info before updating, in case it gets cleared
    const storedSelectionInfo = selectionInfo;

    if (!storedSelectionInfo) {
      console.warn('[SelectionPopupPlugin] No selection info available for replacement');
      return;
    }

    console.log('[SelectionPopupPlugin] Replacing text:', {
      start: storedSelectionInfo.start,
      end: storedSelectionInfo.end,
      originalText: storedSelectionInfo.text,
      newText
    });

    // Set flag to prevent popup from closing during AI dialog interaction
    isProcessingAIAction.current = true;

    editor.update(() => {
      const selection = $getSelection();

      // If selection is still active, use it directly
      if ($isRangeSelection(selection) && !selection.isCollapsed()) {
        console.log('[SelectionPopupPlugin] Using active selection');
        selection.insertText(newText);
      } else {
        // Selection was lost (e.g., user clicked on dialog), restore it using stored offsets
        console.log('[SelectionPopupPlugin] Restoring selection from stored offsets');
        const root = $getRoot();
        const textNodes: any[] = [];

        // Collect all text nodes
        root.getChildren().forEach((child: any) => {
          if (child.getTextContent) {
            child.getChildren().forEach((node: any) => {
              if (node.getTextContent) {
                textNodes.push(node);
              }
            });
          }
        });

        // Find the text node and restore selection
        let currentOffset = 0;
        for (const textNode of textNodes) {
          const textContent = textNode.getTextContent();
          const nodeLength = textContent.length;

          if (currentOffset + nodeLength >= storedSelectionInfo.start) {
            const localStart = storedSelectionInfo.start - currentOffset;
            const localEnd = Math.min(storedSelectionInfo.end - currentOffset, nodeLength);

            // Select the text in this node
            const newSelection = $createRangeSelection();
            newSelection.anchor.set(textNode.getKey(), localStart, 'text');
            newSelection.focus.set(textNode.getKey(), localEnd, 'text');
            $setSelection(newSelection);

            // Now insert the new text
            newSelection.insertText(newText);
            break;
          }

          currentOffset += nodeLength;
        }
      }
    });

    // Reset flag and close popup
    isProcessingAIAction.current = false;
    handleClose();
    console.log('[SelectionPopupPlugin] Text replacement complete');
  }, [editor, handleClose, selectionInfo]);

  useEffect(() => {
    // Listen for selection changes
    const removeListener = editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        // Delay to ensure selection is updated
        requestAnimationFrame(updateSelection);
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    // Also listen for mouseup to catch selection via mouse
    const handleMouseUp = () => {
      setTimeout(updateSelection, 10);
    };

    // Listen for keyup to catch selection via keyboard (shift+arrow keys)
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        setTimeout(updateSelection, 10);
      }
    };

    // Hide popup when clicking outside
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Don't close if clicking on a button within the popup
      if (popupRef.current && popupRef.current.contains(target)) {
        console.log('[SelectionPopupPlugin] Click is within popup, keeping open');
        // Set flag when clicking buttons in popup (AI actions)
        if (target.closest('button')) {
          isProcessingAIAction.current = true;
          console.log('[SelectionPopupPlugin] AI action initiated, locking popup');
        }
        return;
      }

      // Don't close if an AI action is being processed
      if (isProcessingAIAction.current) {
        console.log('[SelectionPopupPlugin] Ignoring click outside - AI action in progress');
        return;
      }

      // Check if click is within the editor or AI dialog
      const editorRoot = editor.getRootElement();

      // Check if the click is on an AI dialog (which has role="dialog" or data-radix-portal)
      const isDialogClick = target.closest('[role="dialog"]') || target.closest('[data-radix-portal]');

      if (isDialogClick) {
        console.log('[SelectionPopupPlugin] Click is on dialog, keeping popup open');
        return;
      }

      if (editorRoot && !editorRoot.contains(target)) {
        console.log('[SelectionPopupPlugin] Click outside editor and popup, closing');
        handleClose();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      removeListener();
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editor, updateSelection, handleClose]);

  // Don't render if no selection or no renderPopup function
  if (!isVisible || !selectionInfo || !renderPopup) {
    return null;
  }

  // Calculate popup position (above the selection)
  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    top: selectionInfo.rect.top - 8,
    left: selectionInfo.rect.left + selectionInfo.rect.width / 2,
    transform: 'translate(-50%, -100%)',
    zIndex: 1000,
  };

  return createPortal(
    <div ref={popupRef} style={popupStyle}>
      {renderPopup({ selection: selectionInfo, onClose: handleClose, replaceSelection, cancelAIAction })}
    </div>,
    document.body
  );
}
