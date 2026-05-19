import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DocumentEditorPage from '@/app/documents/[id]/page';
import DocumentLogsPage from '@/app/logs/[id]/page';

const mockPush = jest.fn();
const mockUseParams = jest.fn(() => ({ id: 'doc-1' }));
const mockToast = jest.fn();
const mockTrackEvents = jest.fn();
const mockApiGet = jest.fn();
const mockApiPost = jest.fn();
const mockUpdateDocument = jest.fn();
let mockDocumentEnvironmentConfig: any = { aiAccess: 'off', copyPastePolicy: 'allowed' };
let mockLatestEditorProps: any;

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockUseParams(),
}));

jest.mock('next/dynamic', () => () => function DynamicMock() {
  return <div>PDF viewer unavailable in unit tests</div>;
});

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

jest.mock('@/hooks/use-document', () => ({
  useDocument: () => ({
    document: {
      id: 'doc-1',
      title: 'Workflow Document',
      content: {},
      plainText: '',
      status: 'draft',
      wordCount: 0,
      characterCount: 0,
      environmentConfig: mockDocumentEnvironmentConfig,
    },
    linkedFile: null,
    isLoading: false,
    error: null,
    isSaving: false,
    updateDocument: mockUpdateDocument,
    trackEvents: mockTrackEvents,
    uploadPdf: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-certificates', () => ({
  useCertificates: () => ({
    generateCertificate: jest.fn(),
  }),
}));

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({
    user: { id: 'user-1', email: 'user@example.com' },
    checkAuth: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-ai', () => ({
  useAI: () => ({
    isPanelOpen: false,
    togglePanel: jest.fn(),
    closePanel: jest.fn(),
  }),
}));

jest.mock('@/stores/ai-store', () => ({
  useAIStore: (selector: any) => selector({
    openPanelWithQuote: jest.fn(),
  }),
}));

jest.mock('@/components/ai', () => ({
  AIAssistantButton: () => null,
  AIAssistantPanel: () => null,
  AISelectionMenu: () => null,
}));

jest.mock('@/components/certificates/certificate-generation-dialog', () => ({
  CertificateGenerationDialog: () => null,
}));

jest.mock('@/lib/document-pdf', () => ({
  validatePdfFile: jest.fn(() => null),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: any[]) => mockApiGet(...args),
    post: (...args: any[]) => mockApiPost(...args),
    put: jest.fn(),
  },
  TokenManager: {
    getAccessToken: jest.fn(() => 'token'),
  },
}));

jest.mock('@humanly/editor', () => ({
  LexicalEditor: (props: any) => {
    mockLatestEditorProps = props;
    const { onContentChange, onEventsBuffer, onAutoSave, placeholder } = props;
    return (
      <textarea
        aria-label="Document editor"
        placeholder={placeholder}
        onChange={(event) => {
          const plainText = event.currentTarget.value;
          const content = { root: { children: [{ text: plainText }] } };
          onContentChange?.(content, plainText);
          onAutoSave?.(content, plainText);
          onEventsBuffer?.([
            {
              eventType: 'input',
              timestamp: new Date().toISOString(),
              keyChar: plainText.at(-1) || '',
            },
          ]);
        }}
      />
    );
  },
}));

describe('editor and logs workflows', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockToast.mockClear();
    mockTrackEvents.mockClear();
    mockUpdateDocument.mockReset();
    mockUpdateDocument.mockResolvedValue(undefined);
    mockDocumentEnvironmentConfig = { aiAccess: 'off', copyPastePolicy: 'allowed' };
    mockLatestEditorProps = undefined;
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockUseParams.mockReturnValue({ id: 'doc-1' });

    mockApiGet.mockImplementation(async (path: string) => {
      if (path === '/tasks/my-enrollments') {
        return { data: { data: { enrollments: [] } } };
      }
      if (path === '/documents/doc-1') {
        return { data: { data: { document: { title: 'Workflow Document' } } } };
      }
      if (path === '/documents/doc-1/events?limit=100&offset=0') {
        return {
          data: {
            count: 40,
            data: {
              events: [{
                id: 'event-1',
                eventType: 'input',
                timestamp: '2026-05-14T12:00:00.000Z',
                keyChar: 'Q',
              }],
            },
          },
        };
      }
      if (path === '/ai/logs?documentId=doc-1&limit=50&offset=0') {
        return { data: { data: [] } };
      }
      throw new Error(`Unexpected GET ${path}`);
    });
  });

  it('accepts editor typing and sends buffered document events', async () => {
    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/document editor/i), {
      target: { value: 'QA editor text' },
    });

    await waitFor(() => {
      expect(mockTrackEvents).toHaveBeenCalledWith(
        [expect.objectContaining({ eventType: 'input' })],
        null
      );
    });
    expect(screen.queryByText(/failed to fetch|document not found|application error/i)).not.toBeInTheDocument();
  });

  it('uses a short editor autosave window and persists changed content', async () => {
    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/document editor/i), {
      target: { value: 'Short autosave QA text' },
    });

    expect(mockLatestEditorProps.autoSaveEnabled).toBe(true);
    expect(mockLatestEditorProps.autoSaveInterval).toBeLessThanOrEqual(2000);
    await waitFor(() => {
      expect(mockUpdateDocument).toHaveBeenCalledWith(
        expect.objectContaining({ root: expect.any(Object) }),
        'Short autosave QA text'
      );
    });
  });

  it('shows a configured writing time limit in the editor header', async () => {
    mockDocumentEnvironmentConfig = {
      aiAccess: 'off',
      copyPastePolicy: 'allowed',
      aiUsageLimit: { mode: 'time_restricted' },
      time: {
        lateSubmission: 'allowed',
        timeLimitSeconds: 60,
      },
    };

    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    expect(screen.getByTitle('Time limit: 1:00')).toBeInTheDocument();
  });

  it('shows persisted document event count in the logs view', async () => {
    render(<DocumentLogsPage />);

    expect(await screen.findByText('Event Summary')).toBeInTheDocument();
    expect(await screen.findByText('40')).toBeInTheDocument();
    expect(await screen.findByText('input')).toBeInTheDocument();
    expect(screen.queryByText(/failed to load logs/i)).not.toBeInTheDocument();
  });
});
