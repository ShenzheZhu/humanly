'use client';

import { ChangeEvent, ClipboardEvent, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  FileJson,
  FileText,
  History,
  Loader2,
  RotateCcw,
  Settings2,
  Share2,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CertificateGenerationDialog,
  type CertificateGenerationOptions,
} from '@/components/certificates/certificate-generation-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type DemoStep = 'setup' | 'writing' | 'log' | 'certificate' | 'done';
type AiAccess = 'off' | 'full';
type PastePolicy = 'allowed' | 'blocked';
type LogKind = 'setting' | 'input' | 'paste' | 'blocked-paste' | 'certificate';
type SaveStatus = 'saved' | 'saving';

interface DemoSettings {
  taskName: string;
  description: string;
  aiAccess: AiAccess;
  pastePolicy: PastePolicy;
  allowGuestSubmissions: boolean;
  minCharacters: number;
  maxCharacters: number;
  writingTimerMinutes: number;
}

interface DemoLogEntry {
  id: string;
  time: string;
  kind: LogKind;
  detail: string;
  characters: number;
}

interface DemoStats {
  totalCharacters: number;
  words: number;
  typedCharacters: number;
  pastedCharacters: number;
  logCount: number;
  typedPercentage: number;
  pastedPercentage: number;
}

const initialSettings: DemoSettings = {
  taskName: 'Research Reflection Assignment',
  description: 'Write a short reflection and generate a process certificate.',
  aiAccess: 'off',
  pastePolicy: 'allowed',
  allowGuestSubmissions: true,
  minCharacters: 120,
  maxCharacters: 1200,
  writingTimerMinutes: 45,
};

const aiAccessLabels: Record<AiAccess, string> = {
  off: 'AI Off',
  full: 'AI On',
};

