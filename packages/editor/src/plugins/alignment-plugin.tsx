import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_LOW, FORMAT_ELEMENT_COMMAND, ElementFormatType } from 'lexical';
import { ALIGNMENT_CHANGE_COMMAND } from '../commands/formatting-commands';

export function AlignmentPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      ALIGNMENT_CHANGE_COMMAND,
      (payload: { alignment: 'left' | 'center' | 'right' | 'justify'; previousAlignment?: string }) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return false;

        editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, payload.alignment as ElementFormatType);
        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  return null;
}
