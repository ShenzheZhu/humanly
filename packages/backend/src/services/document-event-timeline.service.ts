import {
  DocumentEvent,
  DocumentEventTimelineItem,
  DocumentEventTimelineRawEvent,
  DocumentEventTimelineResponse,
  EventType,
} from '@humanly/shared';

const TYPING_BURST_GAP_MS = 1500;
const DELETE_BURST_GAP_MS = 1500;
const BOUNDARY_KEYS = new Set(['Enter', 'Tab', 'Escape']);
const TYPING_EVENT_TYPES = new Set<EventType>(['keydown', 'input']);
const FORMAT_EVENT_TYPES = new Set<EventType>([
  'font-family-change',
  'font-size-change',
  'text-color-change',
  'highlight-color-change',
  'bold',
  'italic',
  'underline',
  'strikethrough',
  'code',
  'subscript',
  'superscript',
  'heading-change',
  'list-create',
  'list-delete',
  'list-indent',
  'list-outdent',
  'list-item-check',
  'alignment-change',
]);

type TextDelta = {
  insertedText: string;
  deletedText: string;
};

type OpenGroup = {
  kind: 'typing_burst' | 'delete';
  first: DocumentEvent;
  last: DocumentEvent;
  text: string;
  cursorStart?: number;
  cursorEnd?: number;
  rawEvents: DocumentEventTimelineRawEvent[];
};

function timestampMs(value: Date | string): number {
  return new Date(value).getTime();
}

