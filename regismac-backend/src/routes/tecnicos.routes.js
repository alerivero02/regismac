import { Router } from "express";
import {
  getTecnicos,
  getTecnicoById,
  createTecnico,
  updateTecnico,
  deleteTecnico,
  corregirTecnicos
} from "../controllers/tecnicos.controller.js";

import { validateSchema } from "../middlewares/validateSchema.js";
import { tecnicoSchema } from "../validations/tecnicos.schema.js";

const router = Router();

router.get("/", getTecnicos);
router.get("/corregir", corregirTecnicos); // Endpoint temporal: /api/tecnicos/corregir?token=corregir-tecnicos-2024
router.get("/:id", getTecnicoById);
router.post("/", validateSchema(tecnicoSchema), createTecnico);
router.put("/:id", validateSchema(tecnicoSchema), updateTecnico);
router.delete("/:id", deleteTecnico);

export default router;
