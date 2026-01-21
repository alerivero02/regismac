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

let ultimaEmisionRef = null;

export function emitSensorUpdate(data) {
  if (io) {
    const tiempoEmision = Date.now();
    const tiempoDesdeUltima = ultimaEmisionRef ? tiempoEmision - ultimaEmisionRef : 0;
    ultimaEmisionRef = tiempoEmision;
    
    const horaEmision = new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) {
      console.log(`[Socket Service] 📤 Emitiendo sensor:update [${horaEmision}] (${tiempoDesdeUltima}ms desde última):`, {
        temperatura: data.temperatura,
        humedad: data.humedad,
        timestamp: data.timestamp,
        tipoTimestamp: typeof data.timestamp,
        clientesConectados: io.sockets.sockets.size
      });
    }
    // Emitir inmediatamente sin throttling
    io.emit('sensor:update', data);
  } else {
    console.warn('[Socket Service] ⚠️ Socket.IO no inicializado, no se puede emitir actualización');
  }
}

export function getIO() {
  return io;
}
