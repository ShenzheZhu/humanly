import { render, screen } from '@testing-library/react';

import EnrollmentSubmissionsPage from '@/app/tasks/[id]/enrollments/[userId]/page';

const mockPush = jest.fn();
const mockApiGet = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({
    id: 'task-123',
    userId: 'user-123',
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockApiGet(...args),
  },
  ApiError: class ApiError extends Error {
    constructor(message: string, public statusCode?: number) {
      super(message);
    }
  },
}));

const enrollmentFixture = {
  id: 'enrollment-123',
  taskId: 'task-123',
  userId: 'user-123',
  email: 'user@example.com',
  documentId: 'document-123',
  documentTitle: 'Fallback Document',
  joinedAt: '2026-05-01T12:00:00.000Z',
  submissionCount: 1,
  eventCount: 40,
  lastActivity: '2026-05-15T01:58:00.000Z',
};

function mockPageData(certificateVerificationToken: string | null = 'cert-token-123') {
  mockApiGet.mockImplementation((url: string) => {
    if (url.endsWith('/enrollments')) {
      return Promise.resolve({
        success: true,
        data: {
          enrollments: [enrollmentFixture],
        },
      });
    }

    if (url.endsWith('/submissions')) {
      return Promise.resolve({
        success: true,
        data: {
          submissions: [
            {
              id: 'submission-123',
              documentId: 'document-123',
              documentTitle: 'Task Submission',
              certificateId: certificateVerificationToken ? 'certificate-123' : null,
              certificateVerificationToken,
              submittedAt: '2026-05-15T01:58:00.000Z',
              status: 'active',
            },
          ],
        },
      });
    }

    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
}

describe('admin enrollment submission certificate link', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockApiGet.mockReset();
    mockPageData();
  });

  it('links the latest and history certificate actions to the submission certificate', async () => {
    render(<EnrollmentSubmissionsPage />);

    await screen.findByRole('heading', { name: /user submissions/i });
    expect(await screen.findByRole('link', { name: /^certificate$/i })).toHaveAttribute(
      'href',
      'http://localhost:3002/verify/cert-token-123'
    );
    expect(await screen.findByRole('link', { name: /^view$/i })).toHaveAttribute(
      'href',
      'http://localhost:3002/verify/cert-token-123'
    );
  });

  it('shows clear no-certificate feedback when the latest submission has no certificate', async () => {
    mockPageData(null);

    render(<EnrollmentSubmissionsPage />);

    await screen.findByRole('heading', { name: /user submissions/i });
    const noCertificateLabels = await screen.findAllByText(/no certificate/i);

    expect(screen.queryByRole('link', { name: /^certificate$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^view$/i })).not.toBeInTheDocument();
    expect(noCertificateLabels.length).toBeGreaterThan(0);
  });
});