const pastePolicyLabels: Record<PastePolicy, string> = {
  allowed: 'Copy & paste allowed',
  blocked: 'Copy & paste blocked',
};

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function makeEntry(kind: LogKind, detail: string, characters = 0): DemoLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    time: formatTime(),
    kind,
    detail,
    characters,
  };
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatDate(value: Date) {
  return value.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function FastWritingDemo() {
  const [step, setStep] = useState<DemoStep>('setup');
  const [settings, setSettings] = useState<DemoSettings>(initialSettings);
  const [draft, setDraft] = useState('');
  const [logs, setLogs] = useState<DemoLogEntry[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [certificateDialogOpen, setCertificateDialogOpen] = useState(false);
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);
  const [certificateOptions, setCertificateOptions] = useState<CertificateGenerationOptions>({
    includeFullText: true,
    includeEditHistory: true,
  });

  const stats = useMemo(() => {
    const pastedCharacters = logs
      .filter((entry) => entry.kind === 'paste')
      .reduce((total, entry) => total + entry.characters, 0);
    const typedCharacters = logs
      .filter((entry) => entry.kind === 'input')
      .reduce((total, entry) => total + entry.characters, 0);
    const authoredCharacters = typedCharacters + pastedCharacters;

    return {
      totalCharacters: draft.length,
      words: countWords(draft),
      typedCharacters,
      pastedCharacters,
      logCount: logs.length,
      typedPercentage: authoredCharacters > 0 ? Math.round((typedCharacters / authoredCharacters) * 100) : 0,
      pastedPercentage: authoredCharacters > 0 ? Math.round((pastedCharacters / authoredCharacters) * 100) : 0,
    };
  }, [draft, logs]);

  const appendLog = (entry: DemoLogEntry) => {
    setLogs((current) => [entry, ...current].slice(0, 80));
  };

  const updateSettings = (patch: Partial<DemoSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const handleCreateTask = () => {
    setStep('writing');
    setSaveStatus('saved');
    appendLog(
      makeEntry(
        'setting',
        `${aiAccessLabels[settings.aiAccess]}, ${pastePolicyLabels[settings.pastePolicy]}, ${settings.writingTimerMinutes} minute writing timer`
      )
    );
  };

  const handleDraftChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextDraft = event.target.value;
    const delta = nextDraft.length - draft.length;

    setDraft(nextDraft);
    setSaveStatus('saved');

    if (delta > 0) {
      appendLog(makeEntry('input', 'Typed in the Humanly editor', delta));
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = event.clipboardData.getData('text');

    if (settings.pastePolicy === 'blocked') {
      event.preventDefault();
      appendLog(makeEntry('blocked-paste', 'Paste blocked by task environment', pastedText.length));
      return;
    }

    appendLog(makeEntry('paste', 'Pasted text into the Humanly editor', pastedText.length));
  };

  const handleGenerateCertificate = (options: CertificateGenerationOptions) => {
    setIsGeneratingCertificate(true);
    setCertificateOptions(options);
    appendLog(makeEntry('certificate', 'Generated a demo authorship certificate', draft.length));
    window.setTimeout(() => {
      setIsGeneratingCertificate(false);
      setCertificateDialogOpen(false);
      setStep('certificate');
    }, 180);
  };

  const handleRestart = () => {
    setStep('setup');
    setSettings(initialSettings);
    setDraft('');
    setLogs([]);
    setSaveStatus('saved');
    setCertificateOptions({
      includeFullText: true,
      includeEditHistory: true,
    });
    setCertificateDialogOpen(false);
    setIsGeneratingCertificate(false);
  };

  const startDate = useMemo(() => new Date(), []);
  const endDate = useMemo(() => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + 14);
    return date;
  }, [startDate]);

  return (
    <section id="demo" className="bg-[#f7f2e8] px-5 py-[110px] sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[720px]">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Fast writing demo
            </p>
            <h2 className="text-[28px] font-semibold leading-[1.08] tracking-normal sm:text-[36px]">
              Try the real task-to-certificate flow without signing in.
            </h2>
            <p className="mt-5 text-[15px] leading-[1.7] text-muted-foreground sm:text-[17px]">
              Configure a local task, write in a Humanly-style editor, inspect the activity log,
              and generate a certificate preview. The demo resets when you are done.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground sm:min-w-[430px]">
            <StepBadge active={step === 'setup'} complete={step !== 'setup'} Icon={Settings2} label="New Task" />
            <StepBadge active={step === 'writing'} complete={['log', 'certificate', 'done'].includes(step)} Icon={FileText} label="Writing" />
            <StepBadge active={step === 'log'} complete={['certificate', 'done'].includes(step)} Icon={History} label="Logs" />
            <StepBadge active={step === 'certificate' || step === 'done'} complete={step === 'done'} Icon={Award} label="Certificate" />
          </div>
        </div>

        {step === 'setup' ? (
          <DemoTaskSetup
            settings={settings}
            startDate={startDate}
            endDate={endDate}
            onSettingsChange={updateSettings}
            onCreateTask={handleCreateTask}
          />
        ) : step === 'writing' ? (
          <DemoWritingEditor
            settings={settings}
            draft={draft}
            stats={stats}
            saveStatus={saveStatus}
            onDraftChange={handleDraftChange}
            onPaste={handlePaste}
            onViewLogs={() => setStep('log')}
            onOpenCertificateDialog={() => setCertificateDialogOpen(true)}
          />
        ) : step === 'log' ? (
          <DemoActivityLog
            logs={logs}
            onBackToWriting={() => setStep('writing')}
            onOpenCertificateDialog={() => setCertificateDialogOpen(true)}
          />
        ) : step === 'certificate' ? (
          <DemoCertificatePreview
            title={settings.taskName}
            stats={stats}
            logs={logs}
            options={certificateOptions}
            onEnd={() => setStep('done')}
            onRestart={handleRestart}
          />
        ) : (
          <DonePanel onRestart={handleRestart} />
        )}
      </div>

      <CertificateGenerationDialog
        open={certificateDialogOpen}
        onOpenChange={setCertificateDialogOpen}
        onGenerate={handleGenerateCertificate}
        isGenerating={isGeneratingCertificate}
      />
    </section>
  );
}

