import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Certificate } from '@humanly/shared';

import CertificatesPage from '@/app/certificates/page';

const mockPush = jest.fn();
const mockDeleteCertificate = jest.fn();
let initialCertificates: Certificate[] = [];

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/use-certificates', () => ({
  useCertificates: () => {
    const React = jest.requireActual('react');
    const [certificates, setCertificates] = React.useState(initialCertificates);

    return {
      certificates,
      isLoading: false,
      error: null,
      deleteCertificate: async (certificateId: string) => {
        mockDeleteCertificate(certificateId);
        setCertificates((current: Certificate[]) => (
          current.filter((certificate) => certificate.id !== certificateId)
        ));
      },
    };
  },
}));

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
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
    initialCertificates = [
      makeCertificate('cert-1', 'doc-1', 'Humanly Paper Demo', '2026-06-12T12:00:00.000Z'),
    ];
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
    expect(within(taskFolder as HTMLElement).queryByText('Open')).not.toBeInTheDocument();

    await user.click(within(taskFolder as HTMLElement).getByRole('button', {
      name: /open certificate issued jun 12, 2026/i,
    }));

    expect(mockPush).toHaveBeenCalledWith('/certificates/cert-1');
  });

  it('deletes a single certificate without opening the certificate', async () => {
    initialCertificates = [
      makeCertificate('cert-1', 'doc-1', 'Humanly Paper Demo', '2026-06-12T12:00:00.000Z'),
      makeCertificate('cert-2', 'doc-1', 'Humanly Paper Demo', '2026-06-11T12:00:00.000Z'),
    ];
    const user = userEvent.setup();

    render(<CertificatesPage />);

    const taskFolder = screen.getByText('Humanly Paper Demo').closest('details') as HTMLElement;
    await user.click(within(taskFolder).getByText('Humanly Paper Demo'));
    await user.click(within(taskFolder).getByRole('button', {
      name: /delete certificate issued jun 12, 2026/i,
    }));

    expect(screen.getByRole('heading', { name: 'Delete certificate?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(mockDeleteCertificate).toHaveBeenCalledWith('cert-1');
    expect(mockPush).not.toHaveBeenCalled();
    expect(within(taskFolder).queryByText(/Issued Jun 12, 2026/i)).not.toBeInTheDocument();
    expect(within(taskFolder).getByText(/Issued Jun 11, 2026/i)).toBeInTheDocument();
  });

  it('deletes every certificate in a task folder and lets the derived folder disappear', async () => {
    initialCertificates = [
      makeCertificate('cert-1', 'doc-1', 'Humanly Paper Demo', '2026-06-12T12:00:00.000Z'),
      makeCertificate('cert-2', 'doc-1', 'Humanly Paper Demo', '2026-06-11T12:00:00.000Z'),
      makeCertificate('cert-3', 'doc-2', 'Other Task', '2026-06-10T12:00:00.000Z'),
    ];
    const user = userEvent.setup();

    render(<CertificatesPage />);

    await user.click(screen.getByRole('button', {
      name: /delete humanly paper demo certificate folder/i,
    }));

    expect(screen.getByRole('heading', { name: 'Delete certificate folder?' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    expect(mockDeleteCertificate).toHaveBeenCalledWith('cert-1');
    expect(mockDeleteCertificate).toHaveBeenCalledWith('cert-2');
    expect(mockDeleteCertificate).toHaveBeenCalledTimes(2);
    expect(screen.queryByText('Humanly Paper Demo')).not.toBeInTheDocument();
    expect(screen.getByText('Other Task')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
