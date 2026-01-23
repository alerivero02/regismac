import { Server } from 'socket.io';

let io = null;

export function initializeSocketIO(httpServer) {
  // Configurar CORS para Socket.IO
  const corsOrigin = process.env.FRONTEND_URL || 
                     (process.env.NODE_ENV === 'production' 
                       ? process.env.BACKEND_URL || "*" 
                       : "*");
  
  console.log('[Socket Service] 🔌 Inicializando Socket.IO con CORS:', corsOrigin);
  
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
    console.log('✅ Cliente WebSocket conectado:', socket.id, {
      transport: socket.conn.transport.name,
      clientesConectados: io.sockets.sockets.size
    });
    
    socket.on('disconnect', (reason) => {
      console.log('❌ Cliente WebSocket desconectado:', socket.id, 'Razón:', reason);
    });
    
    socket.on('error', (error) => {
      console.error('❌ Error en socket:', socket.id, error);
    });
  });
  
  io.engine.on('connection_error', (err) => {
    console.error('❌ Error de conexión Socket.IO:', {
      message: err.message,
      code: err.code,
      context: err.context
    });
  });

  console.log('[Socket Service] ✅ Socket.IO inicializado correctamente');
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
    
    // Log detallado de sockets conectados
    if (clientesConectados > 0) {
      console.log(`[Socket Service] 📤 Emitiendo sensor:update [${horaEmision}] (${tiempoDesdeUltima}ms desde última):`, {
        temperatura: data.temperatura,
        humedad: data.humedad,
        timestamp: data.timestamp,
        tipoTimestamp: typeof data.timestamp,
        clientesConectados: clientesConectados,
        socketIds: socketsArray.map(s => s.id)
      });
    } else {
      console.warn(`[Socket Service] ⚠️ Emitiendo sensor:update [${horaEmision}] pero NO hay clientes conectados:`, {
        temperatura: data.temperatura,
        clientesConectados: clientesConectados,
        ioExists: !!io,
        socketsSize: io.sockets.sockets.size
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
