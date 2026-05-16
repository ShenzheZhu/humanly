import type { AIModelDescriptor, ModelCapabilities } from '@humanly/shared';

const TEXT_ONLY: ModelCapabilities = { inputs: ['text'] };
const TEXT_AND_IMAGE: ModelCapabilities = { inputs: ['text', 'image'] };

/**
 * Admin-side curated whitelist. Shape mirrors `frontend-user/lib/ai-models.ts`
 * so the same capability-aware helpers can drive both pickers. The model
 * lists diverge intentionally because the two surfaces target different
 * audiences; capability flags are sourced from each provider's published
 * model page.
 */
export const MODEL_WHITELIST: Record<string, AIModelDescriptor[]> = {
  'api.openai.com': [
    { id: 'gpt-4.1', capabilities: TEXT_AND_IMAGE },
    { id: 'gpt-4o', capabilities: TEXT_AND_IMAGE },
    { id: 'gpt-4o-mini', capabilities: TEXT_AND_IMAGE },
    { id: 'gpt-4.1-nano', capabilities: TEXT_AND_IMAGE },
    { id: 'o3', capabilities: TEXT_AND_IMAGE },
  ],
  'api.deepseek.com': [
    { id: 'deepseek-reasoner', capabilities: TEXT_ONLY },
    { id: 'deepseek-chat', capabilities: TEXT_ONLY },
    { id: 'deepseek-coder', capabilities: TEXT_ONLY },
  ],
  'api.anthropic.com': [
    { id: 'claude-opus-4-5', capabilities: TEXT_AND_IMAGE },
    { id: 'claude-sonnet-4-5', capabilities: TEXT_AND_IMAGE },
    { id: 'claude-3-7-sonnet-20250219', capabilities: TEXT_AND_IMAGE },
    { id: 'claude-3-haiku-20240307', capabilities: TEXT_AND_IMAGE },
  ],
  'generativelanguage.googleapis.com': [
    { id: 'gemini-2.5-pro', capabilities: TEXT_AND_IMAGE },
    { id: 'gemini-2.5-flash', capabilities: TEXT_AND_IMAGE },
    { id: 'gemini-2.0-flash', capabilities: TEXT_AND_IMAGE },
    { id: 'gemini-1.5-flash', capabilities: TEXT_AND_IMAGE },
  ],
  'openrouter.ai': [
    { id: 'openai/gpt-4o', capabilities: TEXT_AND_IMAGE },
    { id: 'anthropic/claude-3.7-sonnet', capabilities: TEXT_AND_IMAGE },
    { id: 'google/gemini-2.5-pro', capabilities: TEXT_AND_IMAGE },
    { id: 'meta-llama/llama-3.3-70b-instruct', capabilities: TEXT_ONLY },
    { id: 'deepseek/deepseek-chat', capabilities: TEXT_ONLY },
    { id: 'mistralai/mistral-large', capabilities: TEXT_ONLY },
  ],
  'api.together.xyz': [
    { id: 'Qwen/Qwen3.5-9B', capabilities: TEXT_AND_IMAGE },
    { id: 'moonshotai/Kimi-K2.5', capabilities: TEXT_AND_IMAGE },
    { id: 'deepseek-ai/DeepSeek-V4-Pro', capabilities: TEXT_ONLY },
    { id: 'deepseek-ai/DeepSeek-V3', capabilities: TEXT_ONLY },
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', capabilities: TEXT_ONLY },
    { id: 'Qwen/Qwen2.5-7B-Instruct-Turbo', capabilities: TEXT_ONLY },
  ],
};

export function getModelDescriptors(baseUrl: string): AIModelDescriptor[] | null {
  try {
    const host = new URL(baseUrl).hostname;
    return MODEL_WHITELIST[host] ?? null;
  } catch {
    return null;
  }
}

export function getWhitelist(baseUrl: string): string[] | null {
  const descriptors = getModelDescriptors(baseUrl);
  if (!descriptors) return null;
  return descriptors.map(d => d.id);
}

export function getModelCapabilities(
  baseUrl: string,
  modelId: string,
): ModelCapabilities | null {
  const descriptors = getModelDescriptors(baseUrl);
  if (!descriptors) return null;
  const match = descriptors.find(d => d.id === modelId);
  return match ? match.capabilities : null;
}

export function modelSupportsImage(baseUrl: string, modelId: string): boolean {
  const caps = getModelCapabilities(baseUrl, modelId);
  return caps !== null && caps.inputs.includes('image');
}
