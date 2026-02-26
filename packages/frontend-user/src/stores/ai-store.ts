import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AIChatMessage,
  AIChatSession,
  AIInteractionLog,
  AISuggestion,
  AIChatRequest,
  AIChatResponse,
} from '@humory/shared';
import api from '@/lib/api-client';
import { getSocket, initializeSocket, emitEvent, onEvent, offEvent } from '@/lib/socket-client';

/**
 * AI Store State
 */
interface AIState {
  // Session state
  currentSession: AIChatSession | null;
  sessions: AIChatSession[];

  // Chat state
  messages: AIChatMessage[];
  isStreaming: boolean;
  streamingContent: string;

  // Suggestions
  activeSuggestions: AISuggestion[];

  // Logs
  logs: AIInteractionLog[];
  logsTotal: number;

  // UI state
  isPanelOpen: boolean;
  activeTab: 'chat' | 'logs';
  isLoading: boolean;
  error: string | null;

  // Quoted text from selection
  quotedText: string | null;

  // Actions
  openPanel: () => void;
  closePanel: () => void;
  setActiveTab: (tab: 'chat' | 'logs') => void;
  setQuotedText: (text: string | null) => void;
  clearQuotedText: () => void;
  openPanelWithQuote: (text: string) => void;

  // Chat actions
  sendMessage: (documentId: string, message: string, context?: AIChatRequest['context']) => Promise<void>;
  sendMessageViaSocket: (documentId: string, message: string, context?: AIChatRequest['context']) => void;
  cancelStream: () => void;
  clearMessages: () => Promise<void>;
  startNewChat: () => Promise<void>;

