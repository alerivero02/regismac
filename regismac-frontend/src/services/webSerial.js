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
    console.log('[WebSerial] 🔍 Solicitando puerto serial...');
    if (!await this.isSupported()) {
      console.error('[WebSerial] ❌ WebSerial no disponible en este navegador');
      throw new Error('WebSerial API no está disponible en este navegador. Usa Chrome, Edge o Opera.');
    }

    try {
      console.log('[WebSerial] ⏳ Esperando selección de puerto por el usuario...');
      this.port = await navigator.serial.requestPort();
      console.log('[WebSerial] ✅ Puerto seleccionado:', {
        readable: !!this.port.readable,
        writable: !!this.port.writable,
        info: this.port.getInfo ? this.port.getInfo() : 'N/A'
      });
      return this.port;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        console.warn('[WebSerial] ⚠️ Usuario canceló la selección de puerto');
        throw new Error('No se seleccionó ningún puerto');
      }
      console.error('[WebSerial] ❌ Error al solicitar puerto:', error);
      throw error;
    }
  }

  async connect(baudRate = 115200) {
    console.log('[WebSerial] 🔌 Iniciando conexión con baudrate:', baudRate);
    if (!this.port) {
      console.error('[WebSerial] ❌ No hay puerto seleccionado');
      throw new Error('No hay puerto seleccionado. Selecciona un puerto primero.');
    }

    // Si ya está conectado, desconectar primero
    if (this.isConnected) {
      console.log('[WebSerial] ⚠️ Ya hay una conexión activa, desconectando primero...');
      await this.disconnect();
    }

    try {
      // Verificar si el puerto ya está abierto
      if (this.port.readable && this.port.writable) {
        console.log('[WebSerial] ⚠️ El puerto ya está abierto, reutilizando...');
        // El puerto ya está abierto, solo configurar el reader/writer
        this.isConnected = true;
      } else {
        // Abrir el puerto
        console.log('[WebSerial] 🔓 Abriendo puerto...');
        await this.port.open({ baudRate });
        console.log('[WebSerial] ✅ Puerto abierto con baudrate:', baudRate);
        this.isConnected = true;
      }

      // Configurar writer
      if (this.port.writable && !this.writer) {
        this.writer = this.port.writable.getWriter();
      }
      
      // Configurar reader - SIEMPRE recrear el reader para asegurar que el callback esté activo
      if (this.port.readable) {
        const isDev = import.meta.env.DEV;
        
        // Si ya hay un reader, cancelarlo primero
        if (this.reader) {
          try {
            await this.reader.cancel();
            await this.reader.releaseLock();
          } catch (e) {
            // Ignorar errores al cancelar
          }
          this.reader = null;
        }
        
        if (isDev) {
          console.log('[WebSerial] 🔧 Configurando reader...');
          console.log('[WebSerial] 📋 Callback disponible ANTES de crear reader:', !!this.onDataCallback);
        }
        
        // CRÍTICO: Verificar que el callback esté configurado antes de crear el reader
        // Si no hay callback, esperar hasta que esté disponible (máximo 2 segundos)
        let callbackReady = !!this.onDataCallback;
        let waitAttempts = 0;
        const maxWaitAttempts = 20; // 20 * 100ms = 2 segundos máximo
        
        while (!callbackReady && waitAttempts < maxWaitAttempts) {
          if (isDev) {
            console.log(`[WebSerial] ⏳ Esperando callback... (intento ${waitAttempts + 1}/${maxWaitAttempts})`);
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          callbackReady = !!this.onDataCallback;
          waitAttempts++;
        }
        
        if (!callbackReady) {
          console.warn('[WebSerial] ⚠️ Callback no disponible después de esperar, continuando de todas formas...');
        } else {
          if (isDev) {
            console.log('[WebSerial] ✅ Callback confirmado antes de crear reader');
          }
        }
        
        // Crear decoder y reader
        const decoder = new TextDecoderStream();
        const readableStream = this.port.readable.pipeThrough(decoder);
        const reader = readableStream.getReader();
        this.reader = reader;
        
        if (isDev) {
          console.log('[WebSerial] ✅ Reader configurado, iniciando lectura...');
          console.log('[WebSerial] 📋 Callback disponible DESPUÉS de crear reader:', !!this.onDataCallback);
        }
        
        // Esperar un momento adicional para que el ESP32 termine de bootear
        // Esto evita leer mensajes de boot que pueden interferir
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (isDev) {
          console.log('[WebSerial] 🚀 Iniciando loop de lectura...');
        }
        
        // Iniciar lectura en segundo plano - esto debe continuar indefinidamente
        this.readData().catch(err => {
          if (isDev) {
            console.error('[WebSerial] ❌ Error en readData:', err);
          }
          // Si hay un error, intentar reconectar si aún está conectado
          if (this.isConnected && this.port && this.port.readable) {
            if (isDev) {
              console.log('[WebSerial] 🔄 Intentando reconectar después de error...');
            }
            setTimeout(() => {
              this.readData().catch(() => {});
            }, 1000);
          }
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
    const isDev = import.meta.env.DEV;
    if (!this.reader || !this.isConnected) {
      if (isDev) {
        console.warn('[WebSerial] ⚠️ readData: reader o conexión no disponible', {
          reader: !!this.reader,
          isConnected: this.isConnected
        });
      }
      return;
    }

    if (isDev) {
      console.log('[WebSerial] 🔄 Iniciando lectura de datos...');
    }

    try {
      // Loop continuo - debe seguir leyendo mientras esté conectado
      while (this.isConnected && this.port && this.port.readable) {
        // Si no hay reader, intentar recrearlo
        if (!this.reader) {
          const isDev = import.meta.env.DEV;
          if (isDev) {
            console.log('[WebSerial] 🔄 No hay reader, recreando...');
          }
          try {
            const decoder = new TextDecoderStream();
            const readableStream = this.port.readable.pipeThrough(decoder);
            this.reader = readableStream.getReader();
            if (isDev) {
              console.log('[WebSerial] ✅ Reader recreado');
            }
          } catch (error) {
            if (isDev) {
              console.error('[WebSerial] ❌ Error recreando reader:', error);
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        
        // Verificar que el callback esté disponible antes de leer
        // Si no hay callback, esperar un poco pero no bloquear indefinidamente
        if (!this.onDataCallback) {
          const isDev = import.meta.env.DEV;
          if (isDev) {
            console.warn('[WebSerial] ⚠️ No hay callback configurado, esperando...');
          }
          // Esperar un poco antes de continuar (máximo 1 segundo)
          await new Promise(resolve => setTimeout(resolve, 100));
          // Si después de esperar sigue sin haber callback, continuar de todas formas
          // para no bloquear el loop, pero los datos se perderán
          if (!this.onDataCallback) {
            if (isDev) {
              console.warn('[WebSerial] ⚠️ Callback aún no disponible después de esperar, continuando...');
            }
          }
          continue;
        }
        
        try {
          const { value, done } = await this.reader.read();
        
        if (done) {
          if (isDev) {
            console.log('[WebSerial] ⚠️ Reader marcado como terminado (done=true)');
            console.log('[WebSerial] 🔍 Verificando si el puerto sigue siendo readable...');
            console.log('[WebSerial] Estado:', {
              isConnected: this.isConnected,
              portReadable: this.port?.readable,
              reader: !!this.reader
            });
          }
          
          // Si el puerto sigue siendo readable, intentar recrear el reader
          if (this.isConnected && this.port && this.port.readable) {
            if (isDev) {
              console.log('[WebSerial] 🔄 El puerto sigue siendo readable, recreando reader...');
            }
            try {
              // Cerrar el reader anterior
              if (this.reader) {
                try {
                  await this.reader.cancel();
                } catch (e) {
                  // Ignorar errores al cancelar
                }
              }
              
              // Crear un nuevo reader
              const decoder = new TextDecoderStream();
              const readableStream = this.port.readable.pipeThrough(decoder);
              this.reader = readableStream.getReader();
              
              if (isDev) {
                console.log('[WebSerial] ✅ Reader recreado, continuando lectura...');
              }
              continue; // Continuar el loop con el nuevo reader
            } catch (error) {
              if (isDev) {
                console.error('[WebSerial] ❌ Error recreando reader:', error);
              }
              break;
            }
          } else {
            // El puerto realmente se cerró
            if (isDev) {
              console.log('[WebSerial] Reader terminado - puerto cerrado');
            }
            break;
          }
        }

        if (value) {
          console.log('[WebSerial] 📦 Datos recibidos (raw):', {
            valor: value,
            tipo: typeof value,
            longitud: value.length,
            primerosCaracteres: value.substring(0, 50)
          });
          // Agregar datos al buffer
          this.buffer += value;
          console.log('[WebSerial] 📋 Buffer actualizado, longitud total:', this.buffer.length);
          
          // Procesar JSON completos del buffer (pueden estar divididos entre múltiples chunks)
          // Buscar todos los JSON completos en el buffer
          let processed = false;
          let bufferChanged = true;
          
          while (bufferChanged) {
            bufferChanged = false;
            const bufferLength = this.buffer.length;
            
            // Buscar el primer '{' en el buffer
            const firstBrace = this.buffer.indexOf('{');
            if (firstBrace === -1) {
              // No hay JSON en el buffer, limpiar si es muy grande (más de 10KB)
              if (this.buffer.length > 10000) {
                console.warn('[WebSerial] ⚠️ Buffer muy grande sin JSON, limpiando...');
                this.buffer = '';
              }
              break;
            }
            
            // Buscar el '}' correspondiente, contando llaves anidadas
            let braceCount = 0;
            let jsonEnd = -1;
            for (let i = firstBrace; i < this.buffer.length; i++) {
              if (this.buffer[i] === '{') {
                braceCount++;
              } else if (this.buffer[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                  jsonEnd = i;
                  break;
                }
              }
            }
            
            if (jsonEnd !== -1) {
              // Encontramos un JSON completo
              const jsonStr = this.buffer.substring(firstBrace, jsonEnd + 1);
              const trimmedJson = jsonStr.trim();
              
              // Remover el JSON procesado del buffer (incluyendo cualquier texto antes)
              this.buffer = this.buffer.substring(jsonEnd + 1);
              bufferChanged = true;
              processed = true;
              
              console.log('[WebSerial] 📝 Procesando JSON encontrado:', trimmedJson.substring(0, 100));
              
              // Ignorar líneas de boot del ESP32
              if (trimmedJson.includes('ets Jul') || 
                  trimmedJson.includes('rst:') || 
                  trimmedJson.includes('boot:') ||
                  trimmedJson.includes('configsip:') ||
                  trimmedJson.includes('SPIWP:') ||
                  trimmedJson.includes('POWERON_RESET') ||
                  trimmedJson.includes('SPI_FAST_FLASH_BOOT')) {
                const isDev = import.meta.env.DEV;
                if (isDev) {
                  console.log('[WebSerial] ⏭️ Ignorando JSON de boot:', trimmedJson.substring(0, 50));
                }
                continue;
              }
              
              try {
                const data = JSON.parse(trimmedJson);
                console.log('[WebSerial] ✅ Datos JSON parseados correctamente:', data);
                
                if (data.temperatura !== undefined && data.temperatura !== null) {
                  console.log('[WebSerial] 🌡️ Temperatura encontrada en JSON:', data.temperatura);
                  console.log('[WebSerial] 🔔 Llamando callback con temperatura:', data.temperatura);
                  
                  if (this.onDataCallback) {
                    try {
                      // Ejecutar callback de forma asíncrona para no bloquear el loop de lectura
                      // Usar setTimeout para evitar problemas con extensiones del navegador
                      setTimeout(() => {
                        try {
                          const result = this.onDataCallback(data);
                          // Si el callback retorna una promesa, manejarla
                          if (result && typeof result.then === 'function') {
                            result.catch(callbackError => {
                              console.error('[WebSerial] ❌ Error en callback (async):', callbackError);
                            });
                          }
                        } catch (syncError) {
                          console.error('[WebSerial] ❌ Error ejecutando callback (sync):', syncError);
                        }
                      }, 0);
                      console.log('[WebSerial] ✅ Callback programado para ejecución');
                    } catch (error) {
                      console.error('[WebSerial] ❌ Error programando callback:', error);
                      console.error('[WebSerial] Stack trace:', error.stack);
                    }
                  } else {
                    console.warn('[WebSerial] ⚠️ No hay callback configurado - los datos se perderán!');
                  }
                } else {
                  console.warn('[WebSerial] ⚠️ JSON sin campo temperatura:', data);
                }
              } catch (parseError) {
                console.warn('[WebSerial] ⚠️ Error parseando JSON:', parseError.message, 'JSON:', trimmedJson.substring(0, 100));
                
                // Intentar extraer temperatura directamente si aparece en el texto
                if (trimmedJson.includes('temperatura') || trimmedJson.includes('temp')) {
                  const tempMatch = trimmedJson.match(/"temperatura"\s*:\s*([\d.-]+)/);
                  if (tempMatch) {
                    const temperatura = parseFloat(tempMatch[1]);
                    if (!isNaN(temperatura)) {
                      console.log('[WebSerial] ✅ Temperatura extraída del patrón:', temperatura);
                      if (this.onDataCallback) {
                        try {
                          // Usar setTimeout para evitar problemas con extensiones del navegador
                          setTimeout(() => {
                            try {
                              const result = this.onDataCallback({ temperatura });
                              // Si el callback retorna una promesa, manejarla
                              if (result && typeof result.then === 'function') {
                                result.catch(callbackError => {
                                  console.error('[WebSerial] ❌ Error en callback (async):', callbackError);
                                });
                              }
                            } catch (syncError) {
                              console.error('[WebSerial] ❌ Error ejecutando callback (sync):', syncError);
                            }
                          }, 0);
                          console.log('[WebSerial] ✅ Callback programado para ejecución');
                        } catch (error) {
                          console.error('[WebSerial] ❌ Error programando callback:', error);
                        }
                      }
                    }
                  }
                }
              }
            } else {
              // No hay JSON completo aún, pero hay una llave de apertura
              // Si el buffer es muy grande sin encontrar un cierre, puede haber un problema
              if (this.buffer.length > 5000) {
                console.warn('[WebSerial] ⚠️ Buffer grande sin JSON completo, buscando desde el siguiente {');
                // Buscar el siguiente '{' y descartar lo anterior
                const nextBrace = this.buffer.indexOf('{', firstBrace + 1);
                if (nextBrace !== -1) {
                  this.buffer = this.buffer.substring(nextBrace);
                  bufferChanged = true;
                } else {
                  // No hay más llaves, limpiar buffer
                  this.buffer = '';
                  break;
                }
              } else {
                // Esperar más datos
                break;
              }
            }
          }
          
          // Procesar líneas que no son JSON (para logs de boot, etc.)
          if (!processed && this.buffer.length > 0) {
            // Dividir por líneas para procesar mensajes de boot
            const lines = this.buffer.split(/\r?\n/);
            // Mantener solo la última línea incompleta en el buffer
            const lastLine = lines.pop() || '';
            
            // Si hay líneas completas que procesar
            if (lines.length > 0) {
              // Limpiar el buffer de líneas ya procesadas
              this.buffer = lastLine;
              
              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) {
                  continue;
                }
                
                // Ignorar líneas de boot del ESP32
                if (trimmedLine.includes('ets Jul') || 
                    trimmedLine.includes('rst:') || 
                    trimmedLine.includes('boot:') ||
                    trimmedLine.includes('configsip:') ||
                    trimmedLine.includes('SPIWP:') ||
                    trimmedLine.includes('POWERON_RESET') ||
                    trimmedLine.includes('SPI_FAST_FLASH_BOOT') ||
                    trimmedLine.includes('load:0x') ||
                    trimmedLine.includes('entry 0x') ||
                    trimmedLine.includes('mode:DIO') ||
                    trimmedLine.includes('clock div:')) {
                  // Ignorar líneas de boot
                  continue;
                }
                
                // Si la línea contiene un JSON parcial, esperar más datos
                if (trimmedLine.includes('{') && !trimmedLine.includes('}')) {
                  // JSON incompleto, mantener en buffer
                  this.buffer = trimmedLine + '\n' + this.buffer;
                  break;
                }
              }
            }
          }
          
          console.log('[WebSerial] 📋 Buffer restante después de procesar:', this.buffer.length);
        }
        } catch (readError) {
          // Si hay un error al leer, intentar recrear el reader
          const isDev = import.meta.env.DEV;
          if (isDev) {
            console.warn('[WebSerial] ⚠️ Error leyendo datos:', readError);
          }
          
          // Si el reader está terminado pero el puerto sigue siendo readable, recrear
          if (this.isConnected && this.port && this.port.readable) {
            try {
              if (this.reader) {
                try {
                  await this.reader.cancel();
                  await this.reader.releaseLock();
                } catch (e) {
                  // Ignorar errores
                }
              }
              const decoder = new TextDecoderStream();
              const readableStream = this.port.readable.pipeThrough(decoder);
              this.reader = readableStream.getReader();
              if (isDev) {
                console.log('[WebSerial] ✅ Reader recreado después de error');
              }
              // Continuar el loop
              continue;
            } catch (recreateError) {
              if (isDev) {
                console.error('[WebSerial] ❌ Error recreando reader:', recreateError);
              }
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
          } else {
            // El puerto se cerró realmente
            break;
          }
        }
      }
    } catch (error) {
      const isDev = import.meta.env.DEV;
      if (this.isConnected && this.onDataCallback) {
        this.onDataCallback({ error: error.message });
      }
      // Si hay error, intentar reconectar si el puerto sigue siendo readable
      if (error.name !== 'NetworkError' && this.isConnected && this.port && this.port.readable) {
        if (isDev) {
          console.error('[WebSerial] ❌ Error en readData, intentando reconectar:', error);
        }
        // Intentar reconectar después de un delay
        setTimeout(() => {
          if (this.isConnected && this.port && this.port.readable) {
            this.readData().catch(() => {});
          }
        }, 1000);
      } else if (isDev) {
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
      const isDev = import.meta.env.DEV;
      if (isDev) {
        console.error('[WebSerial] Error al desconectar:', error);
      }
    }
  }

  setDataCallback(callback) {
    const isDev = import.meta.env.DEV;
    // Guardar el callback de forma síncrona para asegurar que esté disponible inmediatamente
    this.onDataCallback = callback;
    if (isDev) {
      console.log('[WebSerial] ✅ Callback actualizado:', !!callback);
      console.log('[WebSerial] 📋 Callback tipo:', typeof callback);
    }
    
    // Si ya hay un reader activo, el callback se usará automáticamente en el próximo ciclo de lectura
    // No necesitamos recrear el reader, solo asegurarnos de que el callback esté disponible
    if (this.isConnected && this.port && this.port.readable && this.reader) {
      if (isDev) {
        console.log('[WebSerial] ℹ️ Reader ya activo, callback se usará en próxima lectura');
      }
    }
    
    // Si hay un reader pero está terminado, recrearlo
    if (this.isConnected && this.port && this.port.readable && (!this.reader || this.reader === null)) {
      if (isDev) {
        console.log('[WebSerial] 🔄 Recreando reader para usar nuevo callback...');
      }
      // Recrear el reader para asegurar que use el nuevo callback
      const decoder = new TextDecoderStream();
      const readableStream = this.port.readable.pipeThrough(decoder);
      this.reader = readableStream.getReader();
      this.readData().catch(err => {
        if (isDev) {
          console.error('[WebSerial] ❌ Error en readData después de recrear reader:', err);
        }
      });
    }
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
