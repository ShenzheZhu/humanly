'use client';

import { useEffect, useCallback } from 'react';
import { useAIStore } from '@/stores/ai-store';
import { isDocumentScopedAccessTokenReady } from '@/lib/api-client';
import { AISuggestion, AIChatRequest } from '@humanly/shared';

const DOCUMENT_AUTH_READY_RETRY_MS = 25;
const DOCUMENT_AUTH_READY_TIMEOUT_MS = 2000;

function waitForDocumentScopedAuthReady(documentId: string, onReady: () => void): () => void {
  if (isDocumentScopedAccessTokenReady(documentId)) {
    onReady();
    return () => undefined;
  }

  let cancelled = false;
  const startedAt = Date.now();
  const intervalId = window.setInterval(() => {
    const isReady = isDocumentScopedAccessTokenReady(documentId);
    const timedOut = Date.now() - startedAt >= DOCUMENT_AUTH_READY_TIMEOUT_MS;
    if (!isReady && !timedOut) return;

    window.clearInterval(intervalId);
    if (!cancelled) {
      onReady();
    }
  }, DOCUMENT_AUTH_READY_RETRY_MS);

  return () => {
    cancelled = true;
    window.clearInterval(intervalId);
  };
}

/**
 * Hook for AI Assistant functionality
 */
export function useAI(documentId: string) {
  const {
    currentSession,
    messages,
    isStreaming,
    streamingContent,
    streamingMessageId,
    activeSuggestions,
    toolCallTimelines,
    thinkingByMessageId,
    isPanelOpen,
    activeTab,
    isLoading,
    error,
    openPanel,
    closePanel,
    setActiveTab,
    sendMessage,
    sendMessageViaSocket,
    cancelStream,
    clearMessages,
    startNewChat,
    initSession,
    loadSession,
    viewLogsAsMessages,
    closeSession,
    deleteSession,
    applySuggestion,
    dismissSuggestion,
    clearSuggestions,
    setupSocketListeners,
    cleanupSocketListeners,
    clearError,
    reset,
  } = useAIStore();

  // Initialize socket listeners on mount
  useEffect(() => {
    setupSocketListeners();
    return () => {
      cleanupSocketListeners();
    };
  }, [setupSocketListeners, cleanupSocketListeners]);

  // Initialize session when panel opens
  useEffect(() => {
    if (!isPanelOpen || !documentId) return undefined;

    return waitForDocumentScopedAuthReady(documentId, () => {
      initSession(documentId);
    });
  }, [isPanelOpen, documentId, initSession]);

  // Send a message (uses WebSocket streaming).
  // Empty `message.trim()` is still allowed when attachments are present
  // — an image-only turn is a legitimate vision query (#93).
  const send = useCallback(
    (
      message: string,
      context?: AIChatRequest['context'],
      attachments?: AIChatRequest['attachments'],
    ) => {
      const hasAttachments = !!attachments && attachments.length > 0;
      if (!message.trim() && !hasAttachments) return;
      sendMessageViaSocket(documentId, message, context, attachments);
    },
    [documentId, sendMessageViaSocket]
  );

  // Send a message via REST (non-streaming)
  const sendSync = useCallback(
    async (
      message: string,
      context?: AIChatRequest['context'],
      attachments?: AIChatRequest['attachments'],
    ) => {
      const hasAttachments = !!attachments && attachments.length > 0;
      if (!message.trim() && !hasAttachments) return;
      await sendMessage(documentId, message, context, attachments);
    },
    [documentId, sendMessage]
  );

  // Apply a suggestion
  const apply = useCallback(
    async (logId: string, suggestion: AISuggestion, before: string, after: string) => {
      await applySuggestion(logId, suggestion, { before, after });
    },
    [applySuggestion]
  );

  // Toggle panel
  const togglePanel = useCallback(() => {
    if (isPanelOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }, [isPanelOpen, openPanel, closePanel]);

  return {
    // State
    session: currentSession,
    messages,
    isStreaming,
    streamingContent,
    streamingMessageId,
    suggestions: activeSuggestions,
    toolCallTimelines,
    thinkingByMessageId,
    isPanelOpen,
    activeTab,
    isLoading,
    error,

    // Actions
    openPanel,
    closePanel,
    togglePanel,
    setActiveTab,
    sendMessage: send,
    sendMessageSync: sendSync,
    cancelStream,
    clearMessages,
    startNewChat,
    loadSession,
    viewLogsAsMessages,
    closeSession,
    deleteSession,
    applySuggestion: apply,
    dismissSuggestion,
    clearSuggestions,
    clearError,
    reset,
  };
}

/**
 * Hook for AI Logs
 */
export function useAILogs(documentId: string) {
  const {
    logs,
    logsTotal,
    isLoading,
    error,
    loadLogs,
    loadMoreLogs,
    clearError,
  } = useAIStore();

  // Load logs when documentId changes
  useEffect(() => {
    if (!documentId) return undefined;

    return waitForDocumentScopedAuthReady(documentId, () => {
      loadLogs(documentId);
    });
  }, [documentId, loadLogs]);

  const loadMore = useCallback(() => {
    loadMoreLogs(documentId);
  }, [documentId, loadMoreLogs]);

  const refresh = useCallback(() => {
    loadLogs(documentId, 0, 20);
  }, [documentId, loadLogs]);

  const hasMore = logs.length < logsTotal;

  return {
    logs,
    total: logsTotal,
    hasMore,
    isLoading,
    error,
    loadMore,
    refresh,
    clearError,
  };
}
