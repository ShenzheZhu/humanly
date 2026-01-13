import React, { useState, useEffect, useCallback } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { SELECTION_CHANGE_COMMAND } from 'lexical';
import { mergeRegister } from '@lexical/utils';
import {
  FONT_FAMILY_CHANGE_COMMAND,
  FONT_SIZE_CHANGE_COMMAND,
} from '../../commands/formatting-commands';
import {
  getCurrentFontFamily,
  getCurrentFontSize,
} from '../../utils/text-formatting';
import { FONT_FAMILIES, DEFAULT_FONT_FAMILY } from '../../constants/fonts';
import { FONT_SIZES, DEFAULT_FONT_SIZE } from '../../constants/font-sizes';

/**
 * FontControls component for font family and size selection
 */
export function FontControls(): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const [fontFamily, setFontFamily] = useState<string>(DEFAULT_FONT_FAMILY);
  const [fontSize, setFontSize] = useState<string>(DEFAULT_FONT_SIZE);

  const updateFontInfo = useCallback(() => {
    editor.getEditorState().read(() => {
      const currentFamily = getCurrentFontFamily();
      const currentSize = getCurrentFontSize();

      if (currentFamily) {
        setFontFamily(currentFamily);
      } else {
        setFontFamily(DEFAULT_FONT_FAMILY);
      }

      if (currentSize) {
        setFontSize(currentSize);
      } else {
        setFontSize(DEFAULT_FONT_SIZE);
      }
    });
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateFontInfo();
        });
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateFontInfo();
          return false;
        },
        1
      )
    );
  }, [editor, updateFontInfo]);

  const handleFontFamilyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newFontFamily = event.target.value;
    setFontFamily(newFontFamily);

    editor.update(() => {
      editor.dispatchCommand(FONT_FAMILY_CHANGE_COMMAND, {
        fontFamily: newFontFamily,
      });
    });
  };

  const handleFontSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newFontSize = event.target.value;
    setFontSize(newFontSize);

    editor.update(() => {
      editor.dispatchCommand(FONT_SIZE_CHANGE_COMMAND, {
        fontSize: newFontSize,
      });
    });
  };

  return (
    <div style={styles.container}>
      <select
        value={fontFamily}
        onChange={handleFontFamilyChange}
        style={styles.select}
        aria-label="Font family"
        title="Font family"
      >
        {FONT_FAMILIES.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>

      <select
        value={fontSize}
        onChange={handleFontSizeChange}
        style={{ ...styles.select, minWidth: '70px' }}
        aria-label="Font size"
        title="Font size"
      >
        {FONT_SIZES.map((size) => (
          <option key={size.value} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    gap: '4px',
  },
  select: {
    padding: '6px 8px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: 'inherit',
    minWidth: '140px',
  },
};
