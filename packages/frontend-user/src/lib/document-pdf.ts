import { apiClient } from '@/lib/api-client';

const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024;

export function validatePdfFile(file: File) {
  if (file.type !== 'application/pdf') {
    throw new Error('Please select a PDF file');
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error('PDF must be smaller than 50MB');
  }
}

async function getOrCreateDefaultProjectId() {
  const projectsResponse = await apiClient.get('/projects?limit=1');

  if (projectsResponse.data.data && projectsResponse.data.data.length > 0) {
    return projectsResponse.data.data[0].id as string;
  }

  const newProjectResponse = await apiClient.post('/projects', {
    name: 'Default Project',
    description: 'Auto-created project for document reviews',
  });

  return newProjectResponse.data.data.project.id as string;
}

export async function uploadPdfForDocument(documentId: string, title: string, pdfFile: File) {
  validatePdfFile(pdfFile);

  const projectId = await getOrCreateDefaultProjectId();
  const formData = new FormData();

  formData.append('pdf', pdfFile);
  formData.append('title', title);
  formData.append('authors', JSON.stringify([]));
  formData.append('abstract', '');
  formData.append('keywords', JSON.stringify([]));
  formData.append('documentId', documentId);

  await apiClient.post(`/projects/${projectId}/papers`, formData);
}

export { MAX_PDF_SIZE_BYTES };
