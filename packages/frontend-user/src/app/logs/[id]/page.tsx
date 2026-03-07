'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Clock, Keyboard, Copy, MousePointer, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { format } from 'date-fns';
import type { DocumentEvent } from '@humory/shared';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  keydown: <Keyboard className="h-3 w-3" />,
  keyup: <Keyboard className="h-3 w-3" />,
  paste: <Copy className="h-3 w-3" />,
  copy: <Copy className="h-3 w-3" />,
  cut: <Copy className="h-3 w-3" />,
  click: <MousePointer className="h-3 w-3" />,
  focus: <MousePointer className="h-3 w-3" />,
  blur: <MousePointer className="h-3 w-3" />,
  input: <Type className="h-3 w-3" />,
};

const EVENT_COLORS: Record<string, string> = {
  keydown: 'bg-blue-100 text-blue-800',
  keyup: 'bg-blue-50 text-blue-600',
  paste: 'bg-yellow-100 text-yellow-800',
  copy: 'bg-orange-100 text-orange-800',
  cut: 'bg-red-100 text-red-800',
  click: 'bg-purple-100 text-purple-800',
  focus: 'bg-green-100 text-green-800',
  blur: 'bg-gray-100 text-gray-600',
  input: 'bg-teal-100 text-teal-800',
};

export default function DocumentLogsPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const { checkAuth } = useAuthStore();

  const [documentTitle, setDocumentTitle] = useState<string>('Document');
  const [events, setEvents] = useState<DocumentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const fetchEvents = useCallback(async (currentOffset: number) => {
    try {
      setIsLoading(true);
      setError(null);

      const [docRes, eventsRes] = await Promise.all([
        apiClient.get(`/documents/${documentId}`),
        apiClient.get(`/documents/${documentId}/events?limit=${LIMIT}&offset=${currentOffset}`),
      ]);

      setDocumentTitle(docRes.data.data?.document?.title || 'Document');
      const eventsData = eventsRes.data.data?.events || eventsRes.data.data || [];
      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setTotal(eventsRes.data.data?.total ?? eventsData.length);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load logs');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchEvents(offset);
  }, [fetchEvents, offset]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/documents/${documentId}`)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div>
          <h1 className="font-semibold text-sm">{documentTitle}</h1>
          <p className="text-xs text-muted-foreground">Keystroke Logs</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Event Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Total recorded events: <span className="font-medium text-foreground">{total}</span>
            </p>
          </CardContent>
        </Card>

        {/* Events list */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading logs...</div>
        ) : error ? (
          <div className="text-center py-12 text-destructive text-sm">{error}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No events recorded yet.</div>
        ) : (
          <>
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2 w-40">Time</th>
                    <th className="text-left px-4 py-2 w-32">Event</th>
                    <th className="text-left px-4 py-2">Key / Detail</th>
                    <th className="text-left px-4 py-2 w-24">Cursor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 text-xs text-muted-foreground font-mono">
                        {format(new Date(event.timestamp), 'HH:mm:ss.SSS')}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${EVENT_COLORS[event.eventType] ?? 'bg-gray-100 text-gray-700'}`}>
                          {EVENT_ICONS[event.eventType] ?? null}
                          {event.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {event.keyChar
                          ? <span className="bg-muted px-1 rounded">{event.keyChar}</span>
                          : event.keyCode
                          ? <span className="text-muted-foreground">{event.keyCode}</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {event.cursorPosition ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {total > LIMIT && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + LIMIT >= total}
                    onClick={() => setOffset(offset + LIMIT)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
