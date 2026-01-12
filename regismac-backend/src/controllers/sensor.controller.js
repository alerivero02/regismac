import { ApiError } from "../utils/apiError.js";

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
    const { temperatura, humedad } = req.body;

    if (temperatura === undefined || temperatura === null) {
      throw new ApiError("Temperatura es requerida", 400);
    }

    // Actualizar estado del sensor
    sensorState.temperatura = parseFloat(temperatura);
    sensorState.humedad = humedad ? parseFloat(humedad) : null;
    sensorState.timestamp = new Date();

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

    res.json({
      success: true,
      message: "Datos recibidos correctamente",
      estado: sensorState.testActivo ? {
        temperaturaInicial: sensorState.temperaturaInicial,
        tiempoTranscurrido: sensorState.tiempoInicio ? Math.floor((Date.now() - sensorState.tiempoInicio) / 1000) : 0,
        tiempo0Grados: sensorState.tiempo0Grados,
        tiempoMenos8Grados: sensorState.tiempoMenos8Grados,
      } : null
    });
  } catch (err) {
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
    const { temperaturaInicial } = req.body;

    if (sensorState.testActivo) {
      throw new ApiError("Ya hay un test activo. Debe finalizar el test actual primero.", 400);
    }

    if (temperaturaInicial === undefined || temperaturaInicial === null) {
      throw new ApiError("Temperatura inicial es requerida", 400);
    }

    // Iniciar nuevo test
    sensorState.testActivo = true;
    sensorState.temperaturaInicial = parseFloat(temperaturaInicial);
    sensorState.tiempoInicio = Date.now();
    sensorState.tiempo0Grados = null;
    sensorState.tiempoMenos8Grados = null;

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

    const resultado = {
      temperaturaInicial: sensorState.temperaturaInicial,
      tiempo0Grados: sensorState.tiempo0Grados,
      tiempoMenos8Grados: sensorState.tiempoMenos8Grados,
      humedad: sensorState.humedad,
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

