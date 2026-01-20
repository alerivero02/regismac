import { Router } from "express";
import {
  getTecnicos,
  getTecnicoById,
  createTecnico,
  updateTecnico,
  deleteTecnico
} from "../controllers/tecnicos.controller.js";

import { validateSchema } from "../middlewares/validateSchema.js";
import { tecnicoSchema } from "../validations/tecnicos.schema.js";

const router = Router();

router.get("/", getTecnicos);
router.get("/:id", getTecnicoById);
router.post("/", validateSchema(tecnicoSchema), createTecnico);
router.put("/:id", validateSchema(tecnicoSchema), updateTecnico);
router.delete("/:id", deleteTecnico);

export default router;