function sameSession(a?: string, b?: string): boolean {
  return (a || null) === (b || null);
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getTextDelta(event: DocumentEvent): TextDelta {
  if (typeof event.textBefore === 'string' && typeof event.textAfter === 'string') {
    const before = event.textBefore;
    const after = event.textAfter;
    let prefix = 0;

    while (
      prefix < before.length &&
      prefix < after.length &&
      before[prefix] === after[prefix]
    ) {
      prefix += 1;
    }

    let suffix = 0;
    while (
      suffix < before.length - prefix &&
      suffix < after.length - prefix &&
      before[before.length - 1 - suffix] === after[after.length - 1 - suffix]
    ) {
      suffix += 1;
    }

    return {
      insertedText: after.slice(prefix, after.length - suffix),
      deletedText: before.slice(prefix, before.length - suffix),
    };
  }

  if (event.keyChar && event.eventType !== 'delete') {
    return { insertedText: event.keyChar, deletedText: '' };
  }

  return { insertedText: '', deletedText: '' };
}

function isBoundaryEvent(event: DocumentEvent): boolean {
  return Boolean(
    BOUNDARY_KEYS.has(event.keyCode || '') ||
      BOUNDARY_KEYS.has(event.keyChar || '') ||
      event.eventType === 'blur' ||
      event.eventType === 'paste' ||
      event.eventType === 'delete' ||
      event.eventType === 'select' ||
      FORMAT_EVENT_TYPES.has(event.eventType)
  );
}

function isTypingInsertion(event: DocumentEvent, delta: TextDelta): boolean {
  if (!TYPING_EVENT_TYPES.has(event.eventType)) return false;
  if (isBoundaryEvent(event)) return false;
  return delta.insertedText.length > 0 && delta.deletedText.length === 0;
}

function isDeleteEvent(event: DocumentEvent, delta: TextDelta): boolean {
  return event.eventType === 'delete' || delta.deletedText.length > 0;
}

function makeRawEvent(event: DocumentEvent, delta: TextDelta): DocumentEventTimelineRawEvent {
  return {
    id: event.id,
    eventType: event.eventType,
    timestamp: event.timestamp,
    keyCode: event.keyCode,
    keyChar: event.keyChar,
    insertedText: delta.insertedText || undefined,
    deletedText: delta.deletedText || undefined,
    cursorPosition: event.cursorPosition,
    selectionStart: event.selectionStart,
    selectionEnd: event.selectionEnd,
    metadata: event.metadata,
  };
}

function eventLabel(event: DocumentEvent): string {
  const labels: Partial<Record<EventType, string>> = {
    focus: 'Editor focused',
    blur: 'Editor blurred',
    select: 'Text selected',
    copy: 'Copied text',
    cut: 'Cut text',
    paste: 'Pasted text',
    delete: 'Deleted text',
    keydown: event.keyCode === 'Enter' ? 'Line break' : 'Typed text',
    input: 'Typed text',
    bold: 'Bold formatting',
    italic: 'Italic formatting',
    underline: 'Underline formatting',
    'heading-change': 'Heading changed',
    'font-family-change': 'Font changed',
    'font-size-change': 'Font size changed',
    'text-color-change': 'Text color changed',
    'highlight-color-change': 'Highlight changed',
    'list-create': 'List created',
    'list-delete': 'List removed',
    'list-indent': 'List indented',
    'list-outdent': 'List outdented',
    'list-item-check': 'Checklist item changed',
    'alignment-change': 'Alignment changed',
    ai_selection_action: 'AI quick action',
    ai_insert_from_chat: 'AI inserted text',
    ai_panel_open: 'AI panel opened',
    ai_panel_close: 'AI panel closed',
    ai_query_sent: 'AI question sent',
    ai_response_received: 'AI response received',
  };

  return labels[event.eventType] || event.eventType.replace(/_/g, ' ');
}

function canExtendTyping(group: OpenGroup, event: DocumentEvent, insertedText: string): boolean {
  if (group.kind !== 'typing_burst') return false;
  if (!sameSession(group.last.sessionId, event.sessionId)) return false;
  if (timestampMs(event.timestamp) - timestampMs(group.last.timestamp) > TYPING_BURST_GAP_MS) return false;

  if (group.cursorEnd !== undefined && event.cursorPosition !== undefined) {
    return event.cursorPosition === group.cursorEnd + insertedText.length;
  }

  return true;
}

function canExtendDelete(group: OpenGroup, event: DocumentEvent): boolean {
  if (group.kind !== 'delete') return false;
  if (!sameSession(group.last.sessionId, event.sessionId)) return false;
  return timestampMs(event.timestamp) - timestampMs(group.last.timestamp) <= DELETE_BURST_GAP_MS;
}

function closeGroup(group: OpenGroup): DocumentEventTimelineItem {
  const isTyping = group.kind === 'typing_burst';

  return {
    id: `${group.kind}-${group.first.id}-${group.last.id}`,
    kind: group.kind,
    label: isTyping ? 'Typed text' : 'Deleted text',
    timestamp: group.last.timestamp,
    startTimestamp: group.first.timestamp,
    endTimestamp: group.last.timestamp,
    sessionId: group.first.sessionId,
    text: group.text,
    charCount: group.text.length,
    wordCount: isTyping ? countWords(group.text) : undefined,
    cursorStart: group.cursorStart,
    cursorEnd: group.cursorEnd,
    rawEventCount: group.rawEvents.length,
    rawEvents: group.rawEvents,
  };
}

function makeSingleItem(
  event: DocumentEvent,
  delta: TextDelta,
  kind: DocumentEventTimelineItem['kind'] = 'event'
): DocumentEventTimelineItem {
  const text = delta.insertedText || delta.deletedText || event.keyChar || event.keyCode || '';
  const charCount = delta.insertedText.length || delta.deletedText.length || undefined;

  return {
    id: `${kind}-${event.id}`,
    kind,
    label: kind === 'paste' ? 'Pasted text' : eventLabel(event),
    timestamp: event.timestamp,
    startTimestamp: event.timestamp,
    endTimestamp: event.timestamp,
    sessionId: event.sessionId,
    text,
    charCount,
    wordCount: kind === 'paste' ? countWords(delta.insertedText) : undefined,
    cursorStart: event.selectionStart,
    cursorEnd: event.cursorPosition,
    rawEventCount: 1,
    rawEvents: [makeRawEvent(event, delta)],
    metadata: event.metadata,
  };
}

function summarize(items: DocumentEventTimelineItem[], rawEventTotal: number) {
  return items.reduce(
    (summary, item) => {
      summary.timelineItemTotal += 1;

      if (item.kind === 'typing_burst') {
        summary.typingBursts += 1;
        summary.typedCharacters += item.charCount || 0;
        summary.typedWords += item.wordCount || 0;
      } else if (item.kind === 'paste') {
        summary.pasteCharacters += item.charCount || 0;
      } else if (item.kind === 'delete') {
        summary.deletedCharacters += item.charCount || 0;
      }

      return summary;
    },
    {
      rawEventTotal,
      timelineItemTotal: 0,
      typingBursts: 0,
      typedCharacters: 0,
      typedWords: 0,
      pasteCharacters: 0,
      deletedCharacters: 0,
    }
  );
}

export function buildDocumentEventTimeline(
  events: DocumentEvent[],
  rawEventTotal = events.length
): DocumentEventTimelineResponse {
  const chronologicalEvents = [...events].sort(
    (a, b) => timestampMs(a.timestamp) - timestampMs(b.timestamp)
  );

  const items: DocumentEventTimelineItem[] = [];
  let openGroup: OpenGroup | null = null;

  const flushGroup = () => {
    if (!openGroup) return;
    items.push(closeGroup(openGroup));
    openGroup = null;
  };

  for (const event of chronologicalEvents) {
    const delta = getTextDelta(event);
    const rawEvent = makeRawEvent(event, delta);

    if (isTypingInsertion(event, delta)) {
      if (openGroup && canExtendTyping(openGroup, event, delta.insertedText)) {
        openGroup.text += delta.insertedText;
        openGroup.last = event;
        openGroup.cursorEnd = event.cursorPosition ?? openGroup.cursorEnd;
        openGroup.rawEvents.push(rawEvent);
      } else {
        flushGroup();
        openGroup = {
          kind: 'typing_burst',
          first: event,
          last: event,
          text: delta.insertedText,
          cursorStart:
            event.cursorPosition !== undefined
              ? event.cursorPosition - delta.insertedText.length
              : event.selectionStart,
          cursorEnd: event.cursorPosition,
          rawEvents: [rawEvent],
        };
      }
      continue;
    }

    if (isDeleteEvent(event, delta)) {
      const deletedText = delta.deletedText || event.keyChar || '';

      if (openGroup && canExtendDelete(openGroup, event)) {
        openGroup.text = deletedText + openGroup.text;
        openGroup.last = event;
        openGroup.cursorEnd = event.cursorPosition ?? openGroup.cursorEnd;
        openGroup.rawEvents.push(rawEvent);
      } else {
        flushGroup();
        openGroup = {
          kind: 'delete',
          first: event,
          last: event,
          text: deletedText,
          cursorStart: event.selectionStart,
          cursorEnd: event.cursorPosition,
          rawEvents: [rawEvent],
        };
      }
      continue;
    }

    flushGroup();

    if (event.eventType === 'paste') {
      items.push(makeSingleItem(event, delta, 'paste'));
    } else {
      items.push(makeSingleItem(event, delta));
    }
  }

  flushGroup();

  return {
    items: items.sort((a, b) => timestampMs(b.timestamp) - timestampMs(a.timestamp)),
    summary: summarize(items, rawEventTotal),
  };
}
