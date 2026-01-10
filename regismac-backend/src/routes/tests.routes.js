import { Router } from "express";
import {
  getTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  getTestsByMaquina,
} from "../controllers/tests.controller.js";

import { requireAuth } from "../middleware/auth.js";
import { validateSchema } from "../middlewares/validateSchema.js";
import { testSchema } from "../validations/tests.schema.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get("/", getTests);
router.get("/:id", getTestById);
router.get("/maquina/:maquinaId", getTestsByMaquina);
router.post("/", validateSchema(testSchema), createTest);
router.put("/:id", validateSchema(testSchema), updateTest);
router.delete("/:id", deleteTest);

export default router;
