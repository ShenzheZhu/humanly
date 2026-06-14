export interface CopiedTextEventMetadata {
  copiedText: string;
  copiedCharacterCount: number;
  copiedLineCount: number;
}

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
