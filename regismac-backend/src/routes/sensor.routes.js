import { Router } from "express";
import {
  recibirDatosSensor,
  obtenerEstadoSensor,
  iniciarTest,
  finalizarTest,
  cancelarTest,
  listarPuertos,
  conectarESP32,
  desconectarESP32,
  obtenerEstadoConexion,
} from "../controllers/sensor.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Ruta pública para que el ESP32 envíe datos (sin autenticación)
router.post("/datos", recibirDatosSensor);

// Rutas protegidas para el frontend (requieren autenticación)
router.get("/estado", requireAuth, obtenerEstadoSensor);
router.post("/iniciar", requireAuth, iniciarTest);
router.post("/finalizar", requireAuth, finalizarTest);
router.post("/cancelar", requireAuth, cancelarTest);

// Rutas para gestión de conexión serial USB
router.get("/puertos", requireAuth, listarPuertos);
router.post("/conectar", requireAuth, conectarESP32);
router.post("/desconectar", requireAuth, desconectarESP32);
router.get("/conexion", requireAuth, obtenerEstadoConexion);

export default router;

