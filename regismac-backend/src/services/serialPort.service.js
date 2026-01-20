import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { logSecurityEvent, SecurityEventType } from '../utils/securityLogger.js';

let serialPort = null;
let parser = null;
let isConnected = false;
let currentPort = null;
let onDataCallback = null;

/**
 * Detectar puertos USB disponibles
 */
export async function detectPorts() {
  try {
    const ports = await SerialPort.list();
    return ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer || 'Desconocido',
      vendorId: port.vendorId,
      productId: port.productId,
      serialNumber: port.serialNumber,
    }));
  } catch (error) {
    console.error('Error al detectar puertos:', error);
    throw error;
  }
}

/**
 * Detectar automáticamente el puerto del ESP32
 * Busca puertos que puedan ser ESP32 (basado en manufacturer o vendorId común)
 */
export async function detectESP32Port() {
  try {
    const ports = await detectPorts();
    
    // Buscar ESP32 por manufacturer común
    const esp32Ports = ports.filter(port => {
      const manufacturer = (port.manufacturer || '').toLowerCase();
      const path = (port.path || '').toLowerCase();
      
      // ESP32 comúnmente aparece como:
      // - Silicon Labs (CP210x)
      // - CH340
      // - FTDI
      // - Espressif
      return manufacturer.includes('silicon') ||
             manufacturer.includes('ch340') ||
             manufacturer.includes('ftdi') ||
             manufacturer.includes('espressif') ||
             path.includes('usb') ||
             path.includes('com'); // Windows COM ports
    });
    
    if (esp32Ports.length === 0) {
      return null;
    }
    
    // Si hay múltiples, devolver el primero
    // En el futuro se podría implementar una lógica más sofisticada
    return esp32Ports[0].path;
  } catch (error) {
    console.error('Error al detectar puerto ESP32:', error);
    return null;
  }
}

/**
 * Conectar al puerto serial
 */
export async function connectToPort(portPath, baudRate = 115200) {
  try {
    // Cerrar conexión existente si hay
    if (serialPort && serialPort.isOpen) {
      await disconnect();
    }
    
    // Crear nueva conexión
    serialPort = new SerialPort({
      path: portPath,
      baudRate: baudRate,
      autoOpen: false,
    });
    
    // Configurar parser para leer líneas
    parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));
    
    // Manejar datos recibidos
    parser.on('data', (data) => {
      try {
        // Intentar parsear JSON
        const jsonData = JSON.parse(data.toString().trim());
        if (onDataCallback) {
          onDataCallback(jsonData);
        }
      } catch (error) {
        // Si no es JSON válido, intentar leer como texto plano
        console.log('Datos recibidos (no JSON):', data.toString());
      }
    });
    
    // Manejar errores
    serialPort.on('error', (error) => {
      console.error('Error en puerto serial:', error);
      isConnected = false;
      if (onDataCallback) {
        onDataCallback({ error: error.message });
      }
    });
    
    // Abrir puerto
    return new Promise((resolve, reject) => {
      serialPort.open((error) => {
        if (error) {
          console.error('Error al abrir puerto:', error);
          isConnected = false;
          reject(error);
        } else {
          console.log(`✅ Conectado al puerto serial: ${portPath} (${baudRate} baud)`);
          isConnected = true;
          currentPort = portPath;
          resolve(portPath);
        }
      });
    });
  } catch (error) {
    console.error('Error al conectar al puerto:', error);
    throw error;
  }
}

/**
 * Conectar automáticamente al ESP32
 */
export async function connectToESP32() {
  try {
    const portPath = await detectESP32Port();
    
    if (!portPath) {
      throw new Error('No se encontró ningún puerto ESP32 disponible');
    }
    
    return await connectToPort(portPath);
  } catch (error) {
    console.error('Error al conectar automáticamente al ESP32:', error);
    throw error;
  }
}

/**
 * Desconectar del puerto serial
 */
export async function disconnect() {
  return new Promise((resolve) => {
    if (serialPort && serialPort.isOpen) {
      serialPort.close((error) => {
        if (error) {
          console.error('Error al cerrar puerto:', error);
        } else {
          console.log('Puerto serial cerrado');
        }
        isConnected = false;
        currentPort = null;
        serialPort = null;
        parser = null;
        resolve();
      });
    } else {
      isConnected = false;
      currentPort = null;
      serialPort = null;
      parser = null;
      resolve();
    }
  });
}

/**
 * Obtener estado de la conexión
 */
export function getConnectionStatus() {
  return {
    connected: isConnected,
    port: currentPort,
    isOpen: serialPort ? serialPort.isOpen : false,
  };
}

/**
 * Establecer callback para datos recibidos
 */
export function setDataCallback(callback) {
  onDataCallback = callback;
}

/**
 * Verificar si está conectado
 */
export function isPortConnected() {
  return isConnected && serialPort && serialPort.isOpen;
}