  // Session actions
  initSession: (documentId: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  closeSession: () => Promise<void>;

  // Suggestion actions
  applySuggestion: (logId: string, suggestion: AISuggestion, modification: { before: string; after: string }) => Promise<void>;
  dismissSuggestion: (suggestionId: string) => void;
  clearSuggestions: () => void;

  // Log actions
  loadLogs: (documentId: string, offset?: number, limit?: number) => Promise<void>;
  loadMoreLogs: (documentId: string) => Promise<void>;

  // Socket handlers
  setupSocketListeners: () => void;
  cleanupSocketListeners: () => void;

  // Utilities
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  currentSession: null,
  sessions: [],
  messages: [],
  isStreaming: false,
  streamingContent: '',
  activeSuggestions: [],
  logs: [],
  logsTotal: 0,
  isPanelOpen: false,
  activeTab: 'chat' as const,
  isLoading: false,
  error: null,
  quotedText: null,
};

// Track whether socket listeners have been set up (singleton pattern to prevent duplicates)
let listenersSetup = false;

export const useAIStore = create<AIState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // UI Actions
      openPanel: () => set({ isPanelOpen: true }),
      closePanel: () => set({ isPanelOpen: false }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setQuotedText: (text) => set({ quotedText: text }),
      clearQuotedText: () => set({ quotedText: null }),
      openPanelWithQuote: (text) => set({ isPanelOpen: true, quotedText: text }),

      // Send message via REST API (non-streaming)
      sendMessage: async (documentId, message, context) => {
        const { currentSession } = get();

        set({ isLoading: true, error: null });

        try {
          const response = await api.post<{
            success: boolean;
            data: AIChatResponse;
          }>('/ai/chat', {
            documentId,
            sessionId: currentSession?.id,
            message,
            context,
          });

          const { sessionId, message: responseMessage, suggestions } = response.data;

          // Update messages
          const userMessage: AIChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: message,
            timestamp: new Date(),
          };

          set((state) => ({
            messages: [...state.messages, userMessage, responseMessage],
            currentSession: state.currentSession
              ? { ...state.currentSession, id: sessionId }
              : null,
            activeSuggestions: suggestions || [],
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to send message',
          });
        }
      },

      // Send message via WebSocket (streaming)
      sendMessageViaSocket: (documentId, message, context) => {
        const { currentSession } = get();

        // Add user message immediately
        const userMessage: AIChatMessage = {
          id: `user-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, userMessage],
          isStreaming: true,
          streamingContent: '',
          error: null,
        }));

        // Emit message via socket
        emitEvent('ai:message', {
          documentId,
          sessionId: currentSession?.id,
          message,
          context,
        } as AIChatRequest);
      },

      cancelStream: () => {
        const { currentSession } = get();
        if (currentSession) {
          emitEvent('ai:cancel', { sessionId: currentSession.id });
        }
        set({ isStreaming: false, streamingContent: '' });
      },

      clearMessages: async () => {
        const { currentSession } = get();

        // If there's an active session, delete it from the backend
        if (currentSession) {
          try {
            await api.delete(`/ai/sessions/${currentSession.id}`);
            emitEvent('ai:leave-session', { sessionId: currentSession.id });
          } catch (error) {
            // Log but continue - we still want to clear the local state
            console.warn('Failed to delete session:', error);
          }
        }

        // Clear local state and reset session to allow new one to be created
        set({
          messages: [],
          streamingContent: '',
          currentSession: null,
          activeSuggestions: [],
          quotedText: null,
        });
      },

      startNewChat: async () => {
        const { currentSession } = get();

        // Close the current session on the backend to ensure a new one is created
        if (currentSession) {
          try {
            await api.delete(`/ai/sessions/${currentSession.id}`);
            emitEvent('ai:leave-session', { sessionId: currentSession.id });
          } catch (error) {
            // Log but continue - we still want to clear the local state
            console.warn('Failed to close previous session:', error);
          }
        }

        // Clear messages AND reset current session to force creation of a new session
        set({
          messages: [],
          streamingContent: '',
          currentSession: null,
          activeSuggestions: [],
          quotedText: null,
          error: null,
        });
      },

      // Session actions
      initSession: async (documentId) => {
        set({ isLoading: true, error: null });

        try {
          // Initialize socket if not connected
          initializeSocket();

          // Join AI session via socket
          emitEvent('ai:join-session', { documentId });

          // Also try to load existing sessions
          const response = await api.get<{
            success: boolean;
            data: AIChatSession[];
          }>(`/ai/sessions/${documentId}`);

          const sessions = response.data;
          const activeSession = sessions.find((s) => s.status === 'active');

          if (activeSession) {
            // Load messages for active session
            const sessionResponse = await api.get<{
              success: boolean;
              data: AIChatSession;
            }>(`/ai/sessions/detail/${activeSession.id}`);

            set({
              currentSession: sessionResponse.data,
              sessions,
              messages: sessionResponse.data.messages || [],
              isLoading: false,
            });
          } else {
            set({
              sessions,
              isLoading: false,
            });
          }
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to initialize session',
          });
        }
      },

      loadSession: async (sessionId) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.get<{
            success: boolean;
            data: AIChatSession;
          }>(`/ai/sessions/detail/${sessionId}`);

          set({
            currentSession: response.data,
            messages: response.data.messages || [],
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to load session',
          });
        }
      },

      closeSession: async () => {
        const { currentSession } = get();
        if (!currentSession) return;

        try {
          await api.delete(`/ai/sessions/${currentSession.id}`);
          emitEvent('ai:leave-session', { sessionId: currentSession.id });

          set({
            currentSession: null,
            messages: [],
            activeSuggestions: [],
          });
        } catch (error: any) {
          set({ error: error.message || 'Failed to close session' });
        }
      },

      // Suggestion actions
      applySuggestion: async (logId, suggestion, modification) => {
        set({ isLoading: true, error: null });

        try {
          await api.post('/ai/apply-suggestion', {
            logId,
            suggestionId: suggestion.id,
            modification: {
              type: suggestion.type,
              ...modification,
              location: suggestion.location,
            },
          });

          // Mark suggestion as applied
          set((state) => ({
            activeSuggestions: state.activeSuggestions.map((s) =>
              s.id === suggestion.id ? { ...s, applied: true } : s
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to apply suggestion',
          });
        }
      },

      dismissSuggestion: (suggestionId) => {
        set((state) => ({
          activeSuggestions: state.activeSuggestions.filter((s) => s.id !== suggestionId),
        }));
      },

      clearSuggestions: () => {
        set({ activeSuggestions: [] });
      },

      // Log actions
      loadLogs: async (documentId, offset = 0, limit = 20) => {
        set({ isLoading: true, error: null });

        try {
          const response = await api.get<{
            success: boolean;
            data: AIInteractionLog[];
            pagination: { total: number };
          }>(`/ai/logs?documentId=${documentId}&offset=${offset}&limit=${limit}`);

          set({
            logs: response.data,
            logsTotal: response.pagination.total,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to load logs',
          });
        }
      },

      loadMoreLogs: async (documentId) => {
        const { logs } = get();

        try {
          const response = await api.get<{
            success: boolean;
            data: AIInteractionLog[];
            pagination: { total: number };
          }>(`/ai/logs?documentId=${documentId}&offset=${logs.length}&limit=20`);

          set((state) => ({
            logs: [...state.logs, ...response.data],
            logsTotal: response.pagination.total,
          }));
        } catch (error: any) {
          set({ error: error.message || 'Failed to load more logs' });
        }
      },

      // Socket handlers
      setupSocketListeners: () => {
        // Prevent duplicate listener setup
        if (listenersSetup) return;

        const socket = getSocket();
        if (!socket) return;

        listenersSetup = true;

        // Response start
        onEvent('ai:response-start', ({ sessionId, messageId }) => {
          set({ isStreaming: true, streamingContent: '' });
        });

        // Response chunk (streaming)
        onEvent('ai:response-chunk', ({ sessionId, messageId, chunk }) => {
          set((state) => ({
            streamingContent: state.streamingContent + chunk,
          }));
        });

        // Response complete
        onEvent('ai:response-complete', (response: AIChatResponse) => {
          set((state) => {
            // Don't add if it's the system connection message
            if (response.message.role === 'system' && response.logId === '') {
              return {
                currentSession: state.currentSession
                  ? { ...state.currentSession, id: response.sessionId }
                  : {
                      id: response.sessionId,
                      documentId: '',
                      userId: '',
                      messages: [],
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      status: 'active',
                    },
                isStreaming: false,
                streamingContent: '',
              };
            }

            // Create or update session with the response session ID
            const updatedSession = state.currentSession
              ? { ...state.currentSession, id: response.sessionId }
              : {
                  id: response.sessionId,
                  documentId: '',
                  userId: '',
                  messages: [],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                  status: 'active' as const,
                };

            // If we were streaming, the content was already shown via streamingContent
            // Just convert it to a proper message, don't duplicate
            if (state.isStreaming && state.streamingContent) {
              return {
                messages: [...state.messages, response.message],
                currentSession: updatedSession,
                activeSuggestions: response.suggestions || state.activeSuggestions,
                isStreaming: false,
                streamingContent: '', // Clear streaming content since message is now in messages array
              };
            }

            // Non-streaming response (from REST API)
            return {
              messages: [...state.messages, response.message],
              currentSession: updatedSession,
              activeSuggestions: response.suggestions || state.activeSuggestions,
              isStreaming: false,
              streamingContent: '',
            };
          });
        });

        // Suggestions
        onEvent('ai:suggestion', ({ sessionId, suggestions }) => {
          set({ activeSuggestions: suggestions });
        });

        // Error
        onEvent('ai:error', ({ sessionId, message, code }) => {
          set({
            isStreaming: false,
            streamingContent: '',
            error: message,
          });
        });
      },

      cleanupSocketListeners: () => {
        offEvent('ai:response-start');
        offEvent('ai:response-chunk');
        offEvent('ai:response-complete');
        offEvent('ai:suggestion');
        offEvent('ai:error');
        listenersSetup = false;
      },

      // Utilities
      clearError: () => set({ error: null }),

      reset: () => {
        const { cleanupSocketListeners } = get();
        cleanupSocketListeners();
        set(initialState);
      },
    }),
    {
      name: 'ai-storage',
      partialize: (state) => ({
        // Only persist panel preferences
        activeTab: state.activeTab,
      }),
    }
  )
);
