class WebSerialService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.onDataCallback = null;
    this.readLoop = null;
  }

  async isSupported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  async requestPort() {
    if (!await this.isSupported()) {
      throw new Error('WebSerial API no está disponible en este navegador. Usa Chrome, Edge o Opera.');
    }

    try {
      this.port = await navigator.serial.requestPort();
      return this.port;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        throw new Error('No se seleccionó ningún puerto');
      }
      throw error;
    }
  }

  async connect(baudRate = 115200) {
    if (!this.port) {
      throw new Error('No hay puerto seleccionado. Selecciona un puerto primero.');
    }

    // Si ya está conectado, desconectar primero
    if (this.isConnected) {
      await this.disconnect();
    }

    try {
      // Verificar si el puerto ya está abierto
      if (this.port.readable && this.port.writable) {
        // El puerto ya está abierto, solo configurar el reader/writer
        this.isConnected = true;
      } else {
        // Abrir el puerto
        await this.port.open({ baudRate });
        this.isConnected = true;
      }

      // Configurar writer
      if (this.port.writable && !this.writer) {
        this.writer = this.port.writable.getWriter();
      }
      
      // Configurar reader
      if (this.port.readable && !this.reader) {
        const decoder = new TextDecoderStream();
        const readableStream = this.port.readable.pipeThrough(decoder);
        const reader = readableStream.getReader();
        this.reader = reader;
        
        // Iniciar lectura en segundo plano
        this.readData().catch(err => {
          console.error('Error en readData:', err);
        });
      }

      return true;
    } catch (error) {
      this.isConnected = false;
      this.port = null;
      
      // Mensajes de error más descriptivos
      let errorMessage = 'Error al conectar al puerto serial';
      if (error.message.includes('Failed to open')) {
        errorMessage = 'El puerto serial está en uso o no está disponible. Cierra otras aplicaciones que puedan estar usando el puerto (Arduino IDE, Monitor Serial, etc.)';
      } else if (error.message.includes('No port selected')) {
        errorMessage = 'No se seleccionó ningún puerto. Selecciona un puerto USB.';
      } else if (error.message.includes('Access denied')) {
        errorMessage = 'Acceso denegado al puerto. Verifica los permisos del navegador.';
      } else {
        errorMessage = `Error al conectar: ${error.message}`;
      }
      
      throw new Error(errorMessage);
    }
  }

  async readData() {
    if (!this.reader || !this.isConnected) return;

    try {
      while (this.isConnected && this.port && this.port.readable && this.reader) {
        const { value, done } = await this.reader.read();
        if (done) {
          console.log('Reader terminado');
          break;
        }

        if (value) {
          const text = value;
          const lines = text.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const trimmedLine = line.trim();
              // Intentar parsear como JSON
              if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
                const data = JSON.parse(trimmedLine);
                console.log('[WebSerial] Datos parseados:', data);
                if (this.onDataCallback) {
                  this.onDataCallback(data);
                }
              } else if (trimmedLine.includes('temperatura') || trimmedLine.includes('temp')) {
                // Intentar extraer temperatura de líneas que no son JSON puro
                console.log('[WebSerial] Línea con posible temperatura:', trimmedLine);
              }
            } catch (error) {
              // Loggear errores de parsing para depuración
              console.warn('[WebSerial] Error al parsear línea:', line.trim(), error.message);
            }
          }
        }
      }
    } catch (error) {
      if (this.isConnected && this.onDataCallback) {
        this.onDataCallback({ error: error.message });
      }
      // Si hay error, desconectar
      if (error.name !== 'NetworkError') {
        console.error('Error en readData:', error);
      }
    }
  }

  async disconnect() {
    this.isConnected = false;

    try {
      // Cancelar reader primero
      if (this.reader) {
        try {
          await this.reader.cancel();
          await this.reader.releaseLock();
        } catch (error) {
          // Ignorar errores al cancelar reader
        }
        this.reader = null;
      }

      // Liberar writer
      if (this.writer) {
        try {
          await this.writer.releaseLock();
        } catch (error) {
          // Ignorar errores al liberar writer
        }
        this.writer = null;
      }

      // Cerrar puerto
      if (this.port) {
        try {
          // Verificar si el puerto está abierto antes de cerrarlo
          if (this.port.readable || this.port.writable) {
            await this.port.close();
          }
        } catch (error) {
          // Ignorar errores al cerrar puerto (puede que ya esté cerrado)
        }
        this.port = null;
      }
    } catch (error) {
      console.error('Error al desconectar:', error);
    }
  }

  setDataCallback(callback) {
    this.onDataCallback = callback;
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      port: this.port ? 'WebSerial' : null,
    };
  }
}

let webSerialInstance = null;

export function getWebSerialInstance() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!webSerialInstance) {
    webSerialInstance = new WebSerialService();
  }
  return webSerialInstance;
}

export default getWebSerialInstance;
