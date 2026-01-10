import { Router } from "express";
import {
  getMateriali,
  getMaterialeById,
  createMateriale,
  updateMateriale,
  updateStock,
  deleteMateriale,
} from "../controllers/materiali.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get("/", getMateriali);
router.get("/:id", getMaterialeById);
router.post("/", createMateriale);
router.put("/:id", updateMateriale);
router.patch("/:id/stock", updateStock);
router.delete("/:id", deleteMateriale);

export default router;

