'use client';

import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Keyboard,
  MousePointer,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import type {
  AIInteractionLog,
  DocumentEventTimelineItem,
  DocumentEventTimelineRawEvent,
  DocumentEventTimelineSummary,
} from '@humanly/shared';

const EMPTY_SUMMARY: DocumentEventTimelineSummary = {
  rawEventTotal: 0,
  timelineItemTotal: 0,
  typingBursts: 0,
  typedCharacters: 0,
  typedWords: 0,
  pasteCharacters: 0,
  deletedCharacters: 0,
};

const TIMELINE_COLORS: Record<DocumentEventTimelineItem['kind'], string> = {
  typing_burst: 'bg-teal-100 text-teal-800',
  paste: 'bg-yellow-100 text-yellow-800',
  delete: 'bg-red-100 text-red-800',
  event: 'bg-gray-100 text-gray-700',
};

const TIMELINE_ICONS: Record<DocumentEventTimelineItem['kind'], ReactNode> = {
  typing_burst: <Type className="h-3 w-3" />,
  paste: <Copy className="h-3 w-3" />,
  delete: <Trash2 className="h-3 w-3" />,
  event: <MousePointer className="h-3 w-3" />,
};

const AI_ACTION_LABELS: Record<string, string> = {
  grammar_check: 'Fix grammar',
  rewrite: 'Rewrite',
  other: 'Chat',
};

type HistoryItem =
  | {
      kind: 'timeline';
      id: string;
      timestamp: string | Date;
      item: DocumentEventTimelineItem;
    }
  | {
      kind: 'ai';
      id: string;
      timestamp: string | Date;
      log: AIInteractionLog;
    };

function getSelectionText(log: AIInteractionLog) {
  return log.modifications?.[0]?.before || log.contextSnapshot?.selection?.text || '';
}

function getSuggestedText(log: AIInteractionLog) {
  return log.modifications?.[0]?.after || log.response || '';
}

function getAILogLabel(log: AIInteractionLog) {
  if (log.queryType === 'grammar_check') return 'Fix grammar';
  if (log.queryType === 'other') return 'Chat';
  if (log.query.toLowerCase().includes('simplify')) return 'Simplify';
  if (log.query.toLowerCase().includes('formal')) return 'Make formal';
  if (log.query.toLowerCase().includes('improve')) return 'Improve writing';
  return AI_ACTION_LABELS[log.queryType] || log.queryType;
}

function formatTimeRange(item: DocumentEventTimelineItem) {
  const start = new Date(item.startTimestamp);
  const end = new Date(item.endTimestamp);
  const startText = format(start, 'HH:mm:ss.SSS');
  const endText = format(end, 'HH:mm:ss.SSS');
  return startText === endText ? startText : `${startText} - ${endText}`;
}

function formatSnippet(text?: string, fallback = 'No text detail') {
  if (!text) return fallback;
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (!singleLine) return fallback;
  return singleLine.length > 160 ? `${singleLine.slice(0, 160)}...` : singleLine;
}

function getTimelineDetail(item: DocumentEventTimelineItem) {
  if (item.kind === 'typing_burst') {
    return `Typed "${formatSnippet(item.text, '')}"`;
  }

  if (item.kind === 'paste') {
    return `Pasted "${formatSnippet(item.text, '')}"`;
  }

  if (item.kind === 'delete') {
    return item.text ? `Deleted "${formatSnippet(item.text, '')}"` : 'Deleted text';
  }

  return formatSnippet(item.text, item.label);
}

function getCursorRange(item: DocumentEventTimelineItem) {
  if (item.cursorStart === undefined && item.cursorEnd === undefined) return '—';
  if (item.cursorStart === undefined) return String(item.cursorEnd);
  if (item.cursorEnd === undefined || item.cursorStart === item.cursorEnd) {
    return String(item.cursorStart);
  }
  return `${item.cursorStart}-${item.cursorEnd}`;
}

function getRawDetail(event: DocumentEventTimelineRawEvent) {
  if (event.insertedText) return `Inserted "${formatSnippet(event.insertedText, '')}"`;
  if (event.deletedText) return `Deleted "${formatSnippet(event.deletedText, '')}"`;
  if (event.keyChar) return `Key "${event.keyChar}"`;
  if (event.keyCode) return event.keyCode;
  return '—';
}

