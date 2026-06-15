import type { WritingEnvironmentConfig } from '../types';

export const WORKSPACE_SETUP_PREVIEW_HASH_KEY = 'workspacePreview';

export interface WorkspaceSetupPreviewTaskWindow {
  enabled: boolean;
  endDate?: string | null;
  startDate?: string | null;
}

export interface WorkspaceSetupPreviewPayload {
  allowGuestSubmissions?: boolean;
  config: WritingEnvironmentConfig;
  description?: string;
  hasPdf?: boolean;
  mode: 'personal' | 'admin';
  pdfLabel?: string;
  selectedAiModel?: string;
  taskWindow?: WorkspaceSetupPreviewTaskWindow;
  title?: string;
}

function encodeBase64(value: string): string {
  if (typeof btoa === 'function') {
    return btoa(value);
  }
  return Buffer.from(value, 'binary').toString('base64');
}

function decodeBase64(value: string): string {
  if (typeof atob === 'function') {
    return atob(value);
  }
  return Buffer.from(value, 'base64').toString('binary');
}

function toBase64Url(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  return normalized + '='.repeat(paddingLength);
}

export function encodeWorkspaceSetupPreviewPayload(payload: WorkspaceSetupPreviewPayload): string {
  const json = JSON.stringify(payload);
  const encoded = encodeBase64(encodeURIComponent(json));
  return toBase64Url(encoded);
}

export function decodeWorkspaceSetupPreviewPayload(value: string): WorkspaceSetupPreviewPayload {
  const json = decodeURIComponent(decodeBase64(fromBase64Url(value)));
  return JSON.parse(json) as WorkspaceSetupPreviewPayload;
}

export function buildWorkspaceSetupPreviewHash(payload: WorkspaceSetupPreviewPayload): string {
  const encoded = encodeWorkspaceSetupPreviewPayload(payload);
  return `#${WORKSPACE_SETUP_PREVIEW_HASH_KEY}=${encoded}`;
}

export function getWorkspaceSetupPreviewHashValue(hash: string): string | null {
  const normalizedHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const params = new URLSearchParams(normalizedHash);
  return params.get(WORKSPACE_SETUP_PREVIEW_HASH_KEY);
}
