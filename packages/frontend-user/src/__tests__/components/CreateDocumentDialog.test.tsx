/**
 * UI-layer tests for the Create Document dialog inside DocumentsPage.
 *
 * Strategy: mock useDocuments, useToast, and next/navigation so we can test
 * the form logic in isolation without network calls or routing side-effects.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCreateDocument = jest.fn();
const mockDeleteDocument = jest.fn();
jest.mock('@/hooks/use-documents', () => ({
  useDocuments: jest.fn(() => ({
    documents: [],
    isLoading: false,
    error: null,
    createDocument: mockCreateDocument,
    deleteDocument: mockDeleteDocument,
  })),
}));

const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// DocumentCard is irrelevant to the form tests
jest.mock('@/components/documents/document-card', () => ({
  DocumentCard: ({ document }: any) => (
    <div data-testid="document-card">{document.title}</div>
  ),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DocumentsPage from '@/app/documents/page';
import { useDocuments } from '@/hooks/use-documents';

const mockUseDocuments = useDocuments as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function openDialog() {
  const trigger = screen.getByRole('button', { name: /new document/i });
  await userEvent.click(trigger);
  // Dialog renders into a portal; wait for the title to appear
  await screen.findByRole('heading', { name: /create new document/i });
}

function makePdf(name = 'paper.pdf', sizeBytes = 1024) {
  return new File([new ArrayBuffer(sizeBytes)], name, { type: 'application/pdf' });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDocuments.mockReturnValue({
    documents: [],
    isLoading: false,
    error: null,
    createDocument: mockCreateDocument,
    deleteDocument: mockDeleteDocument,
  });
});

// 1. Empty title ────────────────────────────────────────────────────────────────

describe('empty title validation', () => {
  it('shows error toast and does not call createDocument when title is blank', async () => {
    render(<DocumentsPage />);
    await openDialog();

    // Do NOT type a title — click Create directly
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        description: expect.stringMatching(/title/i),
        variant: 'destructive',
      })
    );
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it('shows error toast when title is only whitespace', async () => {
    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), '   ');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' })
    );
    expect(mockCreateDocument).not.toHaveBeenCalled();
  });

  it('does not close the dialog on validation failure', async () => {
    render(<DocumentsPage />);
    await openDialog();

    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    // Dialog heading should still be visible
    expect(screen.getByRole('heading', { name: /create new document/i })).toBeInTheDocument();
  });
});

// 2. Valid input triggers submission ────────────────────────────────────────────

describe('valid submission', () => {
  it('calls createDocument with title and no file when no PDF selected', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 'doc-1', title: 'My Paper' });

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'My Paper');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() =>
      expect(mockCreateDocument).toHaveBeenCalledWith('My Paper', undefined)
    );
  });

  it('calls createDocument with title and File when PDF is attached', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 'doc-2', title: 'With PDF' });

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'With PDF');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const pdf = makePdf();
    await userEvent.upload(fileInput, pdf);

    await userEvent.click(screen.getByRole('button', { name: /create & upload pdf/i }));

    await waitFor(() =>
      expect(mockCreateDocument).toHaveBeenCalledWith('With PDF', expect.any(File))
    );
  });

  it('pre-fills title from PDF filename when title is empty', async () => {
    render(<DocumentsPage />);
    await openDialog();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, makePdf('my-thesis.pdf'));

    expect(screen.getByPlaceholderText(/my research paper/i)).toHaveValue('my-thesis');
  });

  it('submits on Enter key in title field', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 'doc-3', title: 'Quick Enter' });

    render(<DocumentsPage />);
    await openDialog();

    const titleInput = screen.getByPlaceholderText(/my research paper/i);
    await userEvent.type(titleInput, 'Quick Enter{Enter}');

    await waitFor(() =>
      expect(mockCreateDocument).toHaveBeenCalledWith('Quick Enter', undefined)
    );
  });
});

// 3. Loading state ──────────────────────────────────────────────────────────────

describe('loading state during creation', () => {
  it('disables the Create button and shows "Creating..." while in flight', async () => {
    let resolveCreate!: (v: any) => void;
    mockCreateDocument.mockReturnValueOnce(
      new Promise((res) => { resolveCreate = res; })
    );

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Loading Test');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    // While pending, button should show "Creating..." and be disabled
    const creatingBtn = await screen.findByRole('button', { name: /creating/i });
    expect(creatingBtn).toBeDisabled();

    // Also Cancel should be disabled
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

    // Resolve to clean up
    resolveCreate({ id: 'x', title: 'Loading Test' });
  });

  it('prevents double submission (idempotency guard)', async () => {
    let resolveCreate!: (v: any) => void;
    mockCreateDocument.mockReturnValueOnce(
      new Promise((res) => { resolveCreate = res; })
    );

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Double');

    const createBtn = screen.getByRole('button', { name: /create document/i });
    // Click twice rapidly
    await userEvent.click(createBtn);
    await userEvent.click(createBtn);

    resolveCreate({ id: 'y', title: 'Double' });
    await waitFor(() => expect(mockCreateDocument).toHaveBeenCalledTimes(1));
  });
});

// 4. Success UI behaviour ───────────────────────────────────────────────────────

describe('success after creation', () => {
  it('closes the dialog after successful creation', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 'new-1', title: 'Done' });

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Done');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /create new document/i })).not.toBeInTheDocument()
    );
  });

  it('shows success toast after creation without PDF', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 'new-2', title: 'Toast Test' });

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Toast Test');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success',
          description: expect.stringMatching(/document created successfully/i),
        })
      )
    );
  });

  it('shows PDF-specific success toast when PDF was uploaded', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 'new-3', title: 'PDF Success' });

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'PDF Success');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, makePdf());

    await userEvent.click(screen.getByRole('button', { name: /create & upload pdf/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Success',
          description: expect.stringMatching(/pdf/i),
        })
      )
    );
  });

  it('navigates to the new document page', async () => {
    mockCreateDocument.mockResolvedValueOnce({ id: 'nav-doc', title: 'Navigate' });

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Navigate');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/documents/nav-doc')
    );
  });
});

// 5. Failure — error toast & dialog stays open ──────────────────────────────────

describe('failure handling', () => {
  it('shows error toast when createDocument throws', async () => {
    mockCreateDocument.mockRejectedValueOnce(new Error('Server error'));

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Fail Test');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Server error',
          variant: 'destructive',
        })
      )
    );
  });

  it('keeps the dialog open after failure so user can retry', async () => {
    mockCreateDocument.mockRejectedValueOnce(new Error('Upload failed'));

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Retry Me');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: /create new document/i })).toBeInTheDocument();
  });

  it('re-enables the Create button after failure', async () => {
    mockCreateDocument.mockRejectedValueOnce(new Error('Oops'));

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Re-enable');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /create document/i })).not.toBeDisabled();
  });
});

// 6. Rollback visible in UI ─────────────────────────────────────────────────────

describe('rollback visibility', () => {
  it('error message reflects the upload failure reason, not a generic success', async () => {
    mockCreateDocument.mockRejectedValueOnce(new Error('Upload failed'));

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Rollback Test');
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await userEvent.upload(fileInput, makePdf());

    await userEvent.click(screen.getByRole('button', { name: /create & upload pdf/i }));

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          description: 'Upload failed',
          variant: 'destructive',
        })
      )
    );

    // Success toast must NOT have been called — user must not think it succeeded
    expect(mockToast).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Success' })
    );
  });

  it('document list does not show new entry after rollback', async () => {
    // Hook rejects, simulating rollback (delete called internally by hook)
    mockCreateDocument.mockRejectedValueOnce(new Error('Upload failed'));

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'Ghost Doc');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());

    // No document cards should have appeared
    expect(screen.queryAllByTestId('document-card')).toHaveLength(0);
  });

  it('does not navigate away after rollback', async () => {
    mockCreateDocument.mockRejectedValueOnce(new Error('Upload failed'));

    render(<DocumentsPage />);
    await openDialog();

    await userEvent.type(screen.getByPlaceholderText(/my research paper/i), 'No Nav');
    await userEvent.click(screen.getByRole('button', { name: /create document/i }));

    await waitFor(() => expect(mockToast).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
