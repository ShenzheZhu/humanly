/**
 * Color palette for text and highlight colors
 */
export const TEXT_COLORS = [
  { value: '#000000', label: 'Black' },
  { value: '#434343', label: 'Dark gray 4' },
  { value: '#666666', label: 'Dark gray 3' },
  { value: '#999999', label: 'Dark gray 2' },
  { value: '#b7b7b7', label: 'Dark gray 1' },
  { value: '#cccccc', label: 'Gray' },
  { value: '#d9d9d9', label: 'Light gray 1' },
  { value: '#efefef', label: 'Light gray 2' },
  { value: '#f3f3f3', label: 'Light gray 3' },
  { value: '#ffffff', label: 'White' },
  { value: '#980000', label: 'Red berry' },
  { value: '#ff0000', label: 'Red' },
  { value: '#ff9900', label: 'Orange' },
  { value: '#ffff00', label: 'Yellow' },
  { value: '#00ff00', label: 'Green' },
  { value: '#00ffff', label: 'Cyan' },
  { value: '#4a86e8', label: 'Cornflower blue' },
  { value: '#0000ff', label: 'Blue' },
  { value: '#9900ff', label: 'Purple' },
  { value: '#ff00ff', label: 'Magenta' },
] as const;

export const HIGHLIGHT_COLORS = [
  { value: 'transparent', label: 'None' },
  { value: '#ffff00', label: 'Yellow' },
  { value: '#00ff00', label: 'Green' },
  { value: '#00ffff', label: 'Cyan' },
  { value: '#ff00ff', label: 'Magenta' },
  { value: '#ffc0cb', label: 'Pink' },
  { value: '#ffa500', label: 'Orange' },
  { value: '#add8e6', label: 'Light blue' },
  { value: '#90ee90', label: 'Light green' },
  { value: '#d3d3d3', label: 'Light gray' },
] as const;

export const DEFAULT_TEXT_COLOR = '#000000';
export const DEFAULT_HIGHLIGHT_COLOR = 'transparent';
