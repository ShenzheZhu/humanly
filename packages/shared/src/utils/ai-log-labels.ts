import type { AIInteractionLog, AIQueryType } from '../types/ai.types';

const AI_ACTION_LABELS: Record<string, string> = {
  grammar: 'Fix grammar',
  improve: 'Improve writing',
  simplify: 'Simplify',
  formal: 'Make formal',
  grammar_check: 'Fix grammar',
  spelling_check: 'Fix spelling',
  rewrite: 'Rewrite',
  summarize: 'Summarize',
  expand: 'Expand',
  translate: 'Translate',
  format: 'Format',
  question: 'Chat',
  reference: 'Chat',
  other: 'Chat',
};

const LEGACY_CHAT_QUERY_TYPES = new Set<AIQueryType>([
  'question',
  'reference',
  'other',
]);

type AILabelLog = Pick<AIInteractionLog, 'queryType' | 'query' | 'contextSnapshot'>;

function humanizeCode(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, char => char.toUpperCase());
}

export function getAIActionLabel(actionType: string) {
  return AI_ACTION_LABELS[actionType] || humanizeCode(actionType);
}

export function isChatAIInteractionLog(log: Pick<AIInteractionLog, 'queryType' | 'contextSnapshot'>) {
  if (log.contextSnapshot?.interactionOrigin === 'chat') return true;
  return LEGACY_CHAT_QUERY_TYPES.has(log.queryType);
}

export function getAIInteractionLogLabel(log: AILabelLog) {
  if (log.contextSnapshot?.interactionOrigin === 'chat') return 'Chat';
  if (log.queryType === 'grammar_check') return 'Fix grammar';
  if (log.query.toLowerCase().includes('simplify')) return 'Simplify';
  if (log.query.toLowerCase().includes('formal')) return 'Make formal';
  if (log.query.toLowerCase().includes('improve')) return 'Improve writing';
  return AI_ACTION_LABELS[log.queryType] || log.queryType;
}
