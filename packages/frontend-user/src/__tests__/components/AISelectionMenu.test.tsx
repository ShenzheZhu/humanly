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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AISelectionMenu } from '@/components/ai/ai-selection-menu';
import api from '@/lib/api-client';
import { emitEvent } from '@/lib/socket-client';

const mockedApi = api as jest.Mocked<typeof api>;
const mockedEmitEvent = emitEvent as jest.Mock;

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

describe('AISelectionMenu quick actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.get.mockResolvedValue({ data: { data: { hasApiKey: true } } } as any);
    mockedApi.post.mockResolvedValue({
      data: {
        message: {
          id: 'msg-1',
          role: 'assistant',
          content: 'This is better.',
        },
      },
    } as any);
  });

  it('requests a silent quick-action response and applies it without using chat streaming', async () => {
    const { replaceSelection, onActionApplied, onClose } = renderMenu();

    await userEvent.click(await screen.findByRole('button', { name: /fix grammar/i }));

    await waitFor(() => {
      expect(mockedApi.post).toHaveBeenCalledWith(
        '/ai/chat',
        expect.objectContaining({
          documentId: 'doc-1',
          silent: true,
          context: { selectedText: selection.text },
        }),
        expect.any(Object)
      );
    });

    expect(mockedEmitEvent).not.toHaveBeenCalledWith(
      'ai:message',
      expect.objectContaining({
        documentId: 'doc-1',
        context: { selectedText: selection.text },
      })
    );

    await waitFor(() => {
      expect(screen.getByText('This is better.')).toBeInTheDocument();
    });

    const applyButton = screen.getByRole('button', { name: /apply/i });
    expect(applyButton).toBeEnabled();

    await userEvent.click(applyButton);

    expect(replaceSelection).toHaveBeenCalledWith('This is better.', true);
    expect(onActionApplied).toHaveBeenCalledWith('grammar', selection.text, 'This is better.', undefined);
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
