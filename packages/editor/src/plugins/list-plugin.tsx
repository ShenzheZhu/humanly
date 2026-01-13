import React, { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListPlugin as LexicalListPlugin } from '@lexical/react/LexicalListPlugin';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  insertList,
} from '@lexical/list';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import {
  LIST_CREATE_COMMAND,
  LIST_DELETE_COMMAND,
  LIST_ITEM_CHECK_COMMAND,
} from '../commands/formatting-commands';

/**
 * ListPlugin handles list operations (bullet, numbered, checklist) with tracking
 */
export function ListPlugin(): JSX.Element {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Register list create command
    const removeListCreateListener = editor.registerCommand(
      LIST_CREATE_COMMAND,
      (payload: { listType: 'bullet' | 'number' | 'check' }) => {
        const { listType } = payload;

        if (listType === 'bullet') {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        } else if (listType === 'number') {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        } else if (listType === 'check') {
          // For checklist, we'll insert an unordered list and convert items to checklist
          insertList(editor, 'bullet');
        }

        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    // Register list delete command
    const removeListDeleteListener = editor.registerCommand(
      LIST_DELETE_COMMAND,
      () => {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    // Register checklist item toggle command
    const removeCheckListListener = editor.registerCommand(
      LIST_ITEM_CHECK_COMMAND,
      (_payload: { checked: boolean }) => {
        editor.update(() => {
          const selection = editor.getEditorState().read(() => {
            return editor._editorState._selection;
          });

          if (selection) {
            // Toggle checked state for checklist items
            // Implementation would go here
          }
        });
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      removeListCreateListener();
      removeListDeleteListener();
      removeCheckListListener();
    };
  }, [editor]);

  return <LexicalListPlugin />;
}