function StepBadge({
  active,
  complete,
  Icon,
  label,
}: {
  active: boolean;
  complete: boolean;
  Icon: typeof Settings2;
  label: string;
}) {
  return (
    <div
      className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[8px] border px-2 text-center ${
        active
          ? 'border-foreground bg-white text-foreground'
          : complete
            ? 'border-[#6f8a78]/40 bg-[#dde6df] text-[#4a655a]'
            : 'border-[rgba(20,22,26,0.10)] bg-white/60'
      }`}
    >
      {complete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      <span className="font-medium">{label}</span>
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold tracking-normal">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function DemoTaskSetup({
  settings,
  startDate,
  endDate,
  onSettingsChange,
  onCreateTask,
}: {
  settings: DemoSettings;
  startDate: Date;
  endDate: Date;
  onSettingsChange: (patch: Partial<DemoSettings>) => void;
  onCreateTask: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <Button type="button" variant="ghost" className="mb-4 px-0 hover:bg-transparent" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>
        <h3 className="text-3xl font-bold tracking-normal">New Task</h3>
        <p className="mt-2 text-muted-foreground">
          Create an admin-managed writing task and configure its writing environment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task Configuration</CardTitle>
          <CardDescription>
            Demo-only settings. Nothing is saved, but the flow matches the real task setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)] xl:items-start">
          <section className="space-y-4">
            <SectionHeading
              title="Basic Information"
              description="Name the task and attach optional PDF instructions for enrolled users."
            />

            <div className="space-y-2">
              <Label htmlFor="demo-task-name">Task Name</Label>
              <Input
                id="demo-task-name"
                value={settings.taskName}
                onChange={(event) => onSettingsChange({ taskName: event.target.value })}
                placeholder="Research Reflection Assignment"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="demo-task-description">Description</Label>
              <Textarea
                id="demo-task-description"
                value={settings.description}
                onChange={(event) => onSettingsChange({ description: event.target.value })}
                placeholder="Describe the writing task..."
                className="resize-none"
              />
            </div>

            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Upload className="h-4 w-4 text-muted-foreground" />
                Files
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                The demo includes a sample instruction file in the writing workspace.
              </p>
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 p-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">reflection-brief.pdf</p>
                  <p className="text-xs text-muted-foreground">Demo instruction PDF</p>
                </div>
                <Button type="button" variant="ghost" size="icon" disabled>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Label htmlFor="demo-guest-submissions" className="text-sm font-medium">
                    Allow guest submissions from public link
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Visitors can choose guest mode in the demo share-link flow.
                  </p>
                </div>
                <Checkbox
                  id="demo-guest-submissions"
                  checked={settings.allowGuestSubmissions}
                  onCheckedChange={(checked) => onSettingsChange({ allowGuestSubmissions: checked === true })}
                />
              </div>
            </div>
          </section>

          <div className="space-y-5 rounded-md border p-4">
            <SectionHeading
              title="Environment"
              description="Choose the writing controls before the demo task opens."
            />

            <div className="grid gap-2">
              <Label>Environment</Label>
              <Select value="custom">
                <SelectTrigger>
                  <SelectValue placeholder="Select environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-4 rounded-md border p-4 xl:col-span-2">
                <SectionHeading title="AI" description="Control whether enrolled users can use assistant support." />
                <div className="grid gap-2">
                  <Label>AI</Label>
                  <Select
                    value={settings.aiAccess}
                    onValueChange={(value) => onSettingsChange({ aiAccess: value as AiAccess })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="AI access" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">AI Off</SelectItem>
                      <SelectItem value="full">AI On</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 rounded-md border p-4">
                <SectionHeading title="Copy & Paste" description="Choose whether paste activity is allowed." />
                <div className="grid gap-2">
                  <Label>Copy & Paste</Label>
                  <Select
                    value={settings.pastePolicy}
                    onValueChange={(value) => onSettingsChange({ pastePolicy: value as PastePolicy })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Copy-paste policy" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="allowed">Allowed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 rounded-md border p-4">
                <SectionHeading title="Submission" description="Set final character limits." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="demo-min-characters">Minimum Characters</Label>
                    <Input
                      id="demo-min-characters"
                      type="number"
                      min={1}
                      value={settings.minCharacters}
                      onChange={(event) => onSettingsChange({ minCharacters: Number(event.target.value) || 1 })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="demo-max-characters">Maximum Characters</Label>
                    <Input
                      id="demo-max-characters"
                      type="number"
                      min={1}
                      value={settings.maxCharacters}
                      onChange={(event) => onSettingsChange({ maxCharacters: Number(event.target.value) || 1 })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-md border p-4">
                <SectionHeading title="Time" description="Set the task availability window shown to users." />
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="grid gap-2 text-sm">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start</p>
                          <p className="mt-0.5 font-medium">{formatDate(startDate)}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End</p>
                          <p className="mt-0.5 font-medium">{formatDate(endDate)}</p>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="w-full" disabled>
                        Edit Time Window
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-md border p-4">
                <SectionHeading title="Writing Session Timer" description="Set a countdown shown while users write." />
                <div className="grid gap-2">
                  <Label htmlFor="demo-timer">Time Limit (minutes)</Label>
                  <Input
                    id="demo-timer"
                    type="number"
                    min={1}
                    value={settings.writingTimerMinutes}
                    onChange={(event) => onSettingsChange({ writingTimerMinutes: Number(event.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t border-border/70 pt-4">
          <Button type="button" variant="outline" disabled>
            Cancel
          </Button>
          <Button type="button" onClick={onCreateTask}>
            Create Task
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${
        status === 'saving' ? 'text-muted-foreground' : 'text-emerald-700'
      }`}
      aria-live="polite"
    >
      {status === 'saving' ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Saved</span>
        </>
      )}
    </span>
  );
}

