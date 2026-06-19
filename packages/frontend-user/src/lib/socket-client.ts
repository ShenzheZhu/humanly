import { io, Socket } from 'socket.io-client';
import { TokenManager } from './api-client';

const CONFIGURED_WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

export function resolveSocketUrl(configuredUrl: string = CONFIGURED_WS_URL): string {
  try {
    const url = new URL(configuredUrl);
    if (
      url.hostname === 'writehumanly.net'
      || url.hostname === 'app.writehumanly.net'
      || url.hostname === 'admin.writehumanly.net'
    ) {
      return 'https://api.writehumanly.net';
    }
  } catch {
    return configuredUrl;
  }

  return configuredUrl;
}

const WS_URL = resolveSocketUrl();

/**
 * Socket client instance
 */
let socket: Socket | null = null;
let socketAuthToken: string | null = null;
const socketListeners = new Map<string, Set<(data: any) => void>>();

const attachRegisteredListeners = (nextSocket: Socket): void => {
  socketListeners.forEach((callbacks, event) => {
    callbacks.forEach((callback) => {
      nextSocket.on(event, callback);
    });
  });
};

/**
 * Initialize socket connection. A document-scoped token can be supplied for
 * guest shared-link workspaces before the layout-level auth bridge settles.
 */
export const initializeSocket = (tokenOverride?: string | null): Socket => {
  const token = tokenOverride ?? TokenManager.getAccessToken();

  if (socket) {
    if (socketAuthToken === token) {
      return socket;
    }

    socket.disconnect();
    socket = null;
  }

  socket = io(WS_URL, {
    auth: {
      token,
    },
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });
  socketAuthToken = token;
  attachRegisteredListeners(socket);

  // Connection event listeners
  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

/**
 * Get socket instance
 */
export const getSocket = (): Socket | null => {
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    socketAuthToken = null;
  }
};

/**
 * Emit event to server
 */
export const emitEvent = (event: string, data?: any): void => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  } else {
    console.warn('Socket not connected. Event not emitted:', event);
  }
};

/**
 * Listen to event from server
 */
export const onEvent = (event: string, callback: (data: any) => void): void => {
  if (!socketListeners.has(event)) {
    socketListeners.set(event, new Set());
  }
  socketListeners.get(event)!.add(callback);

  if (socket) {
    socket.on(event, callback);
  }
};

/**
 * Remove event listener
 */
export const offEvent = (event: string, callback?: (data: any) => void): void => {
  if (!callback) {
    socketListeners.delete(event);
  } else {
    const callbacks = socketListeners.get(event);
    callbacks?.delete(callback);
    if (callbacks?.size === 0) {
      socketListeners.delete(event);
    }
  }

  if (socket) {
    socket.off(event, callback);
  }
};

const socketClient = {
  initializeSocket,
  getSocket,
  disconnectSocket,
  emitEvent,
  onEvent,
  offEvent,
};

export default socketClient;
