/**
 * Tests for the model selector inside AIAssistantPanel.
 *
 * Strategy:
 * - Mock api, useAI, useAILogs, useAIStore, usePDFTextStore, AISettingsDialog, etc.
 *   so the panel renders without network calls or real stores.
 * - Control what api.get('/ai/settings') returns to simulate different providers.
 * - Assert that the <select> element shows only the curated whitelist for known
 *   providers and does NOT make a /test API call in that case.
 */

// ── Global DOM stubs ──────────────────────────────────────────────────────────
// jsdom does not implement scrollIntoView; stub it to avoid errors.
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockApiPut = jest.fn();

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockApiGet(...args),
    post: (...args: any[]) => mockApiPost(...args),
    put: (...args: any[]) => mockApiPut(...args),
  },
}));

jest.mock('@/hooks/use-ai', () => ({
  useAI: () => ({
    messages: [],
    isStreaming: false,
    streamingContent: '',
    suggestions: [],
    isLoading: false,
    error: null,
    sendMessage: jest.fn(),
    cancelStream: jest.fn(),
    clearMessages: jest.fn(),
    startNewChat: jest.fn(),
    loadSession: jest.fn(),
    clearError: jest.fn(),
  }),
  useAILogs: () => ({
    logs: [],
    isLoading: false,
    loadMore: jest.fn(),
    hasMore: false,
    refresh: jest.fn(),
  }),
}));

const aiStoreState = {
  messages: [],
  addMessage: jest.fn(),
  clearMessages: jest.fn(),
  conversations: [],
  currentConversationId: null,
  setCurrentConversationId: jest.fn(),
  createConversation: jest.fn(),
  loadConversations: jest.fn(),
  quotedText: null,
  clearQuotedText: jest.fn(),
};
jest.mock('@/stores/ai-store', () => ({
  useAIStore: (selector: any) => selector(aiStoreState),
}));

const pdfStoreState = {
  pdfText: {},
  getPDFText: jest.fn().mockReturnValue(null),
};
jest.mock('@/stores/pdf-text-store', () => ({
  usePDFTextStore: (selector: any) => selector(pdfStoreState),
}));

jest.mock('@/components/ai/ai-settings-dialog', () => ({
  AISettingsDialog: () => null,
}));

jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children }: any) => children }));

// ── Imports ────────────────────────────────────────────────────────────────────

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIAssistantPanel } from '@/components/ai/ai-assistant-panel';
import { MODEL_WHITELIST } from '@/lib/ai-models';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSettingsResponse(baseUrl: string, model: string) {
  return { data: { hasApiKey: true, baseUrl, model, maskedApiKey: 'sk-****' } };
}

async function renderPanel() {
  render(
    <AIAssistantPanel
      documentId="doc-1"
      onClose={jest.fn()}
    />
  );
  // Wait for checkAISettings (useEffect → api.get → setState) to fully settle.
  // waitFor polls inside act(), so all resulting state updates are properly wrapped.
  await waitFor(() => expect(mockApiGet).toHaveBeenCalledWith('/ai/settings'));
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// 1. Known provider — whitelist used, no /test call ────────────────────────────

describe('known provider model selector', () => {
  it('shows only whitelisted OpenAI models without calling /ai/settings/test', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://api.openai.com/v1', 'gpt-4o')
    );

    renderPanel();

    // Wait for the select element to appear
    const select = await screen.findByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);

    // Must contain exactly the OpenAI whitelist
    const whitelist = MODEL_WHITELIST['api.openai.com'];
    whitelist.forEach((m) => expect(options).toContain(m));

    // Must NOT contain more than whitelist + possibly the current model
    expect(options.length).toBeLessThanOrEqual(whitelist.length + 1);

    // No /test API call should have been made
    expect(mockApiPost).not.toHaveBeenCalledWith('/ai/settings/test', expect.anything());
  });

  it('shows only whitelisted DeepSeek models', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://api.deepseek.com/v1', 'deepseek-chat')
    );

    renderPanel();

    const select = await screen.findByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);

    const whitelist = MODEL_WHITELIST['api.deepseek.com'];
    whitelist.forEach((m) => expect(options).toContain(m));
    expect(options.length).toBeLessThanOrEqual(whitelist.length + 1);
    expect(mockApiPost).not.toHaveBeenCalledWith('/ai/settings/test', expect.anything());
  });

  it('shows only whitelisted OpenRouter models', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://openrouter.ai/api/v1', 'openai/gpt-4o')
    );

    renderPanel();

    const select = await screen.findByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);

    const whitelist = MODEL_WHITELIST['openrouter.ai'];
    whitelist.forEach((m) => expect(options).toContain(m));
    expect(options.length).toBeLessThanOrEqual(whitelist.length + 1);
    expect(mockApiPost).not.toHaveBeenCalledWith('/ai/settings/test', expect.anything());
  });

  it('current model is pre-selected', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://api.openai.com/v1', 'gpt-4o-mini')
    );

    renderPanel();

    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    expect(select.value).toBe('gpt-4o-mini');
  });

  it('adds current model as extra option when it is not in whitelist', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://api.openai.com/v1', 'gpt-4o-custom-finetune')
    );

    renderPanel();

    const select = await screen.findByRole('combobox');
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options).toContain('gpt-4o-custom-finetune');
  });
});

