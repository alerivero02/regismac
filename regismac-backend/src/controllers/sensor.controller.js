import { ApiError } from "../utils/apiError.js";
import { emitSensorUpdate } from "../services/socket.service.js";

// Almacenar el estado del sensor en memoria (en producción podría usar Redis)
let sensorState = {
  temperatura: null,
  humedad: null,
  timestamp: null,
  testActivo: false,
  temperaturaInicial: null,
  tiempoInicio: null,
  tiempo0Grados: null,
  tiempoMenos8Grados: null,
};

// Endpoint para que el ESP32 envíe datos de temperatura
export const recibirDatosSensor = async (req, res, next) => {
  try {
    console.log('📡 recibirDatosSensor - Request recibido:', {
      body: req.body,
      headers: {
        'content-type': req.headers['content-type'],
        'origin': req.headers['origin'],
        'user-agent': req.headers['user-agent']
      }
    });

    const { temperatura, humedad } = req.body;

    if (temperatura === undefined || temperatura === null) {
      console.error('❌ recibirDatosSensor - Temperatura no proporcionada');
      throw new ApiError("Temperatura es requerida", 400);
    }

    console.log('✅ recibirDatosSensor - Datos válidos:', { temperatura, humedad });

    // Actualizar estado del sensor
    sensorState.temperatura = parseFloat(temperatura);
    sensorState.humedad = humedad ? parseFloat(humedad) : null;
    sensorState.timestamp = new Date();

    console.log('✅ recibirDatosSensor - Estado actualizado:', {
      temperatura: sensorState.temperatura,
      humedad: sensorState.humedad,
      timestamp: sensorState.timestamp.toISOString()
    });

    // Emitir actualización vía WebSocket
    try {
      const updateData = {
        temperatura: sensorState.temperatura,
        humedad: sensorState.humedad,
        timestamp: sensorState.timestamp.toISOString() // Convertir a ISO string para serialización correcta
      };
      emitSensorUpdate(updateData);
      console.log('✅ recibirDatosSensor - Actualización emitida vía WebSocket:', {
        temperatura: updateData.temperatura,
        timestamp: updateData.timestamp
      });
    } catch (wsError) {
      console.error('⚠️ recibirDatosSensor - Error al emitir WebSocket:', wsError.message);
      // No fallar si WebSocket falla
    }

    // Si hay un test activo, verificar si se alcanzaron las temperaturas objetivo
    if (sensorState.testActivo && sensorState.tiempoInicio) {
      const tiempoTranscurrido = Math.floor((Date.now() - sensorState.tiempoInicio) / 1000); // segundos

      // Detectar 0°C (con tolerancia de ±0.5°C)
      if (sensorState.tiempo0Grados === null && 
          sensorState.temperatura >= -0.5 && 
          sensorState.temperatura <= 0.5) {
        sensorState.tiempo0Grados = tiempoTranscurrido;
      }

      // Detectar -8°C (con tolerancia de ±0.5°C)
      if (sensorState.tiempoMenos8Grados === null && 
          sensorState.temperatura >= -8.5 && 
          sensorState.temperatura <= -7.5) {
        sensorState.tiempoMenos8Grados = tiempoTranscurrido;
      }
    }

    const response = {
      success: true,
      message: "Datos recibidos correctamente",
      estado: sensorState.testActivo ? {
        temperaturaInicial: sensorState.temperaturaInicial,
        tiempoTranscurrido: sensorState.tiempoInicio ? Math.floor((Date.now() - sensorState.tiempoInicio) / 1000) : 0,
        tiempo0Grados: sensorState.tiempo0Grados,
        tiempoMenos8Grados: sensorState.tiempoMenos8Grados,
      } : null
    };
    
    console.log('✅ recibirDatosSensor - Enviando respuesta:', response);
    res.json(response);
  } catch (err) {
    console.error('❌ recibirDatosSensor - Error:', {
      message: err.message,
      stack: err.stack
    });
    next(err);
  }
};

