import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DocumentReplay } from '@/components/certificates/document-replay';

jest.mock('@/components/certificates/document-viewer', () => ({
  DocumentViewer: () => <div data-testid="document-viewer" />,
}));

const editorState = {
  root: {
    children: [
      {
        children: [{ text: 'Draft text' }],
      },
    ],
  },
};

describe('DocumentReplay', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          editHistory: [
            {
              timestamp: '2026-06-10T12:00:00.000Z',
              editorState,
            },
            {
              timestamp: '2026-06-10T12:00:08.000Z',
              editorState,
            },
          ],
        },
      }),
    } as Response);
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('keeps real timing at 1x instead of inheriting the uniform speed multiplier', async () => {
    render(<DocumentReplay token="certificate-token" />);

    const speedButton = await screen.findByRole('button', {
      name: 'Uniform timing playback speed 2x',
    });

    fireEvent.click(speedButton);
    expect(screen.getByRole('button', { name: 'Uniform timing playback speed 4x' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Uniform timing playback speed 4x' }));
    expect(screen.getByRole('button', { name: 'Uniform timing playback speed 8x' })).toBeEnabled();

    fireEvent.click(screen.getByRole('switch', { name: 'Real timing' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Real timing playback speed 1x' })).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('switch', { name: 'Real timing' }));

    expect(screen.getByRole('button', { name: 'Uniform timing playback speed 8x' })).toBeEnabled();
  });
});
