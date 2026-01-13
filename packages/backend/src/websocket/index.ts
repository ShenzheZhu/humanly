/**
 * WebSocket Module
 *
 * This module provides enhanced WebSocket functionality for live preview
 * of tracking events in Humory projects.
 *
 * Features:
 * - JWT authentication for WebSocket connections
 * - Project room management (join/leave)
 * - Real-time event broadcasting
 * - User ownership verification
 * - Connection lifecycle management
 *
 * Usage:
 * 1. Import setupWebSocketServer in your server.ts
 * 2. Call it with your Socket.IO instance
 * 3. Clients can connect using JWT token in auth.token or query.token
 * 4. Clients emit 'join-project' to join a project room
 * 5. Server broadcasts events to all clients in the room
 *
 * Events Flow:
 * Client → Server:
 *   - join-project: { projectId, token }
 *   - leave-project: { projectId }
 *
 * Server → Client:
 *   - event-received: { sessionId, externalUserId, event }
 *   - session-started: { sessionId, externalUserId, timestamp }
 *   - session-ended: { sessionId, externalUserId, submitted, timestamp }
 *   - error: { message, code? }
 */

export { setupWebSocketServer, TypedSocket } from './socket-server';
export {
  setupLivePreviewHandlers,
  handleJoinProject,
  handleLeaveProject,
  broadcastEventToProject,
  getProjectConnectedUsers,
} from './handlers/live-preview.handler';
export * from '../utils/websocket';
