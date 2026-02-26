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

  const createDocument = useCallback(async (title: string, pdfFile?: File) => {
    try {
      // Create the document first
      const response = await apiClient.post('/documents', {
        title,
        content: {},
        status: 'draft',
      });
      const document = response.data.data.document;

      // If a PDF file is provided, upload it and link to the document
      if (pdfFile) {
        // Get or create user's default project
        const projectsResponse = await apiClient.get('/projects?limit=1');
        let projectId: string;

        if (projectsResponse.data.data && projectsResponse.data.data.length > 0) {
          // Use first project
          projectId = projectsResponse.data.data[0].id;
        } else {
          // Create a default project
          const newProjectResponse = await apiClient.post('/projects', {
            name: 'Default Project',
            description: 'Auto-created project for document reviews',
          });
          projectId = newProjectResponse.data.data.project.id;
        }

        const formData = new FormData();
        formData.append('pdf', pdfFile);
        formData.append('title', title);
        formData.append('authors', JSON.stringify([]));
        formData.append('abstract', '');
        formData.append('keywords', JSON.stringify([]));
        formData.append('documentId', document.id);

        await apiClient.post(`/projects/${projectId}/papers`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await fetchDocuments();
      return document;
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
