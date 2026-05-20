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
let mockDocumentContent: any = {};
let mockTaskEnrollments: any[] = [];
let mockAiLogs: any[] = [];
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
      content: mockDocumentContent,
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
  AIAssistantButton: ({ onClick }: any) => (
    <button type="button" onClick={onClick}>AI Assistant</button>
  ),
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
    mockDocumentContent = {};
    mockTaskEnrollments = [];
    mockAiLogs = [];
    mockLatestEditorProps = undefined;
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockUseParams.mockReturnValue({ id: 'doc-1' });

    mockApiGet.mockImplementation(async (path: string) => {
      if (path === '/tasks/my-enrollments') {
        return { data: { data: { enrollments: mockTaskEnrollments } } };
      }
      if (path === '/tasks/enrollments/enroll-1/instruction-files') {
        return { data: { data: { files: [], file: null } } };
      }
      if (path === '/documents/doc-1') {
        return { data: { data: { document: { title: 'Workflow Document' } } } };
      }
      if (path === '/documents/doc-1/events/timeline?limit=10000') {
        return {
          data: {
            data: {
              summary: {
                rawEventTotal: 40,
                timelineItemTotal: 1,
                typingBursts: 1,
                typedCharacters: 11,
                typedWords: 2,
                pasteCharacters: 0,
                deletedCharacters: 0,
              },
              items: [
                {
                  id: 'typing-event-1',
                  kind: 'typing_burst',
                  label: 'Typed text',
                  timestamp: '2026-05-14T12:00:01.000Z',
                  startTimestamp: '2026-05-14T12:00:00.000Z',
                  endTimestamp: '2026-05-14T12:00:01.000Z',
                  text: 'hello world',
                  charCount: 11,
                  wordCount: 2,
                  cursorStart: 0,
                  cursorEnd: 11,
                  rawEventCount: 11,
                  rawEvents: [
                    {
                      id: 'event-raw-1',
                      eventType: 'input',
                      timestamp: '2026-05-14T12:00:00.000Z',
                      keyChar: 'h',
                      insertedText: 'h',
                      cursorPosition: 1,
                    },
                  ],
                },
              ],
            },
          },
        };
      }
      if (path === '/ai/logs?documentId=doc-1&limit=50&offset=0') {
        return { data: { data: mockAiLogs } };
      }
      throw new Error(`Unexpected GET ${path}`);
    });
    mockApiPost.mockImplementation(async (path: string) => {
      if (path === '/tasks/enrollments/enroll-1/submission-sessions') {
        return { data: { data: { sessionId: 'session-1' } } };
      }
      if (path === '/tasks/enrollments/enroll-1/submissions') {
        return { data: { data: { certificate: { id: 'certificate-1' } } } };
      }
      throw new Error(`Unexpected POST ${path}`);
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

  it('opens a document with an empty Lexical root without passing invalid editor state', async () => {
    mockDocumentContent = { root: { children: [] } };

    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    expect(mockLatestEditorProps.initialContent).toBeUndefined();
    expect(screen.queryByText(/application error|setEditorState/i)).not.toBeInTheDocument();
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
    expect(screen.getByText('Writing time left')).toBeInTheDocument();
    expect(screen.getByTitle('Writing time limit: 1:00')).toBeInTheDocument();
  });

  it('shows an enrolled task deadline countdown in the editor header', async () => {
    mockTaskEnrollments = [{
      id: 'enroll-1',
      documentId: 'doc-1',
      name: 'Timed Task',
      inviteCode: 'ABC123',
      joinedAt: '2026-05-19T12:00:00.000Z',
      endDate: '2099-01-01T00:00:00.000Z',
      environmentConfig: {
        aiAccess: 'off',
        copyPastePolicy: 'allowed',
      },
    }];

    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    expect(screen.getByText('Task deadline in')).toBeInTheDocument();
    expect(screen.getByTitle(/Task deadline:/)).toBeInTheDocument();
  });

  it('uses enrolled task AI settings over stale document AI settings', async () => {
    mockDocumentEnvironmentConfig = {
      aiAccess: 'off',
      copyPastePolicy: 'allowed',
    };
    mockTaskEnrollments = [{
      id: 'enroll-1',
      documentId: 'doc-1',
      name: 'AI Enabled Task',
      inviteCode: 'ABC123',
      joinedAt: '2026-05-19T12:00:00.000Z',
      environmentConfig: {
        aiAccess: 'full',
        allowedModels: ['GPT-4o mini'],
        copyPastePolicy: 'allowed',
      },
    }];

    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI Assistant' })).toBeInTheDocument();
  });

  it('hides AI assistant when the enrolled task disables AI despite stale document AI settings', async () => {
    mockDocumentEnvironmentConfig = {
      aiAccess: 'full',
      allowedModels: ['GPT-4o mini'],
      copyPastePolicy: 'allowed',
    };
    mockTaskEnrollments = [{
      id: 'enroll-1',
      documentId: 'doc-1',
      name: 'No AI Task',
      inviteCode: 'ABC123',
      joinedAt: '2026-05-19T12:00:00.000Z',
      environmentConfig: {
        aiAccess: 'off',
        copyPastePolicy: 'allowed',
      },
    }];

    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'AI Assistant' })).not.toBeInTheDocument();
  });

  it('does not inherit a stale document minimum character count when the enrolled task has no minimum', async () => {
    mockDocumentEnvironmentConfig = {
      aiAccess: 'off',
      copyPastePolicy: 'allowed',
      submission: {
        mode: 'multiple',
        minCharacters: 20,
      },
    };
    mockTaskEnrollments = [{
      id: 'enroll-1',
      documentId: 'doc-1',
      name: 'No Minimum Task',
      inviteCode: 'ABC123',
      joinedAt: '2026-05-19T12:00:00.000Z',
      environmentConfig: {
        aiAccess: 'off',
        copyPastePolicy: 'allowed',
        submission: {
          mode: 'multiple',
        },
      },
    }];

    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    expect(screen.queryByText('0/20 chars')).not.toBeInTheDocument();
  });

  it('uses enrolled task copy-paste and time settings over stale document settings', async () => {
    mockDocumentEnvironmentConfig = {
      aiAccess: 'off',
      copyPastePolicy: 'allowed',
      aiUsageLimit: { mode: 'unlimited' },
      time: {
        lateSubmission: 'allowed',
      },
    };
    mockTaskEnrollments = [{
      id: 'enroll-1',
      documentId: 'doc-1',
      name: 'Locked Config Task',
      inviteCode: 'ABC123',
      joinedAt: '2026-05-19T12:00:00.000Z',
      environmentConfig: {
        aiAccess: 'off',
        copyPastePolicy: 'blocked',
        aiUsageLimit: { mode: 'time_restricted' },
        time: {
          lateSubmission: 'not_allowed',
          timeLimitSeconds: 90,
        },
      },
    }];

    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    expect(mockLatestEditorProps.copyPastePolicy).toBe('blocked');
    expect(screen.getByText('Writing time left')).toBeInTheDocument();
    expect(screen.getByTitle('Writing time limit: 1:30')).toBeInTheDocument();
  });

  it('blocks enrolled task submission below the configured minimum character count', async () => {
    mockTaskEnrollments = [{
      id: 'enroll-1',
      documentId: 'doc-1',
      name: 'Minimum Character Task',
      inviteCode: 'ABC123',
      joinedAt: '2026-05-19T12:00:00.000Z',
      environmentConfig: {
        aiAccess: 'off',
        copyPastePolicy: 'allowed',
        submission: {
          mode: 'multiple',
          minCharacters: 1000,
        },
      },
    }];

    render(<DocumentEditorPage />);

    expect(await screen.findByText('Workflow Document')).toBeInTheDocument();
    expect(screen.getByText('0/1,000 chars')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Minimum length required',
      variant: 'destructive',
    }));
    expect(mockApiPost).not.toHaveBeenCalledWith(
      '/tasks/enrollments/enroll-1/submissions',
      expect.anything()
    );
  });

  it('shows grouped document events and expandable raw details in the logs view', async () => {
    render(<DocumentLogsPage />);

    expect(await screen.findByText('Activity Summary')).toBeInTheDocument();
    expect(await screen.findByText('Typed "hello world"')).toBeInTheDocument();
    expect(screen.getByText('Raw events')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Typing bursts')).toBeInTheDocument();
    expect(screen.queryByText('input')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /typed text/i }));

    await screen.findByText('Inserted "h"');
    expect(screen.getAllByText('Raw events')).toHaveLength(2);
    expect(await screen.findByText('Inserted "h"')).toBeInTheDocument();
    expect(screen.queryByText(/failed to load logs/i)).not.toBeInTheDocument();
  });

  it('keeps AI logs in the grouped logs timeline', async () => {
    mockAiLogs = [
      {
        id: 'ai-log-1',
        queryType: 'other',
        query: 'What does this paragraph mean?',
        response: 'It explains the core argument.',
        timestamp: '2026-05-14T12:00:02.000Z',
        status: 'success',
        modificationsApplied: false,
      },
    ];

    render(<DocumentLogsPage />);

    expect(await screen.findByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('AI actions')).toBeInTheDocument();
    expect(screen.getByText('What does this paragraph mean?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /chat/i }));

    expect(await screen.findByText('It explains the core argument.')).toBeInTheDocument();
  });
});
