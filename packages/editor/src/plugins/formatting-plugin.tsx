import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { COMMAND_PRIORITY_LOW } from 'lexical';
import {
  FONT_FAMILY_CHANGE_COMMAND,
  FONT_SIZE_CHANGE_COMMAND,
  TEXT_COLOR_CHANGE_COMMAND,
  HIGHLIGHT_COLOR_CHANGE_COMMAND,
} from '../commands/formatting-commands';
import {
  applyFontFamily,
  applyFontSize,
  applyTextColor,
  applyHighlightColor,
} from '../utils/text-formatting';

/**
 * FormattingPlugin handles advanced text formatting (font, size, color)
 */
export function FormattingPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Register font family command
    const removeFontFamilyListener = editor.registerCommand(
      FONT_FAMILY_CHANGE_COMMAND,
      (payload: { fontFamily: string }) => {
        editor.update(() => {
          applyFontFamily(payload.fontFamily);
        });
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    // Register font size command
    const removeFontSizeListener = editor.registerCommand(
      FONT_SIZE_CHANGE_COMMAND,
      (payload: { fontSize: string }) => {
        editor.update(() => {
          applyFontSize(payload.fontSize);
        });
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    // Register text color command
    const removeTextColorListener = editor.registerCommand(
      TEXT_COLOR_CHANGE_COMMAND,
      (payload: { color: string }) => {
        editor.update(() => {
          applyTextColor(payload.color);
        });
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    // Register highlight color command
    const removeHighlightColorListener = editor.registerCommand(
      HIGHLIGHT_COLOR_CHANGE_COMMAND,
      (payload: { color: string }) => {
        editor.update(() => {
          applyHighlightColor(payload.color);
        });
        return true;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      removeFontFamilyListener();
      removeFontSizeListener();
      removeTextColorListener();
      removeHighlightColorListener();
    };
  }, [editor]);

  return null;
}
