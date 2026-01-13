import { Server as SocketIOServer } from 'socket.io';
import { TypedSocket } from '../socket-server';
import { ProjectModel } from '../../models/project.model';
import { logger } from '../../utils/logger';
import {
  getProjectRoom,
  broadcastToProject,
  getConnectedUsersInProject,
  JoinProjectData,
  LeaveProjectData,
} from '../../utils/websocket';

/**
 * Handle client joining a project room
 * Verifies user owns the project before allowing them to join
 */
export async function handleJoinProject(
  io: SocketIOServer,
  socket: TypedSocket,
  data: JoinProjectData
): Promise<void> {
  const { userId, email } = socket.data;
  const { projectId, token } = data;

  try {
    // Validate input
    if (!projectId) {
      logger.warn('Join project failed: Missing projectId', {
        socketId: socket.id,
        userId,
      });
      socket.emit('error', {
        message: 'Project ID is required',
        code: 'MISSING_PROJECT_ID',
      });
      return;
    }

    // Verify user owns the project
    const ownsProject = await ProjectModel.verifyOwnership(projectId, userId);

    if (!ownsProject) {
      logger.warn('Join project failed: User does not own project', {
        socketId: socket.id,
        userId,
        projectId,
      });
      socket.emit('error', {
        message: 'You do not have access to this project',
        code: 'UNAUTHORIZED',
      });
      return;
    }

    // Check if project exists and is active
    const project = await ProjectModel.findById(projectId);

    if (!project) {
      logger.warn('Join project failed: Project not found', {
        socketId: socket.id,
        userId,
        projectId,
      });
      socket.emit('error', {
        message: 'Project not found',
        code: 'PROJECT_NOT_FOUND',
      });
      return;
    }

    if (!project.isActive) {
      logger.warn('Join project failed: Project is not active', {
        socketId: socket.id,
        userId,
        projectId,
      });
      socket.emit('error', {
        message: 'Project is not active',
        code: 'PROJECT_INACTIVE',
      });
      return;
    }

    // Join the project room
    const room = getProjectRoom(projectId);
    await socket.join(room);

    // Add to socket's project rooms tracking
    socket.data.projectRooms.add(projectId);

    logger.info('User joined project room', {
      socketId: socket.id,
      userId,
      email,
      projectId,
      room,
    });

    // Get current connected users count
    const connectedUsers = await getConnectedUsersInProject(io, projectId);

    logger.debug('Project room status', {
      projectId,
      room,
      connectedUsers: connectedUsers.length,
      userIds: connectedUsers,
    });
  } catch (error) {
    logger.error('Failed to join project room', {
      socketId: socket.id,
      userId,
      projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    socket.emit('error', {
      message: 'Failed to join project room',
      code: 'JOIN_FAILED',
    });
  }
}

/**
 * Handle client leaving a project room
 */
export async function handleLeaveProject(
  io: SocketIOServer,
  socket: TypedSocket,
  data: LeaveProjectData
): Promise<void> {
  const { userId, email } = socket.data;
  const { projectId } = data;

  try {
    // Validate input
    if (!projectId) {
      logger.warn('Leave project failed: Missing projectId', {
        socketId: socket.id,
        userId,
      });
      socket.emit('error', {
        message: 'Project ID is required',
        code: 'MISSING_PROJECT_ID',
      });
      return;
    }

    // Leave the project room
    const room = getProjectRoom(projectId);
    await socket.leave(room);

    // Remove from socket's project rooms tracking
    socket.data.projectRooms.delete(projectId);

    logger.info('User left project room', {
      socketId: socket.id,
      userId,
      email,
      projectId,
      room,
    });

    // Get remaining connected users count
    const connectedUsers = await getConnectedUsersInProject(io, projectId);

    logger.debug('Project room status after leave', {
      projectId,
      room,
      connectedUsers: connectedUsers.length,
      userIds: connectedUsers,
    });
  } catch (error) {
    logger.error('Failed to leave project room', {
      socketId: socket.id,
      userId,
      projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    socket.emit('error', {
      message: 'Failed to leave project room',
      code: 'LEAVE_FAILED',
    });
  }
}

/**
 * Helper to broadcast events to a project room
 * This can be called from other services to push updates to clients
 */
export function broadcastEventToProject(
  io: SocketIOServer,
  projectId: string,
  eventName: 'event-received' | 'session-started' | 'session-ended',
  data: any
): void {
  broadcastToProject(io, projectId, eventName, data);
}

/**
 * Get list of connected users in a project
 * Useful for showing who is currently viewing live preview
 */
export async function getProjectConnectedUsers(
  io: SocketIOServer,
  projectId: string
): Promise<string[]> {
  return getConnectedUsersInProject(io, projectId);
}

/**
 * Setup all live preview event handlers for a socket
 */
export function setupLivePreviewHandlers(
  io: SocketIOServer,
  socket: TypedSocket
): void {
  // Handle join project
  socket.on('join-project', (data) => {
    handleJoinProject(io, socket, data);
  });

  // Handle leave project
  socket.on('leave-project', (data) => {
    handleLeaveProject(io, socket, data);
  });

  logger.debug('Live preview handlers setup', {
    socketId: socket.id,
    userId: socket.data.userId,
  });
}
