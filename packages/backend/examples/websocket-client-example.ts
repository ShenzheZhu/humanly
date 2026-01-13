/**
 * WebSocket Client Example
 *
 * This is a simple example showing how to connect to the Humory WebSocket server
 * and listen for live preview events.
 *
 * Install dependencies:
 *   npm install socket.io-client
 *
 * Usage:
 *   ts-node examples/websocket-client-example.ts
 */

import { io, Socket } from 'socket.io-client';

// Configuration
const SERVER_URL = 'http://localhost:3000';
const JWT_TOKEN = 'your-jwt-token-here'; // Replace with actual JWT token
const PROJECT_ID = 'your-project-id-here'; // Replace with actual project ID

// Create socket connection
const socket: Socket = io(SERVER_URL, {
  auth: {
    token: JWT_TOKEN
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});

// Connection events
socket.on('connect', () => {
  console.log('✓ Connected to WebSocket server');
  console.log('  Socket ID:', socket.id);

  // Join project room
  console.log(`\nJoining project room: ${PROJECT_ID}`);
  socket.emit('join-project', {
    projectId: PROJECT_ID,
    token: JWT_TOKEN
  });
});

socket.on('connect_error', (error) => {
  console.error('✗ Connection error:', error.message);
  if (error.message.includes('token')) {
    console.error('  Check that your JWT token is valid and not expired');
  }
});

socket.on('disconnect', (reason) => {
  console.log('✗ Disconnected:', reason);
  if (reason === 'io server disconnect') {
    // Server disconnected the socket, try to reconnect manually
    console.log('  Server disconnected the socket');
  }
});

socket.on('reconnect', (attemptNumber) => {
  console.log(`✓ Reconnected after ${attemptNumber} attempts`);
});

socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`  Attempting to reconnect (attempt ${attemptNumber})...`);
});

socket.on('reconnect_error', (error) => {
  console.error('✗ Reconnection error:', error.message);
});

socket.on('reconnect_failed', () => {
  console.error('✗ Reconnection failed after maximum attempts');
});

// Live preview events
socket.on('event-received', (data) => {
  console.log('\n📥 Event received:');
  console.log('  Session ID:', data.sessionId);
  console.log('  User ID:', data.externalUserId);
  console.log('  Event Type:', data.event.eventType);
  console.log('  Timestamp:', data.event.timestamp);
  if (data.event.keyChar) {
    console.log('  Key:', data.event.keyChar);
  }
  if (data.event.textAfter) {
    console.log('  Text:', data.event.textAfter.substring(0, 50));
  }
});

socket.on('session-started', (data) => {
  console.log('\n🎬 Session started:');
  console.log('  Session ID:', data.sessionId);
  console.log('  User ID:', data.externalUserId);
  console.log('  Timestamp:', data.timestamp);
});

socket.on('session-ended', (data) => {
  console.log('\n🏁 Session ended:');
  console.log('  Session ID:', data.sessionId);
  console.log('  User ID:', data.externalUserId);
  console.log('  Submitted:', data.submitted);
  console.log('  Timestamp:', data.timestamp);
});

socket.on('error', (data) => {
  console.error('\n❌ Server error:');
  console.error('  Message:', data.message);
  if (data.code) {
    console.error('  Code:', data.code);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nShutting down...');

  // Leave project room
  socket.emit('leave-project', {
    projectId: PROJECT_ID
  });

  // Disconnect
  socket.disconnect();

  setTimeout(() => {
    console.log('Goodbye!');
    process.exit(0);
  }, 500);
});

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║           Humory WebSocket Client Example                 ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\nConnecting to:', SERVER_URL);
console.log('Project ID:', PROJECT_ID);
console.log('\nPress Ctrl+C to exit\n');
console.log('─'.repeat(60));
