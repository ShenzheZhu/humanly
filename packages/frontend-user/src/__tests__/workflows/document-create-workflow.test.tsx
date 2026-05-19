import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import NewDocumentPage from '@/app/documents/new/page';

const mockPush = jest.fn();
const mockToast = jest.fn();
const mockCreateDocument = jest.fn();
const mockApiGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

jest.mock('@/hooks/use-documents', () => ({
  useDocuments: () => ({
    createDocument: mockCreateDocument,
  }),
}));

jest.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: any[]) => mockApiGet(...args),
    put: jest.fn(),
    post: jest.fn(),
  },
}));

describe('document creation workflow', () => {
  beforeAll(() => {
    Object.defineProperty(Element.prototype, 'hasPointerCapture', {
      configurable: true,
      value: jest.fn(() => false),
    });
    Object.defineProperty(Element.prototype, 'setPointerCapture', {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(Element.prototype, 'releasePointerCapture', {
      configurable: true,
      value: jest.fn(),
    });
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    mockPush.mockClear();
    mockToast.mockClear();
    mockCreateDocument.mockReset();
    mockApiGet.mockReset();
    mockApiGet.mockResolvedValue({ data: { data: null } });
  });

  it('blocks empty titles and creates an AI-off document that opens the editor', async () => {
    const user = userEvent.setup();
    mockCreateDocument.mockResolvedValueOnce({ id: 'doc-123', title: 'Workflow Document' });

    render(<NewDocumentPage />);

    await screen.findByRole('heading', { name: /new document/i });
    await user.click(screen.getByRole('button', { name: /^create document$/i }));

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Error',
      description: 'Please enter a document title',
      variant: 'destructive',
    }));
    expect(mockCreateDocument).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(/document name/i), 'Workflow Document');
    await user.type(screen.getByLabelText(/description/i), 'Current document workflow');

    expect(screen.getByText('A simple personal writing setup with authorship tracking enabled and no AI assistant configured.')).toBeInTheDocument();
    expect(screen.getByText('Copy & paste allowed')).toBeInTheDocument();
    expect(screen.getByText('Choose Custom to configure AI access, copy-paste rules, or a time limit.')).toBeInTheDocument();
    expect(screen.queryByText('Writing Control')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/ai api key/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^create document$/i }));

    await waitFor(() => {
      expect(mockCreateDocument).toHaveBeenCalledWith(
        'Workflow Document',
        undefined,
        expect.objectContaining({
          aiAccess: 'off',
          taskType: 'personal',
        }),
        'Current document workflow'
      );
      expect(mockPush).toHaveBeenCalledWith('/documents/doc-123');
    });
  });

  it('keeps default environment simple and reveals controls when custom is selected', async () => {
    const user = userEvent.setup();

    render(<NewDocumentPage />);

    await screen.findByRole('heading', { name: /new document/i });
    expect(screen.getByText('Choose Custom to configure AI access, copy-paste rules, or a time limit.')).toBeInTheDocument();
    expect(screen.queryByText('Writing Control')).not.toBeInTheDocument();
    expect(screen.queryByText('Time Limitation')).not.toBeInTheDocument();

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'Custom' }));

    expect(screen.getByText('Writing Control')).toBeInTheDocument();
    expect(screen.getByText('Time Limitation')).toBeInTheDocument();
    expect(screen.getByText('AI Off')).toBeInTheDocument();
    expect(screen.queryByText('Choose Custom to configure AI access, copy-paste rules, or a time limit.')).not.toBeInTheDocument();
  });
});
