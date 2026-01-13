import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Document, DocumentEvent } from '@humory/shared';

export function useDocument(documentId: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDocument = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get(`/documents/${documentId}`);
      setDocument(response.data.data?.document || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch document');
      console.error('Error fetching document:', err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (documentId) {
      fetchDocument();
    }
  }, [documentId, fetchDocument]);

  const updateDocument = useCallback(async (
    content: Record<string, any>,
    plainText: string
  ) => {
    try {
      setIsSaving(true);
      const response = await apiClient.put(`/documents/${documentId}`, {
        content,
        plainText,
      });
      setDocument(response.data.data?.document || null);
      return response.data.data?.document;
    } catch (err: any) {
      console.error('Error updating document:', err);
      throw new Error(err.response?.data?.message || 'Failed to update document');
    } finally {
      setIsSaving(false);
    }
  }, [documentId]);

  const trackEvents = useCallback(async (events: Partial<DocumentEvent>[]) => {
    try {
      await apiClient.post(`/documents/${documentId}/events`, { events });
    } catch (err: any) {
      console.error('Error tracking events:', err);
    }
  }, [documentId]);

  return {
    document,
    isLoading,
    error,
    isSaving,
    updateDocument,
    trackEvents,
    refetch: fetchDocument,
  };
}
