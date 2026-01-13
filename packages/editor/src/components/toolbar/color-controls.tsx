import React, { useState, useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SELECTION_CHANGE_COMMAND } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import { Type, Highlighter } from 'lucide-react';
import {
  TEXT_COLOR_CHANGE_COMMAND,
  HIGHLIGHT_COLOR_CHANGE_COMMAND,
} from '../../commands/formatting-commands';
import {
  getCurrentTextColor,
  getCurrentHighlightColor,
} from '../../utils/text-formatting';
import { TEXT_COLORS, HIGHLIGHT_COLORS, DEFAULT_TEXT_COLOR, DEFAULT_HIGHLIGHT_COLOR } from '../../constants/colors';
import { ColorPicker } from '../color-picker';

/**
 * ColorControls component for text and highlight color selection
 */
export function ColorControls(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [textColor, setTextColor] = useState<string>(DEFAULT_TEXT_COLOR);
  const [highlightColor, setHighlightColor] = useState<string>(DEFAULT_HIGHLIGHT_COLOR);

  const updateColors = useCallback(() => {
    editor.getEditorState().read(() => {
      const currentText = getCurrentTextColor();
      const currentHighlight = getCurrentHighlightColor();

      setTextColor(currentText || DEFAULT_TEXT_COLOR);
      setHighlightColor(currentHighlight || DEFAULT_HIGHLIGHT_COLOR);
    });
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateColors();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateColors();
          return false;
        },
        1
      )
    );
  }, [editor, updateColors]);

  const handleTextColorChange = (color: string) => {
    setTextColor(color);
    editor.update(() => {
      editor.dispatchCommand(TEXT_COLOR_CHANGE_COMMAND, { color });
    });
  };

  const handleHighlightColorChange = (color: string) => {
    setHighlightColor(color);
    editor.update(() => {
      editor.dispatchCommand(HIGHLIGHT_COLOR_CHANGE_COMMAND, { color });
    });
  };

  return (
    <div style={styles.container}>
      <ColorPicker
        currentColor={textColor}
        colors={TEXT_COLORS}
        onColorChange={handleTextColorChange}
        buttonLabel={<Type size={16} />}
        buttonTitle="Text color"
      />

      <ColorPicker
        currentColor={highlightColor}
        colors={HIGHLIGHT_COLORS}
        onColorChange={handleHighlightColorChange}
        buttonLabel={<Highlighter size={16} />}
        buttonTitle="Highlight color"
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '4px',
  },
};
