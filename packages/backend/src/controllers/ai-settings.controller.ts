import { Request, Response } from 'express';
import { UserAISettingsModel } from '../models/user-ai-settings.model';
import { logger } from '../utils/logger';

export async function getSettings(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const settings = await UserAISettingsModel.getPublicByUserId(userId);
  if (!settings) {
    return res.json({ success: true, data: null });
  }
  res.json({ success: true, data: settings });
}

export async function saveSettings(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const { apiKey, baseUrl, model } = req.body;

  if (!baseUrl || !model) {
    return res.status(400).json({
      success: false,
      error: 'Base URL and model are required',
    });
  }

  // Validate URL format
  try {
    new URL(baseUrl);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid base URL format',
    });
  }

  // If apiKey is '__use_existing__', keep the current key but update other fields
  let keyToSave = apiKey;
  if (!apiKey || apiKey === '__use_existing__') {
    const existing = await UserAISettingsModel.getByUserId(userId);
    if (!existing) {
      return res.status(400).json({
        success: false,
        error: 'API key is required',
      });
    }
    keyToSave = existing.apiKey;
  }

  await UserAISettingsModel.upsert(userId, keyToSave, baseUrl, model);
  logger.info('AI settings saved', { userId });

  res.json({ success: true, message: 'AI settings saved successfully' });
}

export async function deleteSettings(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  const deleted = await UserAISettingsModel.delete(userId);
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'No AI settings found',
    });
  }
  logger.info('AI settings deleted', { userId });
  res.json({ success: true, message: 'AI settings deleted' });
}

export async function testConnection(req: Request, res: Response) {
  const userId = (req as any).user.userId;
  let { apiKey, baseUrl } = req.body;

  if (!baseUrl) {
    return res.status(400).json({
      success: false,
      error: 'Base URL is required',
    });
  }

  // If using existing key, load from DB
  if (!apiKey || apiKey === '__use_existing__') {
    const existing = await UserAISettingsModel.getByUserId(userId);
    if (!existing) {
      return res.status(400).json({
        success: false,
        error: 'API key is required',
      });
    }
    apiKey = existing.apiKey;
  }

  // Validate URL format
  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(baseUrl);
  } catch {
    return res.status(400).json({
      success: false,
      error: 'Invalid base URL format',
    });
  }

  if (parsedBaseUrl.hostname.endsWith('together.ai')) {
    return res.json({
      success: false,
      message: 'Together AI uses the OpenAI-compatible API base URL https://api.together.xyz/v1. The together.ai website URL returns HTML, not model JSON.',
    });
  }

  if (parsedBaseUrl.hostname === 'api.together.xyz' && !parsedBaseUrl.pathname.includes('/v1')) {
    return res.json({
      success: false,
      message: 'Together AI base URL should include /v1: https://api.together.xyz/v1',
    });
  }

  try {
    // Normalize base URL: remove trailing slash
    const normalizedUrl = baseUrl.replace(/\/+$/, '');
    const modelsUrl = `${normalizedUrl}/models`;

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const bodyPreview = await response.text().catch(() => '');
      return res.json({
        success: false,
        message: `Expected JSON from ${modelsUrl}, but received ${contentType || 'unknown content type'}. Check that the Base URL is an OpenAI-compatible API endpoint, for Together AI use https://api.together.xyz/v1.${bodyPreview.trim().startsWith('<!DOCTYPE') || bodyPreview.trim().startsWith('<html') ? ' The endpoint returned an HTML page.' : ''}`,
      });
    }

    const data = await response.json();

    if (!response.ok) {
      let errorMessage = `API returned ${response.status}`;
      errorMessage = data.error?.message || data.message || errorMessage;
      return res.json({
        success: false,
        message: errorMessage,
      });
    }

    // Extract model IDs from response
    // OpenAI format: { data: [{ id: "gpt-4o", ... }, ...] }
    let models: string[] = [];
    if (data.data && Array.isArray(data.data)) {
      models = data.data
        .map((m: any) => m.id)
        .filter((id: string) => id)
        .sort();
    }

    res.json({
      success: true,
      message: `Connection successful. Found ${models.length} models.`,
      models,
    });
  } catch (error: any) {
    const message = error.name === 'TimeoutError'
      ? 'Connection timed out (15s)'
      : error.message || 'Connection failed';
    res.json({
      success: false,
      message,
    });
  }
}
