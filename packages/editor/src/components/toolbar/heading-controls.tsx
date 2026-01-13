import React, { useState, useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, SELECTION_CHANGE_COMMAND } from 'lexical';
import { $isHeadingNode } from '@lexical/rich-text';
import { mergeRegister } from '@lexical/utils';
import { HEADING_CHANGE_COMMAND } from '../../commands/formatting-commands';
import { $getCurrentHeadingLevel } from '../../plugins/heading-plugin';

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

const BLOCK_TYPE_OPTIONS = [
  { value: 'paragraph', label: 'Normal' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' },
  { value: 'h4', label: 'Heading 4' },
  { value: 'h5', label: 'Heading 5' },
  { value: 'h6', label: 'Heading 6' },
];

/**
 * HeadingControls component for the toolbar
 */
export function HeadingControls(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [blockType, setBlockType] = useState<BlockType>('paragraph');

  const updateBlockType = useCallback(() => {
    const selection = $getSelection();

    if (!$isRangeSelection(selection)) {
      return;
    }

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

    if ($isHeadingNode(element)) {
      const tag = element.getTag();
      setBlockType(tag as BlockType);
    } else {
      setBlockType('paragraph');
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateBlockType();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateBlockType();
          return false;
        },
        1
      )
    );
  }, [editor, updateBlockType]);

  const handleBlockTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newBlockType = event.target.value as BlockType;

    editor.update(() => {
      const currentLevel = $getCurrentHeadingLevel();
      const newLevel = newBlockType === 'paragraph' ? null : parseInt(newBlockType.replace('h', ''), 10) as 1 | 2 | 3 | 4 | 5 | 6;

      editor.dispatchCommand(HEADING_CHANGE_COMMAND, {
        level: newLevel,
        previousLevel: currentLevel,
      });
    });
  };

  return (
    <select
      value={blockType}
      onChange={handleBlockTypeChange}
      style={styles.select}
      aria-label="Formatting options for text style"
    >
      {BLOCK_TYPE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

const styles = {
  select: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'inherit',
    minWidth: '120px',
  },
};
