class WebSerialService {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.isConnected = false;
    this.onDataCallback = null;
    this.readLoop = null;
    this.buffer = ''; // Buffer para acumular datos parciales
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
          const isDev = import.meta.env.DEV;
          if (isDev) {
            console.log('[WebSerial] Reader terminado');
          }
          break;
        }

        if (value) {
          // Agregar datos al buffer
          this.buffer += value;
          
          // Buscar líneas completas (terminadas en \n)
          const lines = this.buffer.split('\n');
          
          // Mantener la última línea incompleta en el buffer
          this.buffer = lines.pop() || '';
          
          // Procesar cada línea completa
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;
            
            // Ignorar líneas de boot del ESP32
            if (trimmedLine.includes('ets Jul') || 
                trimmedLine.includes('rst:') || 
                trimmedLine.includes('boot:') ||
                trimmedLine.includes('configsip:') ||
                trimmedLine.includes('SPIWP:') ||
                trimmedLine.includes('POWERON_RESET') ||
                trimmedLine.includes('SPI_FAST_FLASH_BOOT')) {
              // Ignorar líneas de boot, solo loguear en desarrollo
              const isDev = import.meta.env.DEV;
              if (isDev) {
                console.log('[WebSerial] ⏭️ Ignorando línea de boot:', trimmedLine);
              }
              continue;
            }
            
            // Logs solo en desarrollo
            const isDev = import.meta.env.DEV;
            if (isDev) {
              console.log('[WebSerial] 📥 Línea recibida:', trimmedLine);
            }
            
            try {
              // Intentar parsear como JSON completo
              if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
                const data = JSON.parse(trimmedLine);
                if (isDev) {
                  console.log('[WebSerial] ✅ Datos JSON parseados:', data);
                }
                
                if (data.temperatura !== undefined && data.temperatura !== null) {
                  if (this.onDataCallback) {
                    this.onDataCallback(data);
                  }
                } else if (isDev) {
                  console.warn('[WebSerial] ⚠️ JSON sin campo temperatura:', data);
                }
              } 
              // Intentar extraer JSON de líneas con texto adicional o fragmentado
              else {
                // Buscar JSON completo en la línea (puede tener texto antes/después)
                const jsonMatch = trimmedLine.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                  try {
                    const data = JSON.parse(jsonMatch[0]);
                    if (isDev) {
                      console.log('[WebSerial] ✅ JSON extraído:', data);
                    }
                    if (data.temperatura !== undefined && data.temperatura !== null) {
                      if (this.onDataCallback) {
                        this.onDataCallback(data);
                      }
                    }
                  } catch (e) {
                    if (isDev) {
                      console.warn('[WebSerial] ⚠️ Error parseando JSON extraído:', e.message);
                    }
                  }
                }
                // Intentar extraer temperatura directamente si aparece en el texto
                else if (trimmedLine.includes('temperatura') || trimmedLine.includes('temp') || trimmedLine.includes('T=')) {
                  if (isDev) {
                    console.log('[WebSerial] 📊 Línea con posible temperatura:', trimmedLine);
                  }
                  
                  // Buscar patrones como "temperatura":25.5 o T=25.5
                  const tempMatch = trimmedLine.match(/"temperatura"\s*:\s*([\d.-]+)/) || 
                                   trimmedLine.match(/T[=:]\s*([\d.-]+)/) ||
                                   trimmedLine.match(/temp[=:]\s*([\d.-]+)/i);
                  
                  if (tempMatch) {
                    const temperatura = parseFloat(tempMatch[1]);
                    if (!isNaN(temperatura)) {
                      if (isDev) {
                        console.log('[WebSerial] ✅ Temperatura extraída:', temperatura);
                      }
                      if (this.onDataCallback) {
                        this.onDataCallback({ temperatura });
                      }
                    }
                  }
                }
              }
            } catch (error) {
              if (isDev) {
                console.warn('[WebSerial] ⚠️ Error procesando línea:', trimmedLine, error.message);
              }
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
        console.error('[WebSerial] ❌ Error en readData:', error);
      }
    }
  }

  async disconnect() {
    this.isConnected = false;
    this.buffer = ''; // Limpiar buffer al desconectar

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
      console.error('[WebSerial] Error al desconectar:', error);
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
