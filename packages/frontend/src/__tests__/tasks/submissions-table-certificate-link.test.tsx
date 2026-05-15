import { fireEvent, render, screen } from '@testing-library/react';

import SubmissionsTable from '@/components/SubmissionsTable';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const submissionFixture = {
  id: 'submission-123',
  userId: 'user-123',
  userEmail: 'user@example.com',
  documentId: 'document-123',
  documentTitle: 'Task Submission',
  certificateId: 'certificate-123',
  certificateVerificationToken: 'cert-token-123',
  submittedAt: '2026-05-15T01:58:00.000Z',
  status: 'active' as const,
};

describe('admin task submissions table certificate link', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('keeps row navigation on the submission and links Issued to the public certificate page', () => {
    render(
      <SubmissionsTable
        taskId="task-123"
        submissions={[submissionFixture]}
      />
    );

    const issuedLink = screen.getByRole('link', { name: /issued/i });
    expect(issuedLink).toHaveAttribute(
      'href',
      'http://localhost:3002/verify/cert-token-123'
    );

    fireEvent.click(issuedLink);
    expect(mockPush).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('submission-123'));
    expect(mockPush).toHaveBeenCalledWith('/tasks/task-123/submissions/submission-123');
  });
});
