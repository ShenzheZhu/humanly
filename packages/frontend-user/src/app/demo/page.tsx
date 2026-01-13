'use client';

import { useState, useCallback, useMemo } from 'react';
import { LexicalEditor } from '@humory/editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Clock, Copy, FileText, Keyboard, MousePointer, Zap, Timer, AlertCircle, TrendingUp } from 'lucide-react';
import { BRAND } from '@humory/shared';
import type { TrackedEvent } from '@humory/editor';
import type { EventType } from '@humory/shared';

export default function DemoPage() {
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [content, setContent] = useState<any>(null);

  // Handle individual events in real-time
  const handleEventTracked = useCallback((event: TrackedEvent) => {
    setEvents((prev) => [...prev, event]);
  }, []);

  // Handle content changes
  const handleContentChange = useCallback((editorState: any, plainText: string) => {
    setContent({ editorState, plainText });
  }, []);

  // Calculate comprehensive statistics
  const stats = useMemo(() => {
    const keydownEvents = events.filter((e) => e.eventType === 'keydown');
    const pasteEvents = events.filter((e) => e.eventType === 'paste');
    const deleteEvents = events.filter((e) => e.eventType === 'delete');

    // Basic counts
    const totalEvents = events.length;
    const wordCount = content?.plainText?.trim().split(/\s+/).filter(Boolean).length || 0;
    const characterCount = content?.plainText?.length || 0;

    // Calculate WPM (Words Per Minute)
    let wpm = 0;
    if (events.length > 0 && keydownEvents.length > 0) {
      const firstEvent = events[events.length - 1];
      const lastEvent = events[0];
      const timeDiff = new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime();
      const minutes = timeDiff / 60000;
      if (minutes > 0) {
        wpm = Math.round((characterCount / 5) / minutes);
      }
    }

    // Calculate average time between keystrokes
    let avgTimeBetweenKeys = 0;
    if (keydownEvents.length > 1) {
      let totalTime = 0;
      for (let i = 0; i < keydownEvents.length - 1; i++) {
        const timeDiff = new Date(keydownEvents[i].timestamp).getTime() -
                        new Date(keydownEvents[i + 1].timestamp).getTime();
        totalTime += Math.abs(timeDiff);
      }
      avgTimeBetweenKeys = Math.round(totalTime / (keydownEvents.length - 1));
    }

    // Calculate pause count (pauses > 2 seconds)
    let pauseCount = 0;
    const sortedKeyEvents = [...keydownEvents].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    for (let i = 1; i < sortedKeyEvents.length; i++) {
      const timeDiff = new Date(sortedKeyEvents[i].timestamp).getTime() -
                      new Date(sortedKeyEvents[i - 1].timestamp).getTime();
      if (timeDiff > 2000) pauseCount++;
    }

    // Calculate deletion rate
    const deletionRate = characterCount > 0
      ? Math.round((deleteEvents.length / (keydownEvents.length + deleteEvents.length)) * 100)
      : 0;

    // Session duration
    let sessionDuration = 0;
    if (events.length > 0) {
      const firstEvent = events[events.length - 1];
      const lastEvent = events[0];
      sessionDuration = Math.round((new Date(lastEvent.timestamp).getTime() -
                                   new Date(firstEvent.timestamp).getTime()) / 1000);
    }

    return {
      totalEvents,
      keydownEvents: keydownEvents.length,
      pasteEvents: pasteEvents.length,
      copyEvents: events.filter((e) => e.eventType === 'copy').length,
      cutEvents: events.filter((e) => e.eventType === 'cut').length,
      deleteEvents: deleteEvents.length,
      selectEvents: events.filter((e) => e.eventType === 'select').length,
      wordCount,
      characterCount,
      wpm,
      avgTimeBetweenKeys,
      pauseCount,
      deletionRate,
      sessionDuration,
    };
  }, [events, content]);

  // Format timestamp
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  // Get event type badge color
  const getEventBadgeColor = (eventType: EventType) => {
    const colors: Record<string, string> = {
      keydown: 'bg-blue-100 text-blue-800',
      keyup: 'bg-blue-100 text-blue-800',
      input: 'bg-blue-100 text-blue-800',
      paste: 'bg-purple-100 text-purple-800',
      copy: 'bg-orange-100 text-orange-800',
      cut: 'bg-orange-100 text-orange-800',
      delete: 'bg-red-100 text-red-800',
      select: 'bg-green-100 text-green-800',
      focus: 'bg-gray-100 text-gray-800',
      blur: 'bg-gray-100 text-gray-800',
      // Text formatting
      'font-family-change': 'bg-pink-100 text-pink-800',
      'font-size-change': 'bg-pink-100 text-pink-800',
      'text-color-change': 'bg-pink-100 text-pink-800',
      'highlight-color-change': 'bg-pink-100 text-pink-800',
      'bold': 'bg-pink-100 text-pink-800',
      'italic': 'bg-pink-100 text-pink-800',
      'underline': 'bg-pink-100 text-pink-800',
      'strikethrough': 'bg-pink-100 text-pink-800',
      'code': 'bg-pink-100 text-pink-800',
      'subscript': 'bg-pink-100 text-pink-800',
      'superscript': 'bg-pink-100 text-pink-800',
      'clear-formatting': 'bg-pink-100 text-pink-800',
      // Headings
      'heading-change': 'bg-indigo-100 text-indigo-800',
      // Lists
      'list-create': 'bg-yellow-100 text-yellow-800',
      'list-delete': 'bg-yellow-100 text-yellow-800',
      'list-indent': 'bg-yellow-100 text-yellow-800',
      'list-outdent': 'bg-yellow-100 text-yellow-800',
      'list-item-check': 'bg-yellow-100 text-yellow-800',
      // Alignment and layout
      'alignment-change': 'bg-teal-100 text-teal-800',
      'line-spacing-change': 'bg-teal-100 text-teal-800',
      'indent-change': 'bg-teal-100 text-teal-800',
    };
    return colors[eventType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{BRAND.name} Live Demo</h1>
              <p className="text-sm text-muted-foreground">
                Experience real-time keystroke tracking and authorship verification
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              Demo Mode - Nothing is saved
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Editor */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Editor
                </CardTitle>
                <CardDescription>
                  Start typing to see real-time tracking in action
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LexicalEditor
                  documentId="demo"
                  userId="demo-user"
                  initialContent={undefined}
                  placeholder="Start typing your document here... Every keystroke is tracked!"
                  trackingEnabled={true}
                  autoSaveEnabled={false}
                  onContentChange={handleContentChange}
                  onEventTracked={handleEventTracked}
                  className="min-h-[400px] border rounded-md p-4"
                />
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Analytics
                </CardTitle>
                <CardDescription>Real-time behavioral analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {/* Content Metrics */}
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{stats.wordCount}</div>
                      <div className="text-xs text-muted-foreground">Words</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{stats.characterCount}</div>
                      <div className="text-xs text-muted-foreground">Characters</div>
                    </div>
                  </div>

                  {/* Speed Metrics */}
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.wpm}</div>
                      <div className="text-xs text-muted-foreground">WPM</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xl font-bold">{stats.avgTimeBetweenKeys}ms</div>
                      <div className="text-xs text-muted-foreground">Avg Key Time</div>
                    </div>
                  </div>

                  {/* Event Counts */}
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Keyboard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{stats.keydownEvents}</div>
                      <div className="text-xs text-muted-foreground">Keystrokes</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Activity className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{stats.totalEvents}</div>
                      <div className="text-xs text-muted-foreground">Total Events</div>
                    </div>
                  </div>

                  {/* Behavior Metrics */}
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                    <Copy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.pasteEvents}</div>
                      <div className="text-xs text-muted-foreground">Pastes</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <div>
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.deleteEvents}</div>
                      <div className="text-xs text-muted-foreground">Deletions</div>
                    </div>
                  </div>

                  {/* Advanced Metrics */}
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Timer className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{stats.pauseCount}</div>
                      <div className="text-xs text-muted-foreground">Pauses &gt;2s</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-xl font-bold">{stats.sessionDuration}s</div>
                      <div className="text-xs text-muted-foreground">Session Time</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <div>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.deletionRate}%</div>
                      <div className="text-xs text-muted-foreground">Deletion Rate</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <MousePointer className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-2xl font-bold">{stats.selectEvents}</div>
                      <div className="text-xs text-muted-foreground">Selections</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Logs */}
          <div className="space-y-6">
            <Card className="h-[calc(100vh-12rem)] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Live Event Log
                </CardTitle>
                <CardDescription>
                  Real-time tracking of all your interactions
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden">
                <Tabs defaultValue="all" className="h-full flex flex-col">
                  <TabsList className="flex-shrink-0">
                    <TabsTrigger value="all">
                      All ({stats.totalEvents})
                    </TabsTrigger>
                    <TabsTrigger value="keydown">
                      Keys ({stats.keydownEvents})
                    </TabsTrigger>
                    <TabsTrigger value="paste">
                      Paste ({stats.pasteEvents})
                    </TabsTrigger>
                    <TabsTrigger value="other">
                      Other
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="flex-1 overflow-auto mt-4">
                    {events.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <div className="text-center">
                          <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                          <p>Start typing to see events appear here</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {events.slice().reverse().map((event, index) => {
                          const textChanged = event.textBefore !== event.textAfter;
                          const textDiff = textChanged ? (event.textAfter?.length || 0) - (event.textBefore?.length || 0) : 0;

                          return (
                            <div
                              key={events.length - index}
                              className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={getEventBadgeColor(event.eventType)}>
                                  {event.eventType}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(event.timestamp)}
                                </span>
                              </div>
                              <div className="text-sm space-y-1">
                                {event.keyChar && (
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground font-medium">Key:</span>
                                    <span className="font-mono bg-muted px-1 rounded">{event.keyChar}</span>
                                  </div>
                                )}

                                {textChanged && event.textAfter && (
                                  <div className="space-y-1">
                                    <div className="flex gap-2 items-start">
                                      <span className="text-muted-foreground font-medium whitespace-nowrap">Text:</span>
                                      <span className="font-mono text-xs break-all line-clamp-2">
                                        {event.textAfter.substring(Math.max(0, event.textAfter.length - 100))}
                                      </span>
                                    </div>
                                    {textDiff !== 0 && (
                                      <div className="flex gap-2">
                                        <span className="text-muted-foreground font-medium">Change:</span>
                                        <span className={`font-mono text-xs ${textDiff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                          {textDiff > 0 ? '+' : ''}{textDiff} chars
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {event.cursorPosition !== undefined && (
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground font-medium">Cursor:</span>
                                    <span className="font-mono text-xs">{event.cursorPosition}</span>
                                  </div>
                                )}

                                {event.selectionStart !== event.selectionEnd && (
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground font-medium">Selection:</span>
                                    <span className="font-mono text-xs">
                                      {event.selectionStart} - {event.selectionEnd} ({(event.selectionEnd || 0) - (event.selectionStart || 0)} chars)
                                    </span>
                                  </div>
                                )}

                                {event.metadata && Object.keys(event.metadata).length > 0 && (
                                  <div className="flex gap-2 items-start">
                                    <span className="text-muted-foreground font-medium whitespace-nowrap">
                                      {event.eventType.includes('format') || event.eventType.includes('heading') ||
                                       event.eventType.includes('list') || event.eventType.includes('alignment')
                                        ? 'Format:' : 'Info:'}
                                    </span>
                                    <span className="text-xs">
                                      {event.eventType === 'heading-change' && (
                                        <span>
                                          {event.metadata.previousHeadingLevel ? `H${event.metadata.previousHeadingLevel}` : 'Normal'} → {event.metadata.headingLevel ? `H${event.metadata.headingLevel}` : 'Normal'}
                                        </span>
                                      )}
                                      {event.eventType === 'font-family-change' && (
                                        <span>Font: {event.metadata.fontFamily}</span>
                                      )}
                                      {event.eventType === 'font-size-change' && (
                                        <span>Size: {event.metadata.fontSize}</span>
                                      )}
                                      {event.eventType === 'text-color-change' && (
                                        <span>Color: {event.metadata.textColor}</span>
                                      )}
                                      {event.eventType === 'highlight-color-change' && (
                                        <span>Highlight: {event.metadata.highlightColor}</span>
                                      )}
                                      {event.eventType === 'list-create' && (
                                        <span>Created {event.metadata.listType} list</span>
                                      )}
                                      {event.eventType === 'alignment-change' && (
                                        <span>{event.metadata.previousAlignment || 'left'} → {event.metadata.alignment}</span>
                                      )}
                                      {(event.eventType === 'bold' || event.eventType === 'italic' ||
                                        event.eventType === 'underline' || event.eventType === 'strikethrough' ||
                                        event.eventType === 'code' || event.eventType === 'subscript' ||
                                        event.eventType === 'superscript') && (
                                        <span>
                                          Applied {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                                          {event.metadata.selectedText && ` to "${event.metadata.selectedText.substring(0, 30)}${event.metadata.selectedText.length > 30 ? '...' : ''}"`}
                                        </span>
                                      )}
                                      {!event.eventType.includes('format') && !event.eventType.includes('heading') &&
                                       !event.eventType.includes('list') && !event.eventType.includes('alignment') &&
                                       !['bold', 'italic', 'underline', 'strikethrough', 'code', 'subscript', 'superscript'].includes(event.eventType) && (
                                        <span className="font-mono text-muted-foreground">
                                          {JSON.stringify(event.metadata, null, 2).substring(0, 100)}
                                          {JSON.stringify(event.metadata).length > 100 && '...'}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="keydown" className="flex-1 overflow-auto mt-4">
                    <div className="space-y-2">
                      {events
                        .filter((e) => e.eventType === 'keydown')
                        .slice()
                        .reverse()
                        .map((event, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={getEventBadgeColor(event.eventType)}>
                                {event.eventType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(event.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <span className="font-mono">{event.keyChar || 'Unknown'}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="paste" className="flex-1 overflow-auto mt-4">
                    <div className="space-y-2">
                      {events
                        .filter((e) => e.eventType === 'paste')
                        .slice()
                        .reverse()
                        .map((event, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={getEventBadgeColor(event.eventType)}>
                                {event.eventType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(event.timestamp)}
                              </span>
                            </div>
                            <div className="text-sm">
                              <div className="flex gap-2">
                                <span className="text-muted-foreground">Length:</span>
                                <span className="font-mono">
                                  {(event.textAfter?.length || 0) - (event.textBefore?.length || 0)} chars
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="other" className="flex-1 overflow-auto mt-4">
                    <div className="space-y-2">
                      {events
                        .filter((e) => !['keydown', 'paste'].includes(e.eventType))
                        .slice()
                        .reverse()
                        .map((event, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge className={getEventBadgeColor(event.eventType)}>
                                {event.eventType}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatTime(event.timestamp)}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
