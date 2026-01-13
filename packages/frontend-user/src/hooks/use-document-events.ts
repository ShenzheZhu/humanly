import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { DocumentEvent } from '@humory/shared';

export interface DocumentEventsFilters {
  eventType?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export function useDocumentEvents(documentId: string, filters?: DocumentEventsFilters) {
  const [events, setEvents] = useState<DocumentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const fetchEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (filters?.eventType) params.append('eventType', filters.eventType);
      if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.offset) params.append('offset', filters.offset.toString());

      const queryString = params.toString();
      const url = `/documents/${documentId}/events${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<any>(url);

      // Handle response structure
      // API returns: { success: true, data: { events: [...] }, count: N }
      const eventsData = response.data.data?.events || [];
      const totalCount = response.data.count || eventsData.length;

      setEvents(eventsData);
      setTotal(totalCount);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch events');
      setEvents([]);
      console.error('Error fetching events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId, filters?.eventType, filters?.startDate, filters?.endDate, filters?.limit, filters?.offset]);

  useEffect(() => {
    if (documentId) {
      fetchEvents();
    }
  }, [documentId, fetchEvents]);

  const exportEvents = useCallback((format: 'json' | 'csv') => {
    if (events.length === 0) return;

    if (format === 'json') {
      const dataStr = JSON.stringify(events, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document-events-${documentId}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const headers = ['Timestamp', 'Event Type', 'Text Before', 'Text After', 'Cursor Position'];
      const rows = events.map(event => [
        new Date(event.timestamp).toISOString(),
        event.eventType,
        event.textBefore || '',
        event.textAfter || '',
        event.cursorPosition?.toString() || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const dataBlob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `document-events-${documentId}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [events, documentId]);

  return {
    events,
    isLoading,
    error,
    total,
    refetch: fetchEvents,
    exportEvents,
  };
}
