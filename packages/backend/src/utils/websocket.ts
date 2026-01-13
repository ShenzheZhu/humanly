import { Server as SocketIOServer } from 'socket.io';
import { TrackerEvent } from '@humory/shared';
import { logger } from './logger';

/**
 * WebSocket event types for client-server communication
 */
export interface ClientToServerEvents {
  'join-project': (data: JoinProjectData) => void;
  'leave-project': (data: LeaveProjectData) => void;
}

export interface ServerToClientEvents {
  'event-received': (data: EventReceivedData) => void;
  'session-started': (data: SessionStartedData) => void;
  'session-ended': (data: SessionEndedData) => void;
  error: (data: ErrorData) => void;
}

/**
 * Data structures for WebSocket events
 */
export interface JoinProjectData {
  projectId: string;
  token: string;
}

export interface LeaveProjectData {
  projectId: string;
}

export interface EventReceivedData {
  sessionId: string;
  externalUserId: string;
  event: TrackerEvent;
}

export interface SessionStartedData {
  sessionId: string;
  externalUserId: string;
  timestamp: Date;
}

export interface SessionEndedData {
  sessionId: string;
  externalUserId: string;
  submitted: boolean;
  timestamp: Date;
}

export interface ErrorData {
  message: string;
  code?: string;
}

/**
 * Socket data interface for storing authenticated user info
 */
export interface SocketData {
  userId: string;
  email: string;
  projectRooms: Set<string>;
}

/**
 * Helper function to get the room name for a project
 */
export function getProjectRoom(projectId: string): string {
  return `project:${projectId}`;
}

/**
 * Broadcast an event to all clients in a project room
 */
export function broadcastToProject(
  io: SocketIOServer,
  projectId: string,
  event: keyof ServerToClientEvents,
  data: any
): void {
  const room = getProjectRoom(projectId);
  io.to(room).emit(event, data);

  logger.debug('Broadcasting to project room', {
    projectId,
    room,
    event,
  });
}

/**
 * Get all connected users in a project room
 */
export async function getConnectedUsersInProject(
  io: SocketIOServer,
  projectId: string
): Promise<string[]> {
  const room = getProjectRoom(projectId);
  const sockets = await io.in(room).fetchSockets();

  const userIds = new Set<string>();
  sockets.forEach(socket => {
    const data = socket.data as SocketData;
    if (data?.userId) {
      userIds.add(data.userId);
    }
  });

  return Array.from(userIds);
}

/**
 * Get count of connected sockets in a project room
 */
export async function getProjectRoomSize(
  io: SocketIOServer,
  projectId: string
): Promise<number> {
  const room = getProjectRoom(projectId);
  const sockets = await io.in(room).fetchSockets();
  return sockets.length;
}
