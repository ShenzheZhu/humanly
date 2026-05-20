import { DocumentEvent } from '@humanly/shared';
import { buildDocumentEventTimeline } from '../../services/document-event-timeline.service';

function event(overrides: Partial<DocumentEvent>): DocumentEvent {
  return {
    id: overrides.id || `event-${Math.random()}`,
    documentId: 'doc-1',
    userId: 'user-1',
    eventType: 'keydown',
    timestamp: new Date('2026-05-20T12:00:00.000Z'),
    createdAt: new Date('2026-05-20T12:00:00.000Z'),
    ...overrides,
  };
}

function typingEvents(text: string, start = new Date('2026-05-20T12:00:00.000Z')) {
  let before = '';
  return Array.from(text).map((char, index) => {
    const after = before + char;
    const row = event({
      id: `type-${index}`,
      eventType: 'keydown',
      timestamp: new Date(start.getTime() + index * 100),
      keyChar: char,
      textBefore: before,
      textAfter: after,
      cursorPosition: after.length,
    });
    before = after;
    return row;
  });
}

describe('buildDocumentEventTimeline', () => {
  it('groups continuous typing into one typing burst with word count', () => {
    const timeline = buildDocumentEventTimeline(typingEvents('hello world'));

    expect(timeline.items).toHaveLength(1);
    expect(timeline.items[0]).toMatchObject({
      kind: 'typing_burst',
      text: 'hello world',
      charCount: 11,
      wordCount: 2,
      rawEventCount: 11,
    });
    expect(timeline.summary).toMatchObject({
      rawEventTotal: 11,
      timelineItemTotal: 1,
      typingBursts: 1,
      typedCharacters: 11,
      typedWords: 2,
    });
  });

  it('splits typing bursts after a long pause', () => {
    const events = [
      ...typingEvents('hello'),
      ...typingEvents('world', new Date('2026-05-20T12:00:03.000Z')).map((row, index) => ({
        ...row,
        id: `late-${index}`,
        textBefore: `hello${row.textBefore}`,
        textAfter: `hello${row.textAfter}`,
        cursorPosition: 5 + (row.cursorPosition || 0),
      })),
    ];

    const timeline = buildDocumentEventTimeline(events);

    expect(timeline.items).toHaveLength(2);
    expect(timeline.items.map((item) => item.text)).toEqual(['world', 'hello']);
    expect(timeline.summary.typingBursts).toBe(2);
  });

  it('separates paste from typed characters', () => {
    const timeline = buildDocumentEventTimeline([
      ...typingEvents('Hi'),
      event({
        id: 'paste-1',
        eventType: 'paste',
        timestamp: new Date('2026-05-20T12:00:01.000Z'),
        textBefore: 'Hi',
        textAfter: 'Hi pasted text',
        cursorPosition: 14,
      }),
    ]);

    expect(timeline.items.map((item) => item.kind)).toEqual(['paste', 'typing_burst']);
    expect(timeline.items[0]).toMatchObject({
      kind: 'paste',
      text: ' pasted text',
      charCount: 12,
    });
    expect(timeline.summary.typedCharacters).toBe(2);
    expect(timeline.summary.pasteCharacters).toBe(12);
  });

  it('groups consecutive deletes into one delete item', () => {
    const timeline = buildDocumentEventTimeline([
      event({
        id: 'delete-1',
        eventType: 'delete',
        timestamp: new Date('2026-05-20T12:00:00.000Z'),
        keyCode: 'Backspace',
        textBefore: 'abc',
        textAfter: 'ab',
        cursorPosition: 2,
      }),
      event({
        id: 'delete-2',
        eventType: 'delete',
        timestamp: new Date('2026-05-20T12:00:00.200Z'),
        keyCode: 'Backspace',
        textBefore: 'ab',
        textAfter: 'a',
        cursorPosition: 1,
      }),
    ]);

    expect(timeline.items).toHaveLength(1);
    expect(timeline.items[0]).toMatchObject({
      kind: 'delete',
      text: 'bc',
      charCount: 2,
      rawEventCount: 2,
    });
    expect(timeline.summary.deletedCharacters).toBe(2);
  });

  it('splits typing when cursor continuity breaks', () => {
    const timeline = buildDocumentEventTimeline([
      ...typingEvents('ab'),
      event({
        id: 'jump-1',
        eventType: 'keydown',
        timestamp: new Date('2026-05-20T12:00:00.300Z'),
        keyChar: 'x',
        textBefore: 'ab',
        textAfter: 'axb',
        cursorPosition: 2,
      }),
    ]);

    expect(timeline.items).toHaveLength(2);
    expect(timeline.items.map((item) => item.text)).toEqual(['x', 'ab']);
  });

  it('falls back to keyChar for legacy rows without text snapshots', () => {
    const timeline = buildDocumentEventTimeline([
      event({
        id: 'legacy-1',
        eventType: 'input',
        timestamp: new Date('2026-05-20T12:00:00.000Z'),
        keyChar: 'Q',
        cursorPosition: 1,
      }),
      event({
        id: 'legacy-2',
        eventType: 'input',
        timestamp: new Date('2026-05-20T12:00:00.100Z'),
        keyChar: 'A',
        cursorPosition: 2,
      }),
    ]);

    expect(timeline.items).toHaveLength(1);
    expect(timeline.items[0]).toMatchObject({
      kind: 'typing_burst',
      text: 'QA',
      charCount: 2,
    });
  });
});
