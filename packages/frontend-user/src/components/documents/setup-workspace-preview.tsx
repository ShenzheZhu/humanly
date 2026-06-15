'use client';

import type { ReactNode } from 'react';
import {
  Bot,
  Check,
  Clock,
  Clipboard,
  HelpCircle,
  Lock,
  MessageSquare,
  MousePointer2,
  PanelLeft,
  Sparkles,
  Timer,
  Wand2,
} from 'lucide-react';
import {
  formatCompactDuration,
  formatWritingAiAccess,
  isWritingAiChatEnabled,
  isWritingAiPolishEnabled,
  normalizeCopyPastePolicy,
  normalizeResourceAccessPolicy,
  normalizeWritingAiPolicy,
  type WritingEnvironmentConfig,
} from '@humanly/shared';

import { cn, formatDateTime } from '@/lib/utils';

interface WorkspacePreviewTaskWindow {
  enabled: boolean;
  endDate?: string | null;
  startDate?: string | null;
}

interface SetupWorkspacePreviewProps {
  allowGuestSubmissions?: boolean;
  className?: string;
  config: WritingEnvironmentConfig;
  description?: string;
  hasPdf?: boolean;
  mode: 'personal' | 'admin';
  pdfLabel?: string;
  selectedAiModel?: string;
  taskWindow?: WorkspacePreviewTaskWindow;
  title?: string;
}

function formatCharacterRule(config: WritingEnvironmentConfig): string {
  const min = config.submission.minCharacters;
  const max = config.submission.maxCharacters;

  if (min && max) return `${min.toLocaleString()}-${max.toLocaleString()} chars`;
  if (min) return `Min ${min.toLocaleString()} chars`;
  if (max) return `Max ${max.toLocaleString()} chars`;
  return 'No character cap';
}

function formatTaskWindow(taskWindow?: WorkspacePreviewTaskWindow): string {
  if (!taskWindow) return 'Personal workspace';
  if (!taskWindow.enabled) return 'Always available';

  if (taskWindow.startDate && taskWindow.endDate) {
    return `${formatDateTime(taskWindow.startDate)} - ${formatDateTime(taskWindow.endDate)}`;
  }
  if (taskWindow.startDate) return `Opens ${formatDateTime(taskWindow.startDate)}`;
  if (taskWindow.endDate) return `Due ${formatDateTime(taskWindow.endDate)}`;
  return 'Window enabled';
}

function getTraceabilityLabel(config: WritingEnvironmentConfig): string {
  const enabled = [
    config.traceability.trackTyping ? 'Typing' : null,
    config.traceability.trackCopyPaste ? 'Clipboard' : null,
    config.traceability.trackFocusBlur ? 'Focus' : null,
    config.traceability.trackAiUsage ? 'AI' : null,
  ].filter(Boolean);

  return enabled.length ? enabled.join(', ') : 'Minimal';
}

function PreviewStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function SetupWorkspacePreview({
  allowGuestSubmissions,
  className,
  config,
  description,
  hasPdf = false,
  mode,
  pdfLabel,
  selectedAiModel,
  taskWindow,
  title,
}: SetupWorkspacePreviewProps) {
  const aiChatEnabled = isWritingAiChatEnabled(config.aiAccess);
  const aiPolishEnabled = isWritingAiPolishEnabled(config.aiAccess);
  const aiPolicy = normalizeWritingAiPolicy(config.aiPolicy);
  const copyPasteBlocked = normalizeCopyPastePolicy(config.copyPastePolicy) === 'blocked';
  const resourceViewOnly = normalizeResourceAccessPolicy(config.resourceAccess) === 'view-only';
  const timeLimitLabel = config.time.timeLimitSeconds
    ? formatCompactDuration(config.time.timeLimitSeconds)
    : 'No timer';
  const displayTitle = title?.trim() || (mode === 'admin' ? 'Assigned writing task' : 'Untitled writing');
  const displayDescription = description?.trim() || (
    mode === 'admin'
      ? 'Writers see the configured task, resources, editor, and allowed AI support.'
      : 'Your workspace will open with the selected resources, editor, and allowed AI support.'
  );
  const modelLabel = selectedAiModel || config.allowedModels[0] || 'model selected at setup';
  const selectionActions = [
    ...(aiPolishEnabled ? [
      { icon: <Check className="h-3.5 w-3.5" />, label: 'Grammar' },
      { icon: <Wand2 className="h-3.5 w-3.5" />, label: 'Improve' },
      { icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Simplify' },
      { icon: <Sparkles className="h-3.5 w-3.5" />, label: 'Formal' },
    ] : []),
    ...(aiChatEnabled ? [
      { icon: <MessageSquare className="h-3.5 w-3.5" />, label: 'Ask AI' },
    ] : []),
  ];

  return (
    <section
      aria-label="Workspace preview"
      className={cn('space-y-4 rounded-lg border border-border/70 bg-muted/20 p-4', className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="humanly-eyebrow">Workspace Preview</p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {mode === 'admin' ? 'Assigned task workspace' : 'Personal writing workspace'}
          </h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Display-only preview. No saves, tracking events, AI calls, or timers run here.
          </p>
        </div>
        <span className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          Fully expanded
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PreviewStat
          icon={<Bot className="h-3.5 w-3.5" />}
          label="AI"
          value={`Mode: ${formatWritingAiAccess(config.aiAccess)}`}
        />
        <PreviewStat
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Timer"
          value={timeLimitLabel}
        />
        <PreviewStat
          icon={<MousePointer2 className="h-3.5 w-3.5" />}
          label="Length"
          value={formatCharacterRule(config)}
        />
        <PreviewStat
          icon={<Clipboard className="h-3.5 w-3.5" />}
          label="Copy-paste"
          value={copyPasteBlocked ? 'Blocked' : 'Allowed'}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border/80 bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border/70 bg-background px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-semibold">{displayTitle}</h4>
              {config.submission.maxCharacters ? (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  0/{config.submission.maxCharacters.toLocaleString()} characters
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">0 characters</span>
              )}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <HelpCircle className="h-3.5 w-3.5" />
                Rules
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">{displayDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              {resourceViewOnly ? 'PDF view-only' : 'PDF downloadable'}
            </span>
            <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-1">
              {formatTaskWindow(taskWindow)}
            </span>
            {mode === 'admin' ? (
              <span className="rounded-md border border-border/70 bg-muted/40 px-2 py-1">
                {config.submission.mode === 'single' ? 'Single submission' : 'Multiple submissions'}
                {' / '}
                {allowGuestSubmissions ? 'Guests allowed' : 'Sign-in required'}
              </span>
            ) : null}
          </div>
        </div>

        <div className={cn(
          'grid min-h-[360px] bg-muted/10',
          hasPdf && aiChatEnabled ? 'lg:grid-cols-[0.9fr_1.25fr_0.9fr]' : null,
          hasPdf && !aiChatEnabled ? 'lg:grid-cols-[0.9fr_1.35fr]' : null,
          !hasPdf && aiChatEnabled ? 'lg:grid-cols-[1.35fr_0.9fr]' : null,
          !hasPdf && !aiChatEnabled ? 'grid-cols-1' : null,
        )}>
          {hasPdf ? (
            <div className="min-h-[260px] border-b border-border/70 bg-card lg:border-b-0 lg:border-r">
              <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2 text-xs font-medium text-muted-foreground">
                <PanelLeft className="h-3.5 w-3.5" />
                <span className="truncate">{pdfLabel || 'Instruction PDF'}</span>
              </div>
              <div className="space-y-3 p-4">
                <div className="h-8 w-2/3 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted/80" />
                <div className="h-3 w-5/6 rounded bg-muted/80" />
                <div className="h-28 rounded border border-dashed border-border/80 bg-muted/30" />
                <div className="h-3 w-3/4 rounded bg-muted/80" />
                <div className="h-3 w-11/12 rounded bg-muted/80" />
              </div>
            </div>
          ) : null}

          <div className="relative min-h-[320px] bg-background p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border border-border/70 bg-muted/30 px-2 py-1">
                Tracking: {getTraceabilityLabel(config)}
              </span>
              {copyPasteBlocked ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-[#cfa6a0]/60 bg-[#f5e7e4] px-2 py-1 text-[#7f4e48]">
                  <Lock className="h-3.5 w-3.5" />
                  Clipboard blocked
                </span>
              ) : null}
              {config.time.timeLimitSeconds ? (
                <span className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-muted/30 px-2 py-1">
                  <Timer className="h-3.5 w-3.5" />
                  {timeLimitLabel}
                </span>
              ) : null}
            </div>

            <div className="mx-auto h-full max-w-2xl rounded-lg border border-dashed border-border/70 bg-card p-5">
              <p className="text-sm leading-7 text-foreground">
                <span className="rounded bg-[#d9e8f7] px-1">Select text in the editor</span>
                {' '}to see the AI controls allowed by this environment.
              </p>
              <p className="mt-5 text-sm leading-7 text-muted-foreground">
                The final workspace keeps the editor centered while Humanly records typing,
                clipboard, focus, and in-platform AI activity according to this configuration.
              </p>
            </div>

            {selectionActions.length > 0 ? (
              <div className="absolute left-6 top-28 max-w-[calc(100%-3rem)] rounded-xl border border-border/70 bg-popover p-2 shadow-md">
                <div className="flex flex-wrap gap-1.5">
                  {selectionActions.map((action) => (
                    <span
                      key={action.label}
                      className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium"
                    >
                      {action.icon}
                      {action.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {aiChatEnabled ? (
            <div className="flex min-h-[320px] flex-col border-t border-border/70 bg-card lg:border-l lg:border-t-0">
              <div className="border-b border-border/70 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                    <Bot className="h-4 w-4 text-muted-foreground" />
                    <span>AI Assistant</span>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {aiPolicy.mode === 'guard' ? 'Guard on' : 'Guard off'}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">Preview model: {modelLabel}</p>
              </div>
              <div className="flex-1 space-y-3 p-3 text-sm">
                <div className="rounded-lg bg-muted/45 p-3 text-muted-foreground">
                  Ask questions inside Humanly while the interaction is logged.
                </div>
                <div className="ml-auto rounded-lg bg-primary px-3 py-2 text-primary-foreground">
                  Can you help me understand this paragraph?
                </div>
                <div className="rounded-lg border border-border/70 bg-background p-3 text-muted-foreground">
                  I can help with allowed writing support for this workspace.
                </div>
              </div>
              <div className="border-t border-border/70 p-3">
                <div className="rounded-lg border border-border/70 bg-background px-3 py-2 text-xs text-muted-foreground">
                  Message Humanly AI...
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