export default function DocumentLogsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const { checkAuth } = useAuthStore();

  const [documentTitle, setDocumentTitle] = useState<string>('Document');
  const [timelineItems, setTimelineItems] = useState<DocumentEventTimelineItem[]>([]);
  const [timelineSummary, setTimelineSummary] = useState<DocumentEventTimelineSummary>(EMPTY_SUMMARY);
  const [aiLogs, setAiLogs] = useState<AIInteractionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [docRes, timelineRes, aiLogsRes] = await Promise.all([
        apiClient.get(`/documents/${documentId}`),
        apiClient.get(`/documents/${documentId}/events/timeline?limit=10000`),
        apiClient
          .get(`/ai/logs?documentId=${documentId}&limit=50&offset=0`)
          .catch(() => ({ data: { data: [] } })),
      ]);

      setDocumentTitle(docRes.data.data?.document?.title || 'Document');

      const timelineData = timelineRes.data.data || {};
      setTimelineItems(Array.isArray(timelineData.items) ? timelineData.items : []);
      setTimelineSummary(timelineData.summary || EMPTY_SUMMARY);

      const aiLogData = aiLogsRes.data.data || [];
      setAiLogs(Array.isArray(aiLogData) ? aiLogData : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const visibleAILogs = useMemo(() => {
    return aiLogs.filter((log) => {
      const selectionText = getSelectionText(log);
      const suggestedText = getSuggestedText(log);

      if (!log.modificationsApplied && log.status === 'success' && selectionText && suggestedText) {
        const hasMirrorActionLog = aiLogs.some((candidate) => {
          if (candidate.id === log.id) return false;

          return (
            candidate.queryType === log.queryType &&
            getSelectionText(candidate) === selectionText &&
            getSuggestedText(candidate) === suggestedText &&
            (candidate.modificationsApplied || candidate.status === 'cancelled')
          );
        });

        if (hasMirrorActionLog) return false;
      }

      return true;
    });
  }, [aiLogs]);

  const historyItems = useMemo<HistoryItem[]>(() => {
    const items: HistoryItem[] = [
      ...timelineItems.map((item) => ({
        kind: 'timeline' as const,
        id: item.id,
        timestamp: item.timestamp,
        item,
      })),
      ...visibleAILogs.map((log) => ({
        kind: 'ai' as const,
        id: log.id,
        timestamp: log.timestamp,
        log,
      })),
    ];

    return items.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [timelineItems, visibleAILogs]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/documents/${documentId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="font-semibold text-sm">{documentTitle}</h1>
          <p className="text-xs text-muted-foreground">Document and AI Activity Timeline</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryMetric label="Raw events" value={timelineSummary.rawEventTotal} />
              <SummaryMetric label="Timeline items" value={timelineSummary.timelineItemTotal} />
              <SummaryMetric label="Typing bursts" value={timelineSummary.typingBursts} />
              <SummaryMetric label="Typed words" value={timelineSummary.typedWords} />
              <SummaryMetric label="Typed chars" value={timelineSummary.typedCharacters} />
              <SummaryMetric label="Paste chars" value={timelineSummary.pasteCharacters} />
              <SummaryMetric label="Deleted chars" value={timelineSummary.deletedCharacters} />
              <SummaryMetric label="AI actions" value={visibleAILogs.length} />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading logs...</div>
        ) : error ? (
          <div className="text-center py-12 text-destructive text-sm">{error}</div>
        ) : historyItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No events recorded yet.</div>
        ) : (
          <div className="rounded-md border bg-background">
            {historyItems.map((historyItem) => {
              if (historyItem.kind === 'timeline') {
                const item = historyItem.item;
                const isExpanded = expandedIds.has(item.id);

                return (
                  <div key={item.id} className="border-b last:border-b-0">
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30"
                      onClick={() => toggleExpanded(item.id)}
                    >
                      <span className="mt-1 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {formatTimeRange(item)}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${TIMELINE_COLORS[item.kind]}`}>
                            {TIMELINE_ICONS[item.kind]}
                            {item.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.rawEventCount} raw event{item.rawEventCount === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-sm text-foreground">
                          {getTimelineDetail(item)}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {item.wordCount !== undefined && <span>{item.wordCount} words</span>}
                          {item.charCount !== undefined && <span>{item.charCount} chars</span>}
                          <span>Cursor {getCursorRange(item)}</span>
                        </div>
                      </div>
                    </button>
                    {isExpanded && <RawEvents events={item.rawEvents} />}
                  </div>
                );
              }

              const { log } = historyItem;
              const isExpanded = expandedIds.has(log.id);
              const beforeText = getSelectionText(log);
              const afterText = getSuggestedText(log);
              const label = getAILogLabel(log);
              const isChatLog = log.queryType === 'other';
              const detailBeforeText = isChatLog ? log.query : beforeText;

              return (
                <Fragment key={log.id}>
                  <div className="border-b last:border-b-0">
                    <button
                      type="button"
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30"
                      onClick={() => toggleExpanded(log.id)}
                    >
                      <span className="mt-1 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                            <Sparkles className="h-3 w-3" />
                            {label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.modificationsApplied ? 'Applied' : log.status === 'cancelled' ? 'Discarded' : log.status}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-sm text-foreground">
                          {formatSnippet(detailBeforeText || log.query, 'AI interaction')}
                        </div>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t bg-muted/20 px-4 py-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                              {isChatLog ? 'Question' : 'Previous text'}
                            </p>
                            <div className="rounded border bg-background p-3 text-sm whitespace-pre-wrap">
                              {detailBeforeText || '—'}
                            </div>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                              {isChatLog ? 'AI response' : 'AI modified text'}
                            </p>
                            <div className="rounded border bg-background p-3 text-sm whitespace-pre-wrap">
                              {afterText || '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border bg-muted/20 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}

function RawEvents({ events }: { events: DocumentEventTimelineRawEvent[] }) {
  return (
    <div className="border-t bg-muted/20 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Keyboard className="h-3.5 w-3.5" />
        Raw events
      </div>
      <div className="overflow-hidden rounded border bg-background">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Time</th>
              <th className="px-3 py-2 text-left">Event</th>
              <th className="px-3 py-2 text-left">Detail</th>
              <th className="px-3 py-2 text-left">Cursor</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.map((event) => (
              <tr key={event.id}>
                <td className="px-3 py-2 font-mono text-muted-foreground">
                  {format(new Date(event.timestamp), 'HH:mm:ss.SSS')}
                </td>
                <td className="px-3 py-2">{event.eventType}</td>
                <td className="px-3 py-2">{getRawDetail(event)}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {event.cursorPosition ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
