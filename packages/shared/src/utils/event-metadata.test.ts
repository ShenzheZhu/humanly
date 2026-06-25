import assert from 'node:assert/strict';
import {
  buildAIChatCopyEventMetadata,
  getAIChatCopyProvenance,
  hashEventText,
  parseAIChatCopyProvenance,
  serializeAIChatCopyProvenance,
} from './event-metadata';

const copiedText = 'Based on the file, **Bombardier** is a business jet manufacturer.';

const metadata = buildAIChatCopyEventMetadata({
  copiedText,
  messageId: 'message-1',
  logId: 'log-1',
  sourceRole: 'assistant',
  renderMode: 'markdown',
  copyId: 'copy-1',
  copiedAt: '2026-06-25T12:00:00.000Z',
});

assert.equal(metadata.source, 'humanly_ai_chat');
assert.equal(metadata.copyId, 'copy-1');
assert.equal(metadata.messageId, 'message-1');
assert.equal(metadata.logId, 'log-1');
assert.equal(metadata.sourceRole, 'assistant');
assert.equal(metadata.renderMode, 'markdown');
assert.equal(metadata.copiedText, copiedText);
assert.equal(metadata.copiedTextLength, copiedText.length);
assert.equal(metadata.copiedCharacterCount, copiedText.length);
assert.equal(metadata.copiedLineCount, 1);
assert.equal(metadata.copiedTextHash, hashEventText(copiedText));

const serialized = serializeAIChatCopyProvenance(metadata);
assert.equal(serialized.includes(copiedText), false);

const parsed = parseAIChatCopyProvenance(serialized);
assert.deepEqual(parsed, getAIChatCopyProvenance(metadata as unknown as Record<string, unknown>));

assert.equal(parseAIChatCopyProvenance('not json'), null);
assert.equal(getAIChatCopyProvenance({ source: 'external_clipboard' }), null);
