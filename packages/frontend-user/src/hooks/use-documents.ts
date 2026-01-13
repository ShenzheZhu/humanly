import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import type { Document, DocumentListResponse } from '@humory/shared';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get<any>('/documents');
      // Backend returns documents directly in data array
      const docs = Array.isArray(response.data.data) ? response.data.data : [];
      setDocuments(docs);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch documents');
      setDocuments([]); // Set empty array on error
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const createDocument = useCallback(async (title: string) => {
    try {
      const response = await apiClient.post('/documents', {
        title,
        content: {},
        status: 'draft',
      });
      await fetchDocuments();
      return response.data.data.document;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to create document');
    }
  }, [fetchDocuments]);

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      await apiClient.delete(`/documents/${documentId}`);
      await fetchDocuments();
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Failed to delete document');
    }
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    error,
    fetchDocuments,
    createDocument,
    deleteDocument,
  };
}
