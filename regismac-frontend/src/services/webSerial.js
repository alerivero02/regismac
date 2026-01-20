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
      throw new Error('No hay puerto seleccionado');
    }

    try {
      await this.port.open({ baudRate });
      this.isConnected = true;

      this.writer = this.port.writable.getWriter();
      
      const decoder = new TextDecoderStream();
      this.readLoop = this.port.readable
        .pipeTo(decoder.writable)
        .then(() => {
          const reader = decoder.readable.getReader();
          this.reader = reader;
          this.readData();
        });

      return true;
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Error al conectar: ${error.message}`);
    }
  }

  async readData() {
    if (!this.reader) return;

    try {
      while (this.isConnected && this.port && this.port.readable) {
        const { value, done } = await this.reader.read();
        if (done) break;

        const text = value;
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            if (line.trim().startsWith('{') && line.trim().endsWith('}')) {
              const data = JSON.parse(line.trim());
              if (this.onDataCallback) {
                this.onDataCallback(data);
              }
            }
          } catch (error) {
            // Ignorar errores de parsing
          }
        }
      }
    } catch (error) {
      if (this.isConnected && this.onDataCallback) {
        this.onDataCallback({ error: error.message });
      }
    }
  }

  async disconnect() {
    this.isConnected = false;

    try {
      if (this.reader) {
        await this.reader.cancel();
        await this.reader.releaseLock();
        this.reader = null;
      }

      if (this.writer) {
        await this.writer.releaseLock();
        this.writer = null;
      }

      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (error) {
      // Ignorar errores al desconectar
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
