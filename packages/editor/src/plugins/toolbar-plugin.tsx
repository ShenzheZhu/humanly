import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  TextFormatType,
} from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { Bold, Italic, Underline, Strikethrough, Code, Eraser } from 'lucide-react';
import { ToolbarConfig } from '../types';
import { HeadingControls } from '../components/toolbar/heading-controls';
import { FontControls } from '../components/toolbar/font-controls';
import { ColorControls } from '../components/toolbar/color-controls';
import { ListControls } from '../components/toolbar/list-controls';
import { AlignmentControls } from '../components/toolbar/alignment-controls';

interface ToolbarState {
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrikethrough: boolean;
  isCode: boolean;
}

/**
 * ToolbarPlugin provides basic text formatting controls
 */
export function ToolbarPlugin(config: ToolbarConfig = {}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrikethrough: false,
    isCode: false,
  });

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();

    if ($isRangeSelection(selection)) {
      setToolbarState({
        isBold: selection.hasFormat('bold'),
        isItalic: selection.hasFormat('italic'),
        isUnderline: selection.hasFormat('underline'),
        isStrikethrough: selection.hasFormat('strikethrough'),
        isCode: selection.hasFormat('code'),
      });
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar();
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  const formatText = (format: TextFormatType) => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.getNodes().forEach((node) => {
          if (node.getType() === 'text') {
            const textNode = node as any;
            // Clear text format (bold, italic, underline, etc.)
            textNode.setFormat(0);
            // Clear inline styles (font, color, etc.)
            textNode.setStyle('');
          }
        });
      }
    });
  };

  return (
    <div className="editor-toolbar" style={toolbarStyles.container}>
      {/* Heading Controls */}
      <HeadingControls />

      <div style={toolbarStyles.divider} />

      {/* Font Controls */}
      <FontControls />

      <div style={toolbarStyles.divider} />

      {/* Basic Formatting */}
      <div style={toolbarStyles.section}>
        {config.showBold !== false && (
          <button
            onClick={() => formatText('bold')}
            className={toolbarState.isBold ? 'active' : ''}
            style={{
              ...toolbarStyles.button,
              ...(toolbarState.isBold ? toolbarStyles.activeButton : {}),
            }}
            aria-label="Format Bold"
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
        )}

        {config.showItalic !== false && (
          <button
            onClick={() => formatText('italic')}
            className={toolbarState.isItalic ? 'active' : ''}
            style={{
              ...toolbarStyles.button,
              ...(toolbarState.isItalic ? toolbarStyles.activeButton : {}),
            }}
            aria-label="Format Italic"
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
        )}

        {config.showUnderline !== false && (
          <button
            onClick={() => formatText('underline')}
            className={toolbarState.isUnderline ? 'active' : ''}
            style={{
              ...toolbarStyles.button,
              ...(toolbarState.isUnderline ? toolbarStyles.activeButton : {}),
            }}
            aria-label="Format Underline"
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>
        )}

        {config.showStrikethrough !== false && (
          <button
            onClick={() => formatText('strikethrough')}
            className={toolbarState.isStrikethrough ? 'active' : ''}
            style={{
              ...toolbarStyles.button,
              ...(toolbarState.isStrikethrough ? toolbarStyles.activeButton : {}),
            }}
            aria-label="Format Strikethrough"
            title="Strikethrough"
          >
            <Strikethrough size={16} />
          </button>
        )}

        {config.showCode !== false && (
          <button
            onClick={() => formatText('code')}
            className={toolbarState.isCode ? 'active' : ''}
            style={{
              ...toolbarStyles.button,
              ...(toolbarState.isCode ? toolbarStyles.activeButton : {}),
            }}
            aria-label="Format Code"
            title="Code"
          >
            <Code size={16} />
          </button>
        )}
      </div>

      <div style={toolbarStyles.divider} />

      {/* Color Controls */}
      <ColorControls />

      <div style={toolbarStyles.divider} />

      {/* List Controls */}
      <ListControls />

      <div style={toolbarStyles.divider} />

      {/* Alignment Controls */}
      <AlignmentControls />

      {config.showClear !== false && (
        <>
          <div style={toolbarStyles.divider} />
          <button
            onClick={clearFormatting}
            style={toolbarStyles.button}
            aria-label="Clear Formatting"
            title="Clear Formatting"
          >
            <Eraser size={16} />
          </button>
        </>
      )}
    </div>
  );
}

// Basic inline styles (can be overridden with CSS)
const toolbarStyles = {
  container: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    padding: '8px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
  },
  section: {
    display: 'flex',
    gap: '4px',
  },
  divider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#d1d5db',
  },
  button: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#2563eb',
  },
};
