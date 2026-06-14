'use client';

import {
  formatCompactDuration,
  formatWritingAiAccess,
  formatWritingAiPolicy,
  isWritingAiChatEnabled,
  normalizeCopyPastePolicy,
  normalizeResourceAccessPolicy,
  type WritingEnvironmentConfig,
} from '@humanly/shared';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';

interface TaskRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WritingEnvironmentConfig;
  taskName?: string | null;
  taskStartDate?: string | null;
  taskEndDate?: string | null;
}

interface RuleRow {
  label: string;
  value: string;
  detail?: string;
}

function formatCharacterRequirement(config: WritingEnvironmentConfig) {
  const min = config.submission?.minCharacters;
  const max = config.submission?.maxCharacters;

  if (min && max) return `${min.toLocaleString()}-${max.toLocaleString()} characters`;
  if (min) return `At least ${min.toLocaleString()} characters`;
  if (max) return `At most ${max.toLocaleString()} characters`;
  return 'No length requirement';
}

function formatWritingTime(config: WritingEnvironmentConfig) {
  const seconds = config.time?.timeLimitSeconds;
  return seconds ? formatCompactDuration(seconds) : 'No session time limit';
}

function formatTaskWindow(
  config: WritingEnvironmentConfig,
  taskStartDate?: string | null,
  taskEndDate?: string | null
) {
  const start = taskStartDate || config.time?.startTime || null;
  const end = taskEndDate || config.time?.endTime || null;

  if (start && end) return `${formatDateTime(start)} - ${formatDateTime(end)}`;
  if (start) return `Opens ${formatDateTime(start)}`;
  if (end) return `Due ${formatDateTime(end)}`;
  return 'No scheduled task window';
}

function formatTraceability(config: WritingEnvironmentConfig) {
  const traceability = config.traceability || {};
  const enabled = [
    traceability.trackTyping ? 'typing' : null,
    traceability.trackCopyPaste ? 'copy-paste' : null,
    traceability.trackFocusBlur ? 'workspace focus' : null,
    traceability.trackAiUsage ? 'AI assistance' : null,
  ].filter(Boolean);

  return enabled.length > 0 ? enabled.join(', ') : 'No activity tracking configured';
}

function buildRuleRows(
  config: WritingEnvironmentConfig,
  taskStartDate?: string | null,
  taskEndDate?: string | null
): RuleRow[] {
  const aiPolicy = formatWritingAiPolicy(config);

  return [
    {
      label: 'AI access',
      value: formatWritingAiAccess(config.aiAccess),
      detail: isWritingAiChatEnabled(config.aiAccess)
        ? (aiPolicy === 'Guard' ? 'Agent chat follows the owner policy guard.' : 'Agent chat is not policy-guarded.')
        : undefined,
    },
    {
      label: 'Copy-paste',
      value: normalizeCopyPastePolicy(config.copyPastePolicy) === 'blocked'
        ? 'Blocked'
        : 'Allowed',
    },
    {
      label: 'Length requirement',
      value: formatCharacterRequirement(config),
    },
    {
      label: 'Writing time',
      value: formatWritingTime(config),
    },
    {
      label: 'Task window',
      value: formatTaskWindow(config, taskStartDate, taskEndDate),
    },
    {
      label: 'Resource access',
      value: normalizeResourceAccessPolicy(config.resourceAccess) === 'view-only'
        ? 'View-only PDF resources'
        : 'Downloadable PDF resources',
    },
    {
      label: 'Recorded activity',
      value: formatTraceability(config),
      detail: 'Used for logs, replay, and certificate evidence.',
    },
  ];
}

export function TaskRulesDialog({
  open,
  onOpenChange,
  config,
  taskName,
  taskStartDate,
  taskEndDate,
}: TaskRulesDialogProps) {
  const rows = buildRuleRows(config, taskStartDate, taskEndDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Writing task rules</DialogTitle>
          <DialogDescription>
            {taskName ? `${taskName} uses these writing rules.` : 'This task uses these writing rules.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-border/70 bg-muted/25 px-4 py-3"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </p>
                <p className="text-sm font-medium text-foreground sm:max-w-[65%] sm:text-right">
                  {row.value}
                </p>
              </div>
              {row.detail ? (
                <p className="mt-1 text-sm text-muted-foreground sm:text-right">
                  {row.detail}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
