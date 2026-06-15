import type { CSSProperties } from 'react';

export const toolbarColors = {
  border: '#d8d9cf',
  borderStrong: '#1a1c20',
  surface: '#ffffff',
  text: '#1a1c20',
} as const;

export const toolbarControlHeight = '34px';
export const toolbarIconButtonSize = '38px';

export const toolbarSectionStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

export const toolbarDividerStyle: CSSProperties = {
  width: '1px',
  height: '24px',
  backgroundColor: toolbarColors.border,
  flexShrink: 0,
};

export const toolbarButtonStyle: CSSProperties = {
  height: toolbarControlHeight,
  minWidth: toolbarIconButtonSize,
  padding: '0 10px',
  border: `1px solid ${toolbarColors.border}`,
  borderRadius: '4px',
  backgroundColor: toolbarColors.surface,
  color: toolbarColors.text,
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: 'inherit',
  lineHeight: 1,
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export const toolbarIconButtonStyle: CSSProperties = {
  ...toolbarButtonStyle,
  width: toolbarIconButtonSize,
  padding: 0,
};

export const toolbarActiveButtonStyle: CSSProperties = {
  backgroundColor: toolbarColors.borderStrong,
  color: toolbarColors.surface,
  borderColor: toolbarColors.borderStrong,
};

export const toolbarSelectStyle: CSSProperties = {
  height: toolbarControlHeight,
  padding: '0 28px 0 12px',
  border: `1px solid ${toolbarColors.border}`,
  borderRadius: '4px',
  backgroundColor: toolbarColors.surface,
  color: toolbarColors.text,
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: 'inherit',
  lineHeight: toolbarControlHeight,
  boxSizing: 'border-box',
  flexShrink: 0,
};
