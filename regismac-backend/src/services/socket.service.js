import { Server } from 'socket.io';

let io = null;

export function initializeSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log('✅ Cliente WebSocket conectado:', socket.id);
    }
    
    socket.on('disconnect', () => {
      if (isDev) {
        console.log('❌ Cliente WebSocket desconectado:', socket.id);
      }
    });
  });

  return io;
}

export function emitSensorUpdate(data) {
  if (io) {
    io.emit('sensor:update', data);
  }
}

export function getIO() {
  return io;
}