// 2. Unknown provider — /test API call is made ─────────────────────────────────

describe('unknown provider model selector', () => {
  it('calls /ai/settings/test to fetch models for an unknown base URL', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://my-llm.example.com/v1', 'my-model')
    );
    mockApiPost.mockResolvedValue({
      data: { success: true, models: ['my-model', 'my-model-v2'] },
    });

    renderPanel();

    await waitFor(() =>
      expect(mockApiPost).toHaveBeenCalledWith('/ai/settings/test', {
        apiKey: '__use_existing__',
        baseUrl: 'https://my-llm.example.com/v1',
      })
    );
  });

  it('shows API-returned models for unknown provider', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://my-llm.example.com/v1', 'my-model')
    );
    mockApiPost.mockResolvedValue({
      data: { success: true, models: ['my-model', 'my-model-v2', 'my-model-v3'] },
    });

    renderPanel();

    const select = await screen.findByRole('combobox');
    await waitFor(() => {
      const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
      expect(options).toContain('my-model-v2');
      expect(options).toContain('my-model-v3');
    });
  });

  it('does not show selector when API call fails', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://my-llm.example.com/v1', 'my-model')
    );
    mockApiPost.mockRejectedValue(new Error('Network error'));

    renderPanel();

    // Give it time to fail silently
    await new Promise((r) => setTimeout(r, 50));
    // No combobox should render since availableModels stays empty
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

// 3. No AI settings ────────────────────────────────────────────────────────────

describe('no AI settings', () => {
  it('does not show model selector when user has no API key configured', async () => {
    mockApiGet.mockResolvedValue({ data: { hasApiKey: false } });

    renderPanel();

    await waitFor(() =>
      expect(mockApiGet).toHaveBeenCalledWith('/ai/settings')
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

// 4. Model switching ───────────────────────────────────────────────────────────

describe('model switching', () => {
  it('calls PUT /ai/settings when user selects a different model', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://api.openai.com/v1', 'gpt-4o')
    );
    mockApiPut.mockResolvedValue({ data: { success: true } });

    renderPanel();

    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    await userEvent.selectOptions(select, 'gpt-4o-mini');

    await waitFor(() =>
      expect(mockApiPut).toHaveBeenCalledWith('/ai/settings', {
        apiKey: '__use_existing__',
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
      })
    );
  });

  it('updates displayed model after successful switch', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://api.openai.com/v1', 'gpt-4o')
    );
    mockApiPut.mockResolvedValue({ data: { success: true } });

    renderPanel();

    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    await userEvent.selectOptions(select, 'gpt-4o-mini');

    await waitFor(() => expect(select.value).toBe('gpt-4o-mini'));
  });

  it('does not call PUT when the same model is selected again', async () => {
    mockApiGet.mockResolvedValue(
      makeSettingsResponse('https://api.openai.com/v1', 'gpt-4o')
    );

    renderPanel();

    const select = (await screen.findByRole('combobox')) as HTMLSelectElement;
    await userEvent.selectOptions(select, 'gpt-4o');

    expect(mockApiPut).not.toHaveBeenCalled();
  });
});
