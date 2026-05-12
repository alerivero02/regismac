import { ApiError } from "../utils/apiError.js";
import { emitSensorUpdate } from "../services/socket.service.js";

// Almacenar el estado del sensor en memoria (en producción podría usar Redis)
// D2 = temperatura serbatoio, D4 = temperatura testina
let sensorState = {
  temperatura: null,
  temperatura_d2: null,
  temperatura_d4: null,
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
    const { temperatura, temperatura_d2, temperatura_d4, humedad } = req.body;

    const temp = temperatura !== undefined && temperatura !== null ? parseFloat(temperatura) : null;
    const tempD2 = temperatura_d2 !== undefined && temperatura_d2 !== null && temperatura_d2 !== -999 ? parseFloat(temperatura_d2) : null;
    const tempD4 = temperatura_d4 !== undefined && temperatura_d4 !== null && temperatura_d4 !== -999 ? parseFloat(temperatura_d4) : null;

    if (temp === null && tempD2 === null && tempD4 === null) {
      throw new ApiError("Al menos una temperatura es requerida (temperatura, temperatura_d2 o temperatura_d4)", 400);
    }

    // Temperatura de referencia: D2 (serbatoio) es la principal
    const temperaturaFinal = temp !== null ? temp : (tempD2 !== null ? tempD2 : tempD4);

    // Actualizar estado del sensor
    sensorState.temperatura = temperaturaFinal;
    sensorState.temperatura_d2 = tempD2;
    sensorState.temperatura_d4 = tempD4;
    sensorState.humedad = humedad ? parseFloat(humedad) : null;
    sensorState.timestamp = new Date();

    // Emitir actualización vía WebSocket (silencioso)
    try {
      emitSensorUpdate({
        temperatura: sensorState.temperatura,
        temperatura_d2: sensorState.temperatura_d2,
        temperatura_d4: sensorState.temperatura_d4,
        humedad: sensorState.humedad,
        timestamp: sensorState.timestamp.toISOString()
      });
    } catch (wsError) {
      // No fallar si WebSocket falla
    }

    // Si hay un test activo, verificar si se alcanzaron las temperaturas objetivo
    // Para registro de 0°C y -8°C, usar sensor D2 (serbatoio) directamente, sin promediar
    // Bandas hacia frío: 0°C en [-0.5, 0]; -8°C en [-8.5, -8] (evita saltos entre muestreos)
    const tempRef = sensorState.temperatura_d2 !== null ? sensorState.temperatura_d2 : sensorState.temperatura;
    if (sensorState.testActivo && sensorState.tiempoInicio && tempRef !== null) {
      const tiempoTranscurrido = Math.floor((Date.now() - sensorState.tiempoInicio) / 1000);

      if (sensorState.tiempo0Grados === null && tempRef >= -0.5 && tempRef <= 0) {
        sensorState.tiempo0Grados = tiempoTranscurrido;
        console.log(`[Sensor] 0°C alcanzado en ${tiempoTranscurrido}s`);
      }
      if (sensorState.tiempoMenos8Grados === null && tempRef >= -8.5 && tempRef <= -8) {
        sensorState.tiempoMenos8Grados = tiempoTranscurrido;
        console.log(`[Sensor] -8°C alcanzado en ${tiempoTranscurrido}s`);
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
    // Solo loguear errores reales, no datos del sensor
    if (err.statusCode !== 400) {
      console.error('[Sensor] Error:', err.message);
    }
    next(err);
  }
};

// Endpoint para obtener el estado actual del sensor
export const obtenerEstadoSensor = async (req, res, next) => {
  try {
    res.json({
      temperatura: sensorState.temperatura,
      temperatura_d2: sensorState.temperatura_d2,
      temperatura_d4: sensorState.temperatura_d4,
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

    // Tomar la temperatura de la testina (D4) al momento de iniciar el test
    // Fallback a temperatura general si D4 no está disponible
    const tempTestina = sensorState.temperatura_d4 !== null && sensorState.temperatura_d4 !== undefined
      ? sensorState.temperatura_d4
      : sensorState.temperatura;

    if (tempTestina === null || tempTestina === undefined) {
      throw new ApiError("No hay datos de temperatura disponibles del sensor. Asegúrese de que el ESP32 esté conectado y enviando datos.", 400);
    }

    // Usar la temperatura de la testina (D4) como temperatura inicial
    const temperaturaInicial = parseFloat(tempTestina);

    // Validar que la temperatura sea válida
    if (isNaN(temperaturaInicial) || temperaturaInicial < -55 || temperaturaInicial > 125) {
      throw new ApiError(`Temperatura del sensor inválida: ${tempTestina}°C. Verifique la conexión del sensor.`, 400);
    }

    // Iniciar nuevo test con la temperatura de la testina
    sensorState.testActivo = true;
    sensorState.temperaturaInicial = temperaturaInicial;
    sensorState.tiempoInicio = Date.now();
    sensorState.tiempo0Grados = null;
    sensorState.tiempoMenos8Grados = null;

    res.json({
      success: true,
      message: "Test iniciado correctamente",
      temperaturaInicial: sensorState.temperaturaInicial,
      temperatura_d4: sensorState.temperatura_d4,
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

