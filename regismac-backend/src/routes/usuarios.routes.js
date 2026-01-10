import { Router } from "express";
import {
  registrarUsuario,
  loginUsuario,
  getUsuarios,
  getPendientes,
  aprobarUsuario,
  rechazarUsuario,
  updateRol,
  establecerPassword,
} from "../controllers/usuarios.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

// Rutas públicas
router.post("/registro", registrarUsuario);
router.post("/login", loginUsuario);

// Rutas protegidas
router.post("/establecer-password", requireAuth, establecerPassword); // Cualquier usuario autenticado puede establecer su contraseña

// Rutas protegidas (requieren autenticación y rol admin)
router.get("/", requireAuth, requireAdmin, getUsuarios);
router.get("/pendientes", requireAuth, requireAdmin, getPendientes);
router.post("/:id/aprobar", requireAuth, requireAdmin, aprobarUsuario);
router.post("/:id/rechazar", requireAuth, requireAdmin, rechazarUsuario);
router.put("/:id/rol", requireAuth, requireAdmin, updateRol);

export default router;

