'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Clock,
  User,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Calendar,
  Loader2,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import api, { ApiError } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface SessionEvent {
  id: string;
  eventType: string;
  timestamp: string;
  targetElement: string | null;
  keyCode: string | null;
  keyChar: string | null;
  textBefore: string | null;
  textAfter: string | null;
  cursorPosition: number | null;
  selectionStart: number | null;
  selectionEnd: number | null;
  metadata: any;
}

interface SessionDetail {
  id: string;
  projectId: string;
  externalUserId: string;
  sessionStart: string;
  sessionEnd: string | null;
  submitted: boolean;
  submissionTime: string | null;
  durationSeconds: number;
  eventCount: number;
  events: SessionEvent[];
}

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch session details
  const fetchSessionDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get<{
        success: boolean;
        data: SessionDetail;
      }>(`/api/v1/projects/${projectId}/analytics/sessions/${sessionId}`);
      setSession(response.data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || 'Failed to load session details');
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && sessionId) {
      fetchSessionDetails();
    }
  }, [projectId, sessionId]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Format date time
  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Format timestamp (for event timeline)
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  // Get event type badge color
  const getEventTypeBadge = (eventType: string) => {
    const colors: Record<string, string> = {
      keydown: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
      keyup: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
      paste: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
      copy: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
      cut: 'bg-red-500/10 text-red-500 hover:bg-red-500/20',
      focus: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20',
      blur: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20',
      input: 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20',
      select: 'bg-teal-500/10 text-teal-500 hover:bg-teal-500/20',
      delete: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500/20',
    };

    return colors[eventType] || 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading session details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !session) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push(`/projects/${projectId}/analytics`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Analytics
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading session</AlertTitle>
          <AlertDescription>{error || 'Session not found'}</AlertDescription>
        </Alert>
        <Button onClick={fetchSessionDetails} variant="outline">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button
            variant="ghost"
            onClick={() => router.push(`/projects/${projectId}/analytics`)}
            className="mb-2 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Analytics
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Session Details</h1>
          <p className="text-muted-foreground font-mono text-sm">{session.id}</p>
        </div>
        <Badge variant={session.submitted ? 'default' : 'secondary'} className="h-8">
          {session.submitted ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Completed
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4 mr-1" />
              Incomplete
            </>
          )}
        </Badge>
      </div>

      {/* Session Metadata Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User ID</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-mono truncate" title={session.externalUserId}>
              {session.externalUserId}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(session.durationSeconds)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {session.durationSeconds.toLocaleString()} seconds
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{session.eventCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {session.events.length} events loaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Start</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{formatDateTime(session.sessionStart)}</div>
            {session.sessionEnd && (
              <p className="text-xs text-muted-foreground mt-1">
                Ended: {formatDateTime(session.sessionEnd)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Submission Info */}
      {session.submitted && session.submissionTime && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-sm flex items-center">
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              Session Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Submitted on {formatDateTime(session.submissionTime)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Events Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
          <CardDescription>
            Chronological list of all events captured in this session
          </CardDescription>
        </CardHeader>
        <CardContent>
          {session.events.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No events recorded</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">#</TableHead>
                    <TableHead className="w-[140px]">Time</TableHead>
                    <TableHead className="w-[120px]">Event Type</TableHead>
                    <TableHead>Target Element</TableHead>
                    <TableHead className="w-[100px]">Key</TableHead>
                    <TableHead className="w-[100px]">Cursor</TableHead>
                    <TableHead className="w-[120px]">Text Length</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {session.events.map((event, index) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatTimestamp(event.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getEventTypeBadge(event.eventType)}>
                          {event.eventType}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[300px] truncate" title={event.targetElement || ''}>
                        {event.targetElement || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.keyChar || event.keyCode || '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {event.cursorPosition !== null ? event.cursorPosition : '-'}
                        {event.selectionStart !== null && event.selectionEnd !== null &&
                         event.selectionStart !== event.selectionEnd && (
                          <span className="text-muted-foreground ml-1">
                            ({event.selectionStart}-{event.selectionEnd})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {event.textAfter !== null ? event.textAfter.length : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event Type Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Event Type Summary</CardTitle>
            <CardDescription>Breakdown of events by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(
                session.events.reduce((acc, event) => {
                  acc[event.eventType] = (acc[event.eventType] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort(([, a], [, b]) => b - a)
                .map(([eventType, count]) => (
                  <div key={eventType} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getEventTypeBadge(eventType)}>
                        {eventType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{count}</span>
                      <span className="text-xs text-muted-foreground">
                        ({((count / session.events.length) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Session Metadata</CardTitle>
            <CardDescription>Additional session information</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Session ID:</dt>
                <dd className="font-mono text-xs">{session.id.slice(0, 8)}...</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Project ID:</dt>
                <dd className="font-mono text-xs">{session.projectId.slice(0, 8)}...</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status:</dt>
                <dd>
                  <Badge variant={session.submitted ? 'default' : 'secondary'}>
                    {session.submitted ? 'Completed' : 'Incomplete'}
                  </Badge>
                </dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Events Captured:</dt>
                <dd className="font-mono">{session.eventCount}</dd>
              </div>
              <Separator />
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Avg Events/Min:</dt>
                <dd className="font-mono">
                  {session.durationSeconds > 0
                    ? ((session.eventCount / session.durationSeconds) * 60).toFixed(1)
                    : '0'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