// Endpoint para obtener el estado actual del sensor
export const obtenerEstadoSensor = async (req, res, next) => {
  try {
    res.json({
      temperatura: sensorState.temperatura,
      humedad: sensorState.humedad,
      timestamp: sensorState.timestamp,
      testActivo: sensorState.testActivo,
      temperaturaInicial: sensorState.temperaturaInicial,
      tiempoInicio: sensorState.tiempoInicio,
      tiempoTranscurrido: sensorState.tiempoInicio 
        ? Math.floor((Date.now() - sensorState.tiempoInicio) / 1000) 
        : 0,
      tiempo0Grados: sensorState.tiempo0Grados,
      tiempoMenos8Grados: sensorState.tiempoMenos8Grados,
    });
  } catch (err) {
    next(err);
  }
};

// Endpoint para iniciar un test (llamado desde el frontend)
export const iniciarTest = async (req, res, next) => {
  try {
    if (sensorState.testActivo) {
      throw new ApiError("Ya hay un test activo. Debe finalizar el test actual primero.", 400);
    }

    // Tomar la temperatura actual del sensor ESP32 al momento de iniciar el test
    if (sensorState.temperatura === null || sensorState.temperatura === undefined) {
      throw new ApiError("No hay datos de temperatura disponibles del sensor. Asegúrese de que el ESP32 esté conectado y enviando datos.", 400);
    }

    // Usar la temperatura actual del sensor como temperatura inicial
    const temperaturaInicial = parseFloat(sensorState.temperatura);

    // Validar que la temperatura sea válida
    if (isNaN(temperaturaInicial) || temperaturaInicial < -55 || temperaturaInicial > 125) {
      throw new ApiError(`Temperatura del sensor inválida: ${sensorState.temperatura}°C. Verifique la conexión del sensor.`, 400);
    }

    // Iniciar nuevo test con la temperatura actual del sensor
    sensorState.testActivo = true;
    sensorState.temperaturaInicial = temperaturaInicial;
    sensorState.tiempoInicio = Date.now();
    sensorState.tiempo0Grados = null;
    sensorState.tiempoMenos8Grados = null;

    console.log('✅ Test iniciado con temperatura inicial del sensor:', {
      temperaturaInicial: sensorState.temperaturaInicial,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: "Test iniciado correctamente",
      temperaturaInicial: sensorState.temperaturaInicial,
      tiempoInicio: sensorState.tiempoInicio,
    });
  } catch (err) {
    next(err);
  }
};

// Endpoint para finalizar un test (llamado desde el frontend)
export const finalizarTest = async (req, res, next) => {
  try {
    if (!sensorState.testActivo) {
      throw new ApiError("No hay un test activo", 400);
    }

    // Calcular tiempo transcurrido total
    const tiempoTranscurrido = sensorState.tiempoInicio 
      ? Math.floor((Date.now() - sensorState.tiempoInicio) / 1000) 
      : 0;
    
    const resultado = {
      temperaturaInicial: sensorState.temperaturaInicial,
      tiempo0Grados: sensorState.tiempo0Grados,
      tiempoMenos8Grados: sensorState.tiempoMenos8Grados,
      humedad: sensorState.humedad,
      tiempoTranscurrido: tiempoTranscurrido,
    };

    // Resetear estado
    sensorState.testActivo = false;
    sensorState.temperaturaInicial = null;
    sensorState.tiempoInicio = null;
    sensorState.tiempo0Grados = null;
    sensorState.tiempoMenos8Grados = null;

    res.json({
      success: true,
      message: "Test finalizado",
      resultado,
    });
  } catch (err) {
    next(err);
  }
};

// Endpoint para cancelar un test
export const cancelarTest = async (req, res, next) => {
  try {
    // Resetear estado
    sensorState.testActivo = false;
    sensorState.temperaturaInicial = null;
    sensorState.tiempoInicio = null;
    sensorState.tiempo0Grados = null;
    sensorState.tiempoMenos8Grados = null;

    res.json({
      success: true,
      message: "Test cancelado",
    });
  } catch (err) {
    next(err);
  }
};

