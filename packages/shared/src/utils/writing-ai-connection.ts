export const WRITING_AI_EXISTING_KEY_SENTINEL = '__use_existing__';

export type WritingAiConnectionTestValidationField = 'apiKey' | 'baseUrl' | 'model';

export interface WritingAiConnectionTestInput {
  apiKey?: string | null;
  hasExistingKey?: boolean;
  baseUrl?: string | null;
  defaultBaseUrl?: string | null;
  model?: string | null;
}

export interface WritingAiConnectionTestValidationError {
  field: WritingAiConnectionTestValidationField;
  title: string;
  message: string;
}

export interface WritingAiConnectionTestRequest {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface WritingAiConnectionTestResponse {
  success?: boolean;
  message?: string;
  models?: unknown;
}

export interface WritingAiConnectionTestResult {
  success: boolean;
  message: string;
}

const normalizeText = (value?: string | null): string => (
  typeof value === 'string' ? value.trim() : ''
);

export const getWritingAiConnectionBaseUrl = (
  input: Pick<WritingAiConnectionTestInput, 'baseUrl' | 'defaultBaseUrl'>
): string => (
  normalizeText(input.baseUrl) || normalizeText(input.defaultBaseUrl)
);

export const getWritingAiConnectionTestValidationError = (
  input: WritingAiConnectionTestInput
): WritingAiConnectionTestValidationError | null => {
  if (!normalizeText(input.apiKey) && !input.hasExistingKey) {
    return {
      field: 'apiKey',
      title: 'AI key required',
      message: 'Enter an AI API key before testing the connection.',
    };
  }

  if (!normalizeText(input.model)) {
    return {
      field: 'model',
      title: 'AI model required',
      message: 'Select or enter the AI model for this writing environment.',
    };
  }

  if (!getWritingAiConnectionBaseUrl(input)) {
    return {
      field: 'baseUrl',
      title: 'AI provider required',
      message: 'Select a provider or enter a custom base URL before testing the connection.',
    };
  }

  return null;
};

export const buildWritingAiConnectionTestRequest = (
  input: WritingAiConnectionTestInput
): WritingAiConnectionTestRequest => ({
  apiKey: normalizeText(input.apiKey) || WRITING_AI_EXISTING_KEY_SENTINEL,
  baseUrl: getWritingAiConnectionBaseUrl(input),
  model: normalizeText(input.model),
});

export const normalizeWritingAiConnectionTestResult = (
  response?: WritingAiConnectionTestResponse | null
): WritingAiConnectionTestResult => {
  const success = !!response?.success;
  return {
    success,
    message: response?.message || (success ? 'Connection successful.' : 'Connection failed.'),
  };
};

export const resolveWritingAiConnectionTestModels = ({
  whitelistedModels,
  providerModels,
}: {
  whitelistedModels?: string[] | readonly string[] | null;
  providerModels?: unknown;
}): string[] => {
  if (whitelistedModels?.length) {
    return [...whitelistedModels];
  }

  return Array.isArray(providerModels)
    ? providerModels
        .filter((model): model is string => typeof model === 'string' && !!model.trim())
        .map((model) => model.trim())
    : [];
};
