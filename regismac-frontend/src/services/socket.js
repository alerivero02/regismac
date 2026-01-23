import { io } from 'socket.io-client';
import { getApiBaseUrl } from './api.js';

let socket = null;
let isConnected = false;

export function connectSocket() {
  if (socket?.connected) {
    console.log('[Socket] ✅ Socket ya está conectado, reutilizando');
    return socket;
  }

  const apiUrl = getApiBaseUrl();
  console.log('[Socket] 🔌 Conectando a:', apiUrl);
  
  socket = io(apiUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000,
    forceNew: false
  });

  socket.on('connect', () => {
    console.log('[Socket] ✅ Conectado al servidor WebSocket - ID:', socket.id);
    isConnected = true;
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] ❌ Desconectado del servidor WebSocket - Razón:', reason);
    isConnected = false;
  });

  socket.on('connect_error', (error) => {
    console.warn('[Socket] ⚠️ Error de conexión:', error.message, error);
  });
  
  socket.on('reconnect', (attemptNumber) => {
    console.log('[Socket] 🔄 Reconectado después de', attemptNumber, 'intentos');
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
  
  // Agregar listener para recibir actualizaciones del sensor
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
    connectSocket();
  }
  
  // Asegurar que el socket esté conectado
  if (!socket.connected) {
    console.warn('[Socket] ⚠️ Socket no conectado, esperando conexión...');
    socket.once('connect', () => {
      console.log('[Socket] ✅ Socket conectado, registrando listener');
      socket.on('sensor:update', callback);
    });
  } else {
    console.log('[Socket] ✅ Socket conectado, registrando listener inmediatamente');
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
