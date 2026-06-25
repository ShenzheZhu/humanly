export interface CopiedTextEventMetadata {
  copiedText: string;
  copiedCharacterCount: number;
  copiedLineCount: number;
}

export const HUMANLY_AI_CHAT_COPY_MIME = 'application/x-humanly-ai-chat-copy+json';

export type AIChatCopySourceRole = 'user' | 'assistant';
export type AIChatCopyRenderMode = 'plain' | 'markdown';

export interface AIChatCopyProvenance {
  source: 'humanly_ai_chat';
  copyId: string;
  messageId: string;
  logId?: string;
  sourceRole: AIChatCopySourceRole;
  renderMode: AIChatCopyRenderMode;
  copiedTextHash: string;
  copiedTextLength: number;
  copiedLineCount: number;
  copiedAt: string;
}

export type AIChatCopyEventMetadata = CopiedTextEventMetadata & AIChatCopyProvenance;

export function countEventTextLines(text: string): number {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
}

export function buildCopiedTextEventMetadata(
  copiedText?: string | null
): CopiedTextEventMetadata | undefined {
  if (!copiedText) return undefined;

  return {
    copiedText,
    copiedCharacterCount: copiedText.length,
    copiedLineCount: countEventTextLines(copiedText),
  };
}

export function getCopiedTextFromEventMetadata(
  metadata?: Record<string, unknown> | null
): string {
  const copiedText = metadata?.copiedText;
  return typeof copiedText === 'string' ? copiedText : '';
}

export function hashEventText(text: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function createCopyId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (typeof randomUUID === 'function') {
    return randomUUID.call(globalThis.crypto);
  }

  return `ai-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildAIChatCopyEventMetadata(input: {
  copiedText: string;
  messageId: string;
  logId?: string;
  sourceRole: AIChatCopySourceRole;
  renderMode: AIChatCopyRenderMode;
  copyId?: string;
  copiedAt?: string;
}): AIChatCopyEventMetadata {
  const copiedAt = input.copiedAt || new Date().toISOString();
  const copiedLineCount = countEventTextLines(input.copiedText);

  return {
    copiedText: input.copiedText,
    copiedCharacterCount: input.copiedText.length,
    copiedLineCount,
    source: 'humanly_ai_chat',
    copyId: input.copyId || createCopyId(),
    messageId: input.messageId,
    ...(input.logId ? { logId: input.logId } : {}),
    sourceRole: input.sourceRole,
    renderMode: input.renderMode,
    copiedTextHash: hashEventText(input.copiedText),
    copiedTextLength: input.copiedText.length,
    copiedAt,
  };
}

export function getAIChatCopyProvenance(
  metadata?: Record<string, unknown> | null
): AIChatCopyProvenance | null {
  if (!metadata || metadata.source !== 'humanly_ai_chat') return null;

  const copyId = metadata.copyId;
  const messageId = metadata.messageId;
  const sourceRole = metadata.sourceRole;
  const renderMode = metadata.renderMode;
  const copiedTextHash = metadata.copiedTextHash;
  const copiedTextLength = metadata.copiedTextLength;
  const copiedLineCount = metadata.copiedLineCount;
  const copiedAt = metadata.copiedAt;
  const logId = metadata.logId;

  if (
    typeof copyId !== 'string' ||
    typeof messageId !== 'string' ||
    (sourceRole !== 'user' && sourceRole !== 'assistant') ||
    (renderMode !== 'plain' && renderMode !== 'markdown') ||
    typeof copiedTextHash !== 'string' ||
    typeof copiedTextLength !== 'number' ||
    typeof copiedLineCount !== 'number' ||
    typeof copiedAt !== 'string'
  ) {
    return null;
  }

  return {
    source: 'humanly_ai_chat',
    copyId,
    messageId,
    ...(typeof logId === 'string' ? { logId } : {}),
    sourceRole,
    renderMode,
    copiedTextHash,
    copiedTextLength,
    copiedLineCount,
    copiedAt,
  };
}

export function serializeAIChatCopyProvenance(metadata: AIChatCopyProvenance): string {
  return JSON.stringify({
    source: 'humanly_ai_chat',
    copyId: metadata.copyId,
    messageId: metadata.messageId,
    ...(metadata.logId ? { logId: metadata.logId } : {}),
    sourceRole: metadata.sourceRole,
    renderMode: metadata.renderMode,
    copiedTextHash: metadata.copiedTextHash,
    copiedTextLength: metadata.copiedTextLength,
    copiedLineCount: metadata.copiedLineCount,
    copiedAt: metadata.copiedAt,
  });
}

export function parseAIChatCopyProvenance(value?: string | null): AIChatCopyProvenance | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value);
    return getAIChatCopyProvenance(parsed);
  } catch {
    return null;
  }
}
