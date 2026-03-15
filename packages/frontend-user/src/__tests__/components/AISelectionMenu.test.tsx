jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('@/lib/socket-client', () => ({
  initializeSocket: jest.fn(),
  emitEvent: jest.fn(),
  onEvent: jest.fn(),
  offEvent: jest.fn(),
}));

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AISelectionMenu } from '@/components/ai/ai-selection-menu';
import api from '@/lib/api-client';
import { emitEvent, initializeSocket, onEvent } from '@/lib/socket-client';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedInitializeSocket = initializeSocket as jest.Mock;
const mockedEmitEvent = emitEvent as jest.Mock;
const mockedOnEvent = onEvent as jest.Mock;

const selection = {
  text: 'This are bad grammar.',
  start: 0,
  end: 22,
  rect: {
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    top: 0,
    left: 0,
    right: 100,
    bottom: 20,
    toJSON: () => ({}),
  } as DOMRect,
};

function renderMenu() {
  const replaceSelection = jest.fn();
  const cancelAIAction = jest.fn();
  const undoLastAction = jest.fn();
  const onClose = jest.fn();
  const onActionApplied = jest.fn();

  render(
    <AISelectionMenu
      documentId="doc-1"
      selection={selection}
      replaceSelection={replaceSelection}
      cancelAIAction={cancelAIAction}
      undoLastAction={undoLastAction}
      onClose={onClose}
      onActionApplied={onActionApplied}
    />
  );

  return {
    replaceSelection,
    cancelAIAction,
    undoLastAction,
    onClose,
    onActionApplied,
  };
}

describe('AISelectionMenu streaming flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: { data: { hasApiKey: true } } } as any);
    mockedApi.post.mockResolvedValue({} as any);
    mockedInitializeSocket.mockReturnValue({
      connected: true,
      once: jest.fn(),
      off: jest.fn(),
    });
  });

  it('streams suggestion text and applies it after completion', async () => {
    const handlers: Record<string, (payload: any) => void> = {};
    mockedOnEvent.mockImplementation((event: string, callback: (payload: any) => void) => {
      handlers[event] = callback;
    });

    const { replaceSelection, onActionApplied, onClose } = renderMenu();

    await userEvent.click(await screen.findByRole('button', { name: /fix grammar/i }));

    expect(mockedEmitEvent).toHaveBeenCalledWith(
      'ai:message',
      expect.objectContaining({
        documentId: 'doc-1',
        context: { selectedText: selection.text },
      })
    );

    await act(async () => {
      handlers['ai:response-start']?.({ sessionId: 'session-1', messageId: 'msg-1' });
      handlers['ai:response-chunk']?.({ sessionId: 'session-1', messageId: 'msg-1', chunk: 'This' });
      handlers['ai:response-chunk']?.({ sessionId: 'session-1', messageId: 'msg-1', chunk: ' is' });
      handlers['ai:response-chunk']?.({ sessionId: 'session-1', messageId: 'msg-1', chunk: ' better.' });
      handlers['ai:response-complete']?.({
        sessionId: 'session-1',
        message: { content: 'This is better.' },
      });
    });

    await waitFor(() => {
      expect(screen.getByText('This is better.')).toBeInTheDocument();
    });

    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeEnabled();

    await userEvent.click(applyButton);

    expect(replaceSelection).toHaveBeenCalledWith('This is better.', true);
    expect(onActionApplied).toHaveBeenCalledWith('grammar', selection.text, 'This is better.');
    expect(mockedApi.post).toHaveBeenCalledWith(
      '/ai/selection-action',
      expect.objectContaining({
        documentId: 'doc-1',
        actionType: 'grammar',
        originalText: selection.text,
        suggestedText: 'This is better.',
        decision: 'accepted',
      })
    );
    expect(onClose).toHaveBeenCalled();
  });
});
