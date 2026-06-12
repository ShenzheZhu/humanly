let mockText = 'Draft text';
let mockSelection: any = {
  anchor: { offset: 5 },
  focus: { offset: 5 },
  getTextContent: () => '',
};

jest.mock('lexical', () => ({
  createCommand: (name?: string) => ({ name }),
  $getRoot: () => ({
    getTextContent: () => mockText,
  }),
  $getSelection: () => mockSelection,
  $isRangeSelection: (selection: any) => Boolean(selection),
  COMMAND_PRIORITY_HIGH: 2,
  COMMAND_PRIORITY_LOW: 1,
  KEY_DOWN_COMMAND: { name: 'KEY_DOWN_COMMAND' },
  PASTE_COMMAND: { name: 'PASTE_COMMAND' },
  COPY_COMMAND: { name: 'COPY_COMMAND' },
  CUT_COMMAND: { name: 'CUT_COMMAND' },
  SELECTION_CHANGE_COMMAND: { name: 'SELECTION_CHANGE_COMMAND' },
  FOCUS_COMMAND: { name: 'FOCUS_COMMAND' },
  BLUR_COMMAND: { name: 'BLUR_COMMAND' },
  INDENT_CONTENT_COMMAND: { name: 'INDENT_CONTENT_COMMAND' },
  OUTDENT_CONTENT_COMMAND: { name: 'OUTDENT_CONTENT_COMMAND' },
  FORMAT_TEXT_COMMAND: { name: 'FORMAT_TEXT_COMMAND' },
}));

import { EditorTracker } from '../../../../editor/src/tracking/editor-tracker';
import type { TrackedEvent } from '../../../../editor/src/types';

function setVisibilityState(visibilityState: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: visibilityState,
  });
}

function makeEditor() {
  const editorState = {
    read: (callback: () => unknown) => callback(),
    toJSON: () => ({ root: { children: [{ text: mockText }] } }),
  };

  return {
    registerCommand: jest.fn(() => jest.fn()),
    registerUpdateListener: jest.fn(() => jest.fn()),
    getEditorState: jest.fn(() => editorState),
  };
}

describe('EditorTracker page visibility tracking', () => {
  afterEach(() => {
    jest.useRealTimers();
    mockText = 'Draft text';
    mockSelection = {
      anchor: { offset: 5 },
      focus: { offset: 5 },
      getTextContent: () => '',
    };
    setVisibilityState('visible');
  });

  it('records hidden and visible events with duration metadata', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-14T12:00:02.000Z'));
    setVisibilityState('visible');

    const batches: TrackedEvent[][] = [];
    const tracker = new EditorTracker(makeEditor() as any, {
      documentId: 'doc-1',
      enabled: true,
      onEventsBuffer: async (events) => {
        batches.push(events);
      },
    });

    tracker.start();

    setVisibilityState('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await tracker.flushPendingEvents();

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
    expect(batches[0][0]).toMatchObject({
      eventType: 'page_hidden',
      textBefore: 'Draft text',
      textAfter: 'Draft text',
      cursorPosition: 5,
      selectionStart: 5,
      selectionEnd: 5,
      metadata: { visibilityState: 'hidden' },
    });

    jest.setSystemTime(new Date('2026-05-14T12:01:57.000Z'));
    setVisibilityState('visible');
    document.dispatchEvent(new Event('visibilitychange'));

    expect(tracker.getBufferSize()).toBe(1);
    await tracker.flushPendingEvents();

    expect(batches).toHaveLength(2);
    expect(batches[1][0]).toMatchObject({
      eventType: 'page_visible',
      metadata: { visibilityState: 'visible', hiddenDurationMs: 115000 },
    });

    tracker.stop();
  });
});
