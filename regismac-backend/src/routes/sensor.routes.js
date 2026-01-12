import { Router } from "express";
import {
  recibirDatosSensor,
  obtenerEstadoSensor,
  iniciarTest,
  finalizarTest,
  cancelarTest,
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

export default router;

