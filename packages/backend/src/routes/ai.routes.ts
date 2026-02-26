import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error-handler';
import {
  sendChatMessage,
  getLogs,
  getLog,
  applySuggestion,
  getSessions,
  getSession,
  deleteSession,
  trackSelectionAction,
  getSelectionStats,
} from '../controllers/ai.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/ai/chat
 * Send a chat message to AI assistant
 * Body: { documentId: string, sessionId?: string, message: string, context?: { fullContent?, selection?, cursorPosition? } }
 */
router.post('/chat', asyncHandler(sendChatMessage));

/**
 * GET /api/v1/ai/logs
 * Get AI interaction logs
 * Query params:
 * - documentId: string (required)
 * - queryType: AIQueryType (optional)
 * - status: 'success' | 'error' | 'cancelled' | 'pending' (optional)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
router.get('/logs', asyncHandler(getLogs));

/**
 * GET /api/v1/ai/logs/:logId
 * Get a specific AI interaction log
 */
router.get('/logs/:logId', asyncHandler(getLog));

/**
 * POST /api/v1/ai/apply-suggestion
 * Apply an AI suggestion and log the modification
 * Body: { logId: string, suggestionId: string, modification: AIContentModification }
 */
router.post('/apply-suggestion', asyncHandler(applySuggestion));

/**
 * GET /api/v1/ai/sessions/:documentId
 * Get chat sessions for a document
 * Query params:
 * - limit: number (default: 10)
 */
router.get('/sessions/:documentId', asyncHandler(getSessions));

/**
 * GET /api/v1/ai/sessions/detail/:sessionId
 * Get a specific chat session with messages
 */
router.get('/sessions/detail/:sessionId', asyncHandler(getSession));

/**
 * DELETE /api/v1/ai/sessions/:sessionId
 * Delete a chat session (including messages and logs)
 */
router.delete('/sessions/:sessionId', asyncHandler(deleteSession));

/**
 * POST /api/v1/ai/selection-action
 * Track an AI selection action (Fix grammar, Improve writing, etc.) with user decision
 * Body: { documentId: string, actionType: 'grammar'|'improve'|'simplify'|'formal', originalText: string, suggestedText: string, decision: 'accepted'|'rejected', responseTimeMs?: number, modelVersion?: string }
 */
router.post('/selection-action', asyncHandler(trackSelectionAction));

/**
 * GET /api/v1/ai/selection-stats/:documentId
 * Get AI selection action statistics for a document
 */
router.get('/selection-stats/:documentId', asyncHandler(getSelectionStats));

export default router;
