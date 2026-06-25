import assert from 'node:assert/strict';
import { buildAIChatCopyEventMetadata, type DocumentEvent } from '@humanly/shared';
import { getTextCompositionSourceInfo } from '../models/document-event.model';
import { buildDocumentEventTimeline } from './document-event-timeline.service';

const aiCopyMetadata = buildAIChatCopyEventMetadata({
  copiedText: 'AI says **hello**',
  messageId: 'message-1',
  logId: 'log-1',
  sourceRole: 'assistant',
  renderMode: 'markdown',
  copyId: 'copy-1',
  copiedAt: '2026-06-25T12:00:00.000Z',
});

const aiPasteEvent: DocumentEvent = {
  id: '1',
  documentId: 'document-1',
  userId: 'user-1',
  sessionId: 'session-1',
  eventType: 'ai_response_paste',
  timestamp: '2026-06-25T12:01:00.000Z',
  textBefore: 'Before: ',
  textAfter: 'Before: AI says **hello**',
  cursorPosition: 24,
  selectionStart: 8,
  selectionEnd: 8,
  metadata: aiCopyMetadata,
  createdAt: new Date('2026-06-25T12:01:00.000Z'),
};

const timeline = buildDocumentEventTimeline([aiPasteEvent], 1);
assert.equal(timeline.items.length, 1);
assert.equal(timeline.items[0].kind, 'ai_paste');
assert.equal(timeline.items[0].label, 'AI response paste');
assert.equal(timeline.items[0].text, 'AI says **hello**');
assert.equal(timeline.items[0].metadata?.copyId, 'copy-1');
assert.equal(timeline.summary.pasteCharacters, 0);

const sourceInfo = getTextCompositionSourceInfo('ai_response_paste', aiCopyMetadata);
assert.equal(sourceInfo.source, 'ai_assisted');
assert.equal(sourceInfo.aiType, 'chatPaste');

const regularPasteSourceInfo = getTextCompositionSourceInfo('paste');
assert.equal(regularPasteSourceInfo.source, 'pasted');

const aiPasteReplacementEvent: DocumentEvent = {
  id: '2',
  documentId: 'document-1',
  userId: 'user-1',
  sessionId: 'session-1',
  eventType: 'ai_response_paste',
  timestamp: '2026-06-25T12:02:00.000Z',
  textBefore: 'Before: selected draft',
  textAfter: 'Before: AI says **hello**',
  cursorPosition: 24,
  selectionStart: 8,
  selectionEnd: 22,
  metadata: aiCopyMetadata,
  createdAt: new Date('2026-06-25T12:02:00.000Z'),
};

const replacementTimeline = buildDocumentEventTimeline([aiPasteReplacementEvent], 1);
const aiPasteReplacementItem = replacementTimeline.items[0];
assert.equal(aiPasteReplacementItem.kind, 'ai_paste');
assert.equal(aiPasteReplacementItem.label, 'AI response paste');
assert.equal(aiPasteReplacementItem.text, 'AI says **hello**');
assert.equal(aiPasteReplacementItem.metadata?.operation, 'replace');
assert.equal(aiPasteReplacementItem.metadata?.replacedSelection, true);
assert.equal(aiPasteReplacementItem.metadata?.replacedText, 'selected draft');
assert.equal(aiPasteReplacementItem.metadata?.replacedTextLength, 'selected draft'.length);
assert.equal(replacementTimeline.summary.pasteCharacters, 0);
