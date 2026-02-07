import { Server } from 'socket.io';

let io = null;

export function initializeSocketIO(httpServer) {
  // Configurar CORS para Socket.IO
  const corsOrigin = process.env.FRONTEND_URL || 
                     (process.env.NODE_ENV === 'production' 
                       ? process.env.BACKEND_URL || "*" 
                       : "*");
  
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) console.log('[Socket] CORS:', corsOrigin);

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  io.on('connection', (socket) => {
    if (!isProd) console.log('[Socket] conectado:', socket.id);
    socket.on('disconnect', () => {});
    socket.on('error', (err) => {
      if (isProd) return;
      console.error('[Socket] error:', socket.id, err?.message);
    });
  });
  io.engine.on('connection_error', (err) => {
    if (!isProd) console.error('[Socket] connection_error:', err?.message);
  });

  if (!isProd) console.log('[Socket] OK');
  return io;
}

let ultimaEmisionRef = null;

export function emitSensorUpdate(data) {
  if (io) {
    const tiempoEmision = Date.now();
    const tiempoDesdeUltima = ultimaEmisionRef ? tiempoEmision - ultimaEmisionRef : 0;
    ultimaEmisionRef = tiempoEmision;
    
    const horaEmision = new Date().toLocaleTimeString('es-ES', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    
    // Obtener lista de sockets conectados de forma más confiable
    const socketsArray = Array.from(io.sockets.sockets.values());
    const clientesConectados = socketsArray.length;
    
    if (process.env.NODE_ENV !== 'production') {
      if (clientesConectados > 0) {
        console.log('[Socket] sensor:update', { temp: data.temperatura, clientes: clientesConectados });
      }
    }
    io.emit('sensor:update', data);
  }
}

export function getIO() {
  return io;
}
