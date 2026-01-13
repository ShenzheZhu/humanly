import { EventType } from '@humory/shared';

/**
 * Configuration for the editor tracker
 */
export interface EditorTrackerConfig {
  documentId: string;
  userId?: string;
  onEvent?: (event: TrackedEvent) => void;
  onEventsBuffer?: (events: TrackedEvent[]) => void;
  batchSize?: number;
  flushInterval?: number;
  enabled?: boolean;
}

/**
 * Metadata for formatting events
 */
export interface EventMetadata {
  // Font changes
  fontFamily?: string;
  fontSize?: string;
  textColor?: string;
  highlightColor?: string;
  // Heading changes
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  previousHeadingLevel?: 1 | 2 | 3 | 4 | 5 | 6 | null;
  // List changes
  listType?: 'bullet' | 'number' | 'check';
  listNestLevel?: number;
  listItemChecked?: boolean;
  // Alignment
  alignment?: 'left' | 'center' | 'right' | 'justify';
  previousAlignment?: string;
  // Find/Replace
  searchQuery?: string;
  replaceText?: string;
  matchCount?: number;
  replaceCount?: number;
  // Line spacing & indentation
  lineSpacing?: number;
  indentLevel?: number;
  // Extensible for other metadata
  [key: string]: any;
}

/**
 * Tracked event from the editor
 */
export interface TrackedEvent {
  eventType: EventType;
  timestamp: Date;
  keyCode?: string;
  keyChar?: string;
  textBefore?: string;
  textAfter?: string;
  cursorPosition?: number;
  selectionStart?: number;
  selectionEnd?: number;
  editorStateBefore?: Record<string, any>;
  editorStateAfter?: Record<string, any>;
  metadata?: EventMetadata;
}

/**
 * Props for the Lexical editor component
 */
export interface LexicalEditorProps {
  documentId: string;
  userId?: string;
  initialContent?: string | Record<string, any>;
  placeholder?: string;
  editable?: boolean;
  trackingEnabled?: boolean;
  autoSaveEnabled?: boolean;
  autoSaveInterval?: number;
  onContentChange?: (content: Record<string, any>, plainText: string) => void;
  onEventTracked?: (event: TrackedEvent) => void;
  onEventsBuffer?: (events: TrackedEvent[]) => void;
  onAutoSave?: (content: Record<string, any>, plainText: string) => void;
  className?: string;
}

/**
 * Editor theme configuration
 */
export interface EditorTheme {
  paragraph?: string;
  text?: {
    bold?: string;
    italic?: string;
    underline?: string;
    strikethrough?: string;
    code?: string;
  };
  heading?: {
    h1?: string;
    h2?: string;
    h3?: string;
    h4?: string;
    h5?: string;
    h6?: string;
  };
  list?: {
    ul?: string;
    ol?: string;
    listitem?: string;
    nested?: {
      listitem?: string;
    };
  };
  quote?: string;
  code?: string;
}

/**
 * Toolbar configuration
 */
export interface ToolbarConfig {
  showBold?: boolean;
  showItalic?: boolean;
  showUnderline?: boolean;
  showStrikethrough?: boolean;
  showCode?: boolean;
  showClear?: boolean;
}

/**
 * Auto-save plugin configuration
 */
export interface AutoSaveConfig {
  interval?: number;
  onSave: (content: Record<string, any>, plainText: string) => void;
  enabled?: boolean;
}
