'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import api from '@/lib/api-client';
import { UserAISettings } from '@humory/shared';

interface AISettingsDialogProps {
  onSettingsChanged?: () => void;
}

export function AISettingsDialog({ onSettingsChanged }: AISettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Form state
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [hasExisting, setHasExisting] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');

  // Load existing settings when dialog opens
  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/ai/settings');
      const settings: UserAISettings | null = res.data;
      if (settings && settings.hasApiKey) {
        setBaseUrl(settings.baseUrl);
        setModel(settings.model);
        setMaskedKey(settings.maskedApiKey || '');
        setHasExisting(true);
        setApiKey(''); // Don't pre-fill actual key
      } else {
        setHasExisting(false);
        setMaskedKey('');
        setBaseUrl('https://api.openai.com/v1');
        setApiKey('');
        setModel('');
      }
    } catch {
      // No settings yet
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    const keyToTest = apiKey || undefined;
    if (!keyToTest && !hasExisting) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setTesting(true);
    setTestResult(null);
    setModels([]);

    try {
      const data: any = await api.post('/ai/settings/test', {
        apiKey: keyToTest || '__use_existing__',
        baseUrl,
      });
      setTestResult({ success: data.success, message: data.message });
      if (data.success && data.models) {
        setModels(data.models);
        // Auto-select first model if none selected
        if (!model && data.models.length > 0) {
          setModel(data.models[0]);
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.message || err?.message || 'Connection test failed',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!model) {
      setTestResult({ success: false, message: 'Please select a model' });
      return;
    }
    if (!apiKey && !hasExisting) {
      setTestResult({ success: false, message: 'Please enter an API key' });
      return;
    }

    setSaving(true);
    try {
      await api.put('/ai/settings', {
        apiKey: apiKey || '__use_existing__',
        baseUrl,
        model,
      });
      setHasExisting(true);
      setOpen(false);
      onSettingsChanged?.();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.error || 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete('/ai/settings');
      setHasExisting(false);
      setApiKey('');
      setMaskedKey('');
      setModel('');
      setModels([]);
      setTestResult(null);
      setBaseUrl('https://api.openai.com/v1');
      setDeleteConfirmOpen(false);
      onSettingsChanged?.();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="AI Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">AI Settings</DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Base URL */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Base URL</Label>
                <Input
                  value={baseUrl}
                  onChange={(e) => {
                    setBaseUrl(e.target.value);
                    setTestResult(null);
                    setModels([]);
                  }}
                  placeholder="https://api.openai.com/v1"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  OpenAI, OpenRouter, Deepseek, or any OpenAI-compatible API
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">API Key</Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder={hasExisting ? `Current: ${maskedKey}` : 'sk-...'}
                  className="text-sm"
                />
                {hasExisting && !apiKey && (
                  <p className="text-[10px] text-muted-foreground">
                    Leave empty to keep current key
                  </p>
                )}
              </div>

              {/* Test Connection */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleTestConnection}
                disabled={testing || (!apiKey && !hasExisting)}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Testing connection...
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>

              {/* Test Result */}
              {testResult && (
                <div
                  className={`flex items-start gap-2 rounded-lg border p-3 text-xs ${
                    testResult.success
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              {/* Model Selection (shown after successful test) */}
              {models.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {models.map((m) => (
                        <SelectItem key={m} value={m} className="text-xs">
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Model (manual input if no models fetched but has existing) */}
              {models.length === 0 && hasExisting && model && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Model</Label>
                  <Input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="text-sm"
                    placeholder="gpt-4o"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleSave}
                  disabled={saving || (!model) || (!apiKey && !hasExisting)}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>

                {hasExisting && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteConfirmOpen(true)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete AI Settings?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your API key and disable AI features until you reconfigure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
