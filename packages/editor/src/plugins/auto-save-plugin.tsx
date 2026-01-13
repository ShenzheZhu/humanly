import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';
import { AutoSaveConfig } from '../types';

/**
 * AutoSavePlugin automatically saves editor content at regular intervals
 */
export function AutoSavePlugin(config: AutoSaveConfig): null {
  const [editor] = useLexicalComposerContext();
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  useEffect(() => {
    if (!config.enabled) {
      return;
    }

    const interval = config.interval || 30000; // Default 30 seconds

    const save = () => {
      editor.getEditorState().read(() => {
        const root = $getRoot();
        const plainText = root.getTextContent();

        // Only save if content changed
        if (plainText === lastContentRef.current) {
          return;
        }

        lastContentRef.current = plainText;

        const content = editor.getEditorState().toJSON();
        config.onSave(content, plainText);
      });
    };

    // Register update listener to schedule auto-save
    const removeUpdateListener = editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves }) => {
        // Only schedule save if something changed
        if (dirtyElements.size > 0 || dirtyLeaves.size > 0) {
          // Clear existing timer
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
          }

          // Schedule new save
          saveTimerRef.current = setTimeout(save, interval);
        }
      }
    );

    return () => {
      removeUpdateListener();

      // Clear timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      // Final save on unmount
      save();
    };
  }, [editor, config.enabled, config.interval]);

  return null;
}