function DemoWritingEditor({
  settings,
  draft,
  stats,
  saveStatus,
  onDraftChange,
  onPaste,
  onViewLogs,
  onOpenCertificateDialog,
}: {
  settings: DemoSettings;
  draft: string;
  stats: DemoStats;
  saveStatus: SaveStatus;
  onDraftChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onViewLogs: () => void;
  onOpenCertificateDialog: () => void;
}) {
  return (
    <div className="flex h-[760px] flex-col overflow-hidden rounded-lg border border-border/80 bg-background shadow-[0_34px_80px_-56px_rgba(20,22,26,0.75)]">
      <div className="shrink-0 border-b border-border/70 bg-card">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="outline" size="icon" aria-label="Back to Documents" disabled>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="min-w-0 truncate text-lg font-semibold tracking-normal">
                    {settings.taskName || 'Untitled Task'}
                  </h3>
                  <SaveStatusIndicator status={saveStatus} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>Starts now</span>
                  <span>Deadline in 14 days</span>
                </div>
                <Badge variant="outline" className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>Writing time left</span>
                  <span className="font-semibold">{settings.writingTimerMinutes}:00</span>
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
              <Badge variant="secondary" className="rounded-md">
                {stats.totalCharacters.toLocaleString()}/{settings.maxCharacters.toLocaleString()} characters
              </Badge>
              <Button type="button" variant="outline" size="sm" onClick={onViewLogs} className="sm:size-default">
                <FileText className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">View Logs</span>
              </Button>
              <Button type="button" size="sm" onClick={onOpenCertificateDialog} className="sm:size-default">
                <Award className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Generate Certificate</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="grid h-full overflow-hidden rounded-lg border border-border/80 bg-card lg:grid-cols-[38%_1fr]">
          <div className="hidden min-h-0 flex-col overflow-hidden border-r border-border/70 bg-card lg:flex">
            <div className="shrink-0 border-b border-border/70 bg-muted/30 px-3 py-2">
              <Button type="button" variant="default" size="sm" className="max-w-[240px] justify-start truncate">
                reflection-brief.pdf
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto bg-[#f8f8f6] p-5">
              <div className="mx-auto min-h-[560px] max-w-[390px] rounded-sm bg-white p-6 shadow-sm ring-1 ring-border/70">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Assignment Brief
                </p>
                <h4 className="mt-4 text-lg font-semibold">Reflection Prompt</h4>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Write a short reflection that explains your reasoning process. Humanly records typing,
                  paste activity, timing, and AI assistance as provenance evidence.
                </p>
                <Separator className="my-5" />
                <div className="space-y-3 text-sm leading-6">
                  <p><span className="font-medium">AI:</span> {aiAccessLabels[settings.aiAccess]}</p>
                  <p><span className="font-medium">Paste:</span> {pastePolicyLabels[settings.pastePolicy]}</p>
                  <p><span className="font-medium">Length:</span> {settings.minCharacters}-{settings.maxCharacters} characters</p>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 overflow-auto bg-background">
            <div className="h-full px-4 py-4 sm:px-6 sm:py-6">
              <Textarea
                aria-label="Demo writing editor"
                value={draft}
                onChange={onDraftChange}
                onPaste={onPaste}
                placeholder="Start writing with your instruction file open..."
                className="h-full min-h-[580px] resize-none rounded-lg border-border/80 bg-card p-6 text-base leading-7 shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoActivityLog({
  logs,
  onBackToWriting,
  onOpenCertificateDialog,
}: {
  logs: DemoLogEntry[];
  onBackToWriting: () => void;
  onOpenCertificateDialog: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl rounded-lg border border-border/80 bg-card shadow-[0_34px_80px_-56px_rgba(20,22,26,0.75)]">
      <div className="flex flex-col gap-3 border-b border-border/70 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold tracking-normal">Activity Logs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Local demo events are shown in the same audit-oriented shape as Humanly writing logs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBackToWriting}>
            Back to Writing
          </Button>
          <Button type="button" onClick={onOpenCertificateDialog}>
            <Award className="mr-2 h-4 w-4" />
            Generate Certificate
          </Button>
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="grid grid-cols-[94px_150px_1fr_92px] bg-muted/35 px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          <span>Time</span>
          <span>Event</span>
          <span>Detail</span>
          <span className="text-right">Chars</span>
        </div>
        <div className="max-h-[520px] overflow-auto">
          {logs.length ? (
            logs.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[94px_150px_1fr_92px] border-t border-border/70 px-5 py-3 text-sm"
              >
                <span className="text-muted-foreground">{entry.time}</span>
                <span>
                  <Badge variant="secondary" className="rounded-md">
                    {entry.kind}
                  </Badge>
                </span>
                <span className="min-w-0 truncate text-muted-foreground">{entry.detail}</span>
                <span className="text-right text-muted-foreground">{entry.characters}</span>
              </div>
            ))
          ) : (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              No events yet. Go back and type a few words.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/35 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DemoCertificatePreview({
  title,
  stats,
  logs,
  options,
  onEnd,
  onRestart,
}: {
  title: string;
  stats: DemoStats;
  logs: DemoLogEntry[];
  options: CertificateGenerationOptions;
  onEnd: () => void;
  onRestart: () => void;
}) {
  const editingMinutes = Math.max(1, Math.ceil(stats.logCount / 3));
  const latestLogs = logs.slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl rounded-lg border border-border/80 bg-background p-5 shadow-[0_34px_80px_-56px_rgba(20,22,26,0.75)] sm:p-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" size="sm" onClick={onEnd} className="w-fit">
          End demo
        </Button>

        <div className="grid grid-cols-3 gap-2 sm:w-auto">
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-36">
            <Share2 className="mr-2 h-4 w-4" />
            Share Link
          </Button>
          <Button type="button" size="sm" className="w-full sm:w-36">
            <FileText className="mr-2 h-4 w-4" />
            Open PDF
          </Button>
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-36">
            <FileJson className="mr-2 h-4 w-4" />
            JSON Data
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <Award className="mt-1 h-6 w-6 shrink-0 text-accent" />
                  <div className="min-w-0">
                    <h3 className="break-words text-2xl font-semibold tracking-normal">{title || 'Untitled Task'}</h3>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Generated just now
                    </p>
                  </div>
                </div>
              </div>
              <p className="max-w-full text-sm text-muted-foreground lg:ml-6 lg:shrink-0 lg:whitespace-nowrap lg:text-right">
                A verifiable snapshot of typing activity, pasted text, and AI assistance.
              </p>
            </div>

            <Separator />

            <div className="grid gap-2 sm:grid-cols-4">
              <StatTile label="Typed" value={`${stats.typedPercentage}%`} />
              <StatTile label="Pasted" value={`${stats.pastedPercentage}%`} />
              <StatTile label="Final Text" value={stats.totalCharacters.toLocaleString()} />
              <StatTile label="Writing Time" value={`${editingMinutes} min`} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Typed vs pasted composition</span>
                <span className="font-medium">
                  {stats.typedCharacters.toLocaleString()} typed · {stats.pastedCharacters.toLocaleString()} pasted
                </span>
              </div>
              <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
                <div className="bg-primary" style={{ width: `${stats.typedPercentage}%` }} />
                <div className="bg-[#b9774f]" style={{ width: `${stats.pastedPercentage}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">More details</CardTitle>
            <CardDescription>Verification, display, and recent proof events.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
            <div className="grid gap-4 rounded-lg border border-border/70 bg-muted/20 p-4 lg:grid-cols-[minmax(190px,0.8fr)_minmax(280px,1.2fr)]">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium">Verification</h4>
                  <p className="text-xs text-muted-foreground">Share or scan this link to verify the certificate.</p>
                </div>
                <div className="flex h-36 w-36 items-center justify-center rounded bg-white text-muted-foreground ring-1 ring-border/70">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <Button type="button" variant="outline" size="sm" className="w-full max-w-56 bg-background">
                  <Share2 className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Public Display</h4>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-700" />
                      {options.includeFullText ? 'Full text included' : 'Full text hidden'}
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-700" />
                      {options.includeEditHistory ? 'Edit history included' : 'Edit history hidden'}
                    </p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Recent proof events</h4>
                  {latestLogs.length ? (
                    <div className="space-y-2">
                      {latestLogs.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate text-muted-foreground">{entry.detail}</span>
                          <span className="shrink-0 font-medium">{entry.time}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No events were recorded before this certificate.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4 text-xs">
              <div>
                <h4 className="text-sm font-medium">Identifiers</h4>
                <p className="text-xs text-muted-foreground">Demo identifiers for audit and support.</p>
              </div>
              <div>
                <p className="text-muted-foreground">Certificate ID</p>
                <p className="truncate">demo-certificate-local</p>
              </div>
              <div>
                <p className="text-muted-foreground">Document ID</p>
                <p className="truncate">demo-document-local</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2 w-full">
                <Copy className="mr-2 h-4 w-4" />
                Copy Token
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onRestart}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Do it again
          </Button>
        </div>
      </div>
    </div>
  );
}

function DonePanel({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-border/80 bg-card p-8 text-center shadow-[0_34px_80px_-56px_rgba(20,22,26,0.75)]">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Demo complete</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-normal">The local session has ended.</h3>
      <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
        Start another run to configure a fresh task, write again, inspect new logs, and generate a new preview.
      </p>
      <Button type="button" className="mt-6 font-bold" onClick={onRestart}>
        <RotateCcw className="mr-2 h-4 w-4" />
        Do it again
      </Button>
    </div>
  );
}
