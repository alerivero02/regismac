import { io } from 'socket.io-client';
import { getApiBaseUrl } from './api.js';

let socket = null;
let isConnected = false;

export function connectSocket() {
  if (socket?.connected) {
    console.log('[Socket] ✅ Socket ya está conectado, reutilizando - ID:', socket.id);
    return socket;
  }

  // Si hay un socket existente pero desconectado, limpiarlo primero
  if (socket && !socket.connected) {
    console.log('[Socket] 🧹 Limpiando socket desconectado anterior');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    isConnected = false;
  }

  const apiUrl = getApiBaseUrl();
  console.log('[Socket] 🔌 Conectando a:', apiUrl);
  
  socket = io(apiUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity, // Reintentar indefinidamente
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: false,
    autoConnect: true
  });

  socket.on('connect', () => {
    console.log('[Socket] ✅ Conectado al servidor WebSocket - ID:', socket.id, {
      transport: socket.io.engine.transport.name
    });
    isConnected = true;
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] ❌ Desconectado del servidor WebSocket - Razón:', reason);
    isConnected = false;
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] ❌ Error de conexión:', {
      message: error.message,
      type: error.type,
      description: error.description,
      context: error.context
    });
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket] 🔄 Reconectado después de', attemptNumber, 'intentos');
    isConnected = true;
  });
  
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('[Socket] 🔄 Intento de reconexión', attemptNumber);
  });
  
  socket.on('reconnect_error', (error) => {
    console.warn('[Socket] ⚠️ Error al reconectar:', error.message);
  });
  
  socket.on('reconnect_failed', () => {
    console.error('[Socket] ❌ Falló la reconexión después de todos los intentos');
  });
  
  // Agregar listener para recibir actualizaciones del sensor (siempre activo)
  socket.on('sensor:update', (data) => {
    console.log('[Socket] 📨 Evento sensor:update recibido:', {
      temperatura: data.temperatura,
      humedad: data.humedad,
      timestamp: data.timestamp,
      horaRecepcion: new Date().toLocaleTimeString()
    });
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    isConnected = false;
  }
}

export function onSensorUpdate(callback) {
  if (!socket) {
    console.log('[Socket] 🔌 Socket no existe, creando nueva conexión...');
    connectSocket();
  }
  
  // Asegurar que el socket esté conectado
  if (!socket.connected) {
    console.log('[Socket] ⏳ Socket no conectado aún, esperando conexión...');
    // Registrar el listener de todas formas, se activará cuando se conecte
    socket.on('sensor:update', callback);
    
    // También esperar el evento connect para confirmar
    socket.once('connect', () => {
      console.log('[Socket] ✅ Socket conectado, listener ya registrado');
    });
  } else {
    console.log('[Socket] ✅ Socket conectado, registrando listener inmediatamente - ID:', socket.id);
    socket.on('sensor:update', callback);
  }
}

export function offSensorUpdate(callback) {
  if (socket) {
    socket.off('sensor:update', callback);
  }
}

export function getSocketStatus() {
  return {
    connected: isConnected || socket?.connected || false,
    socket: socket
  };
}
