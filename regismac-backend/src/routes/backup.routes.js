import { Router } from "express";
import { executeBackup, getBackupStatus } from "../controllers/backup.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Todas las rutas requieren autenticación y rol admin
router.post("/execute", requireAuth, requireAdmin, executeBackup);
router.get("/status", requireAuth, requireAdmin, getBackupStatus);

export default router;
