import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { Express } from 'express';
import { env } from './config/env';
import { logger } from './utils/logger';
import { setupWebSocketServer } from './websocket/socket-server';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from './utils/websocket';

export function createServer(app: Express): {
  httpServer: http.Server;
  io: SocketIOServer;
} {
  const httpServer = http.createServer(app);

  // Parse CORS origins from comma-separated string to array
  const allowedOrigins = env.corsOrigin.split(',').map(origin => origin.trim());

  // Create Socket.IO server with typed events
  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    {},
    SocketData
  >(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    // Connection timeout
    connectTimeout: 45000, // Increased from 10s to 45s
    // Ping timeout
    pingTimeout: 60000,
    // Ping interval
    pingInterval: 25000,
  });

  // Setup WebSocket server with authentication and handlers
  setupWebSocketServer(io);

  logger.info('Socket.IO server created with authentication and handlers');

  return { httpServer, io };
}

export function startServer(
  httpServer: http.Server,
  port: number = env.port
): void {
  httpServer.listen(port, '0.0.0.0', () => {
    logger.info(`Server is running on port ${port}`, {
      environment: env.nodeEnv,
      port,
      host: '0.0.0.0',
    });
  });
}
