import { $getSelection, $isRangeSelection, TextNode } from 'lexical';

/**
 * Utility functions for text formatting
 */

/**
 * Apply font family to selected text
 */
export function applyFontFamily(fontFamily: string): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const nodes = selection.getNodes();
  nodes.forEach((node) => {
    if (node instanceof TextNode) {
      const style = node.getStyle();
      const newStyle = style
        ? style.replace(/font-family:[^;]+;?/g, '') + `font-family:${fontFamily};`
        : `font-family:${fontFamily};`;
      node.setStyle(newStyle.trim());
    }
  });
}

/**
 * Apply font size to selected text
 */
export function applyFontSize(fontSize: string): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const nodes = selection.getNodes();
  nodes.forEach((node) => {
    if (node instanceof TextNode) {
      const style = node.getStyle();
      const newStyle = style
        ? style.replace(/font-size:[^;]+;?/g, '') + `font-size:${fontSize};`
        : `font-size:${fontSize};`;
      node.setStyle(newStyle.trim());
    }
  });
}

/**
 * Apply text color to selected text
 */
export function applyTextColor(color: string): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const nodes = selection.getNodes();
  nodes.forEach((node) => {
    if (node instanceof TextNode) {
      const style = node.getStyle();
      const newStyle = style
        ? style.replace(/color:[^;]+;?/g, '') + `color:${color};`
        : `color:${color};`;
      node.setStyle(newStyle.trim());
    }
  });
}

/**
 * Apply highlight color (background) to selected text
 */
export function applyHighlightColor(color: string): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const nodes = selection.getNodes();
  nodes.forEach((node) => {
    if (node instanceof TextNode) {
      const style = node.getStyle();
      const newStyle = style
        ? style.replace(/background-color:[^;]+;?/g, '') + `background-color:${color};`
        : `background-color:${color};`;
      node.setStyle(newStyle.trim());
    }
  });
}

/**
 * Get current font family from selection
 */
export function getCurrentFontFamily(): string | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const nodes = selection.getNodes();
  if (nodes.length === 0) return null;

  const firstNode = nodes[0];
  if (!(firstNode instanceof TextNode)) return null;

  const style = firstNode.getStyle();
  const match = style.match(/font-family:([^;]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Get current font size from selection
 */
export function getCurrentFontSize(): string | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const nodes = selection.getNodes();
  if (nodes.length === 0) return null;

  const firstNode = nodes[0];
  if (!(firstNode instanceof TextNode)) return null;

  const style = firstNode.getStyle();
  const match = style.match(/font-size:([^;]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Get current text color from selection
 */
export function getCurrentTextColor(): string | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const nodes = selection.getNodes();
  if (nodes.length === 0) return null;

  const firstNode = nodes[0];
  if (!(firstNode instanceof TextNode)) return null;

  const style = firstNode.getStyle();
  const match = style.match(/color:([^;]+)/);
  return match ? match[1].trim() : null;
}

/**
 * Get current highlight color from selection
 */
export function getCurrentHighlightColor(): string | null {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return null;

  const nodes = selection.getNodes();
  if (nodes.length === 0) return null;

  const firstNode = nodes[0];
  if (!(firstNode instanceof TextNode)) return null;

  const style = firstNode.getStyle();
  const match = style.match(/background-color:([^;]+)/);
  return match ? match[1].trim() : null;
}
