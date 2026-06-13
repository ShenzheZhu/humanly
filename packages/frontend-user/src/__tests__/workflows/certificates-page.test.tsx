import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Certificate } from '@humanly/shared';

import CertificatesPage from '@/app/certificates/page';

const mockPush = jest.fn();
const mockUseCertificates = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/use-certificates', () => ({
  useCertificates: (...args: unknown[]) => mockUseCertificates(...args),
}));

function makeCertificate(
  id: string,
  documentId: string,
  title: string,
  generatedAt: string
): Certificate {
  return {
    id,
    documentId,
    userId: 'user-1',
    certificateType: 'full_authorship',
    title,
    documentSnapshot: {},
    plainTextSnapshot: '',
    totalEvents: 8,
    typingEvents: 8,
    pasteEvents: 0,
    totalCharacters: 287,
    typedCharacters: 287,
    pastedCharacters: 0,
    editingTimeSeconds: 60,
    signature: 'signature',
    verificationToken: `token-${id}`,
    includeFullText: true,
    includeEditHistory: true,
    isProtected: false,
    generatedAt: new Date(generatedAt),
    pdfGenerated: false,
    pdfUrl: null,
    jsonUrl: null,
    createdAt: new Date(generatedAt),
  };
}

describe('certificates page task folders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCertificates.mockReturnValue({
      certificates: [
        makeCertificate('cert-1', 'doc-1', 'Humanly Paper Demo', '2026-06-12T12:00:00.000Z'),
      ],
      isLoading: false,
      error: null,
    });
  });

  it('collapses certificate task folders by default and expands them on demand', async () => {
    const user = userEvent.setup();

    render(<CertificatesPage />);

    expect(screen.getByRole('heading', { name: 'Authorship records' })).toBeInTheDocument();

    const taskFolder = screen.getByText('Humanly Paper Demo').closest('details');
    expect(taskFolder).not.toBeNull();
    expect(taskFolder).not.toHaveAttribute('open');
    const issuedRow = within(taskFolder as HTMLElement).getByText(/Issued Jun 12, 2026/i);
    expect(issuedRow).not.toBeVisible();

    await user.click(within(taskFolder as HTMLElement).getByText('Humanly Paper Demo'));

    expect(taskFolder).toHaveAttribute('open');
    expect(issuedRow).toBeVisible();
  });
});
