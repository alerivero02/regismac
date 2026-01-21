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
          
          // Buscar líneas completas (terminadas en \n)
          const lines = this.buffer.split('\n');
          
          // Mantener la última línea incompleta en el buffer
          this.buffer = lines.pop() || '';
          
          console.log('[WebSerial] 📋 Líneas encontradas:', lines.length, 'Buffer restante:', this.buffer.length);
          
          // Procesar cada línea completa
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) {
              console.log('[WebSerial] ⏭️ Línea vacía, saltando');
              continue;
            }
            
            console.log('[WebSerial] 📝 Procesando línea:', trimmedLine.substring(0, 100));
            
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
            
            // Logs siempre activos para diagnóstico
            console.log('[WebSerial] 📥 Línea recibida:', trimmedLine);
            console.log('[WebSerial] 🔍 Verificando si es JSON completo...', {
              empiezaConLlave: trimmedLine.startsWith('{'),
              terminaConLlave: trimmedLine.endsWith('}'),
              longitud: trimmedLine.length
            });
            
            try {
              // Intentar parsear como JSON completo
              if (trimmedLine.startsWith('{') && trimmedLine.endsWith('}')) {
                console.log('[WebSerial] ✅ Línea parece ser JSON completo, parseando...');
                const data = JSON.parse(trimmedLine);
                console.log('[WebSerial] ✅ Datos JSON parseados correctamente:', data);
                
                if (data.temperatura !== undefined && data.temperatura !== null) {
                  console.log('[WebSerial] 🌡️ Temperatura encontrada en JSON:', data.temperatura);
                  console.log('[WebSerial] 🔔 Llamando callback con temperatura:', data.temperatura);
                  console.log('[WebSerial] 📋 Callback disponible:', !!this.onDataCallback);
                  console.log('[WebSerial] 📋 Tipo de callback:', typeof this.onDataCallback);
                  
                  if (this.onDataCallback) {
                    try {
                      console.log('[WebSerial] 🚀 Ejecutando callback...');
                      // Ejecutar callback de forma asíncrona para no bloquear el loop de lectura
                      Promise.resolve(this.onDataCallback(data)).catch(callbackError => {
                        console.error('[WebSerial] ❌ Error en callback (async):', callbackError);
                      });
                      console.log('[WebSerial] ✅ Callback ejecutado correctamente');
                    } catch (error) {
                      console.error('[WebSerial] ❌ Error ejecutando callback:', error);
                      console.error('[WebSerial] Stack trace:', error.stack);
                    }
                  } else {
                    console.warn('[WebSerial] ⚠️ No hay callback configurado - los datos se perderán!');
                    console.warn('[WebSerial] ⚠️ Esto puede pasar si el callback se configura después de que los datos lleguen');
                  }
                } else {
                  console.warn('[WebSerial] ⚠️ JSON sin campo temperatura:', data);
                }
              } else {
                // Intentar extraer JSON de líneas con texto adicional o fragmentado
                console.log('[WebSerial] ⚠️ Línea NO es JSON completo (no empieza/termina con llaves)');
                // Buscar JSON completo en la línea (puede tener texto antes/después)
                const jsonMatch = trimmedLine.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                  console.log('[WebSerial] 📋 JSON encontrado en la línea:', jsonMatch[0]);
                  try {
                    const data = JSON.parse(jsonMatch[0]);
                    console.log('[WebSerial] ✅ JSON extraído y parseado:', data);
                    if (data.temperatura !== undefined && data.temperatura !== null) {
                      console.log('[WebSerial] 🔔 Llamando callback con temperatura extraída:', data.temperatura);
                      if (this.onDataCallback) {
                        try {
                          this.onDataCallback(data);
                          console.log('[WebSerial] ✅ Callback ejecutado correctamente');
                        } catch (error) {
                          console.error('[WebSerial] ❌ Error ejecutando callback:', error);
                        }
                      } else {
                        console.warn('[WebSerial] ⚠️ No hay callback configurado');
                      }
                    } else {
                      console.warn('[WebSerial] ⚠️ JSON sin campo temperatura:', data);
                    }
                  } catch (e) {
                    console.warn('[WebSerial] ⚠️ Error parseando JSON extraído:', e.message, 'JSON:', jsonMatch[0]);
                  }
                }
                // Intentar extraer temperatura directamente si aparece en el texto
                else if (trimmedLine.includes('temperatura') || trimmedLine.includes('temp') || trimmedLine.includes('T=')) {
                  console.log('[WebSerial] 📊 Línea con posible temperatura:', trimmedLine);
                  
                  // Buscar patrones como "temperatura":25.5 o T=25.5
                  const tempMatch = trimmedLine.match(/"temperatura"\s*:\s*([\d.-]+)/) || 
                                   trimmedLine.match(/T[=:]\s*([\d.-]+)/) ||
                                   trimmedLine.match(/temp[=:]\s*([\d.-]+)/i);
                  
                  if (tempMatch) {
                    const temperatura = parseFloat(tempMatch[1]);
                    if (!isNaN(temperatura)) {
                      console.log('[WebSerial] ✅ Temperatura extraída del patrón:', temperatura);
                      console.log('[WebSerial] 🔔 Llamando callback con temperatura extraída:', temperatura);
                      if (this.onDataCallback) {
                        try {
                          this.onDataCallback({ temperatura });
                          console.log('[WebSerial] ✅ Callback ejecutado correctamente');
                        } catch (error) {
                          console.error('[WebSerial] ❌ Error ejecutando callback:', error);
                        }
                      } else {
                        console.warn('[WebSerial] ⚠️ No hay callback configurado');
                      }
                    } else {
                      console.warn('[WebSerial] ⚠️ Temperatura extraída no es un número válido:', tempMatch[1]);
                    }
                  } else {
                    console.log('[WebSerial] ⚠️ No se encontró patrón de temperatura en la línea');
                  }
                } else {
                  console.log('[WebSerial] ⚠️ Línea no contiene JSON ni patrones de temperatura reconocidos');
                }
              }
            } catch (error) {
              if (isDev) {
                console.warn('[WebSerial] ⚠️ Error procesando línea:', trimmedLine, error.message);
              }
            }
          }
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
