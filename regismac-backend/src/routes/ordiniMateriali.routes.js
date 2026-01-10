import { Router } from "express";
import {
  getOrdini,
  getOrdineById,
  getOrdiniByMateriale,
  createOrdine,
  createOrdiniBulk,
  updateOrdine,
  deleteOrdine,
  cancelAllOrdini,
  deleteAllOrdini,
  resendEmailOrdine,
} from "../controllers/ordiniMateriali.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get("/", getOrdini);
router.get("/materiale/:materialeId", getOrdiniByMateriale);
router.post("/", createOrdine);
router.post("/bulk", createOrdiniBulk);
router.post("/cancel-all", cancelAllOrdini);
router.delete("/delete-all", deleteAllOrdini);
router.post("/:id/resend-email", resendEmailOrdine);
router.get("/:id", getOrdineById);
router.put("/:id", updateOrdine);
router.delete("/:id", deleteOrdine);

export default router;

