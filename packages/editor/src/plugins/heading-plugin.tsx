import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  COMMAND_PRIORITY_LOW,
} from 'lexical';
import {
  $createHeadingNode,
  $isHeadingNode,
  HeadingTagType,
} from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { HEADING_CHANGE_COMMAND } from '../commands/formatting-commands';

/**
 * HeadingPlugin handles heading operations and tracking
 */
export function HeadingPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      HEADING_CHANGE_COMMAND,
      (payload: { level: 1 | 2 | 3 | 4 | 5 | 6 | null; previousLevel?: 1 | 2 | 3 | 4 | 5 | 6 | null }) => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          return false;
        }

        const { level } = payload;

        if (level === null) {
          // Convert to paragraph
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          // Convert to heading
          $setBlocksType(selection, () => $createHeadingNode(`h${level}` as HeadingTagType));
        }

        return true;
      },
      COMMAND_PRIORITY_LOW
    );
  }, [editor]);

  return null;
}

/**
 * Get the current heading level from selection
 */
export function $getCurrentHeadingLevel(): 1 | 2 | 3 | 4 | 5 | 6 | null {
  const selection = $getSelection();

  if (!$isRangeSelection(selection)) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  const element =
    anchorNode.getKey() === 'root'
      ? anchorNode
      : anchorNode.getTopLevelElementOrThrow();

  if ($isHeadingNode(element)) {
    const tag = element.getTag();
    const level = parseInt(tag.replace('h', ''), 10) as 1 | 2 | 3 | 4 | 5 | 6;
    return level;
  }

  return null;
}
