import { Router } from "express";
import multer from "multer";
import {
  getMaquinas,
  createMaquina,
  getMaquinaById,
  updateMaquina,
  updateMaquinasBatch,
  createMachineFolder
} from "../controllers/maquinas.controller.js";
import { requireAuth } from "../middleware/auth.js";
import upload, { validateImageFile } from "../middleware/upload.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get("/", getMaquinas);
router.post("/", upload.fields([{ name: 'foto1', maxCount: 1 }, { name: 'foto2', maxCount: 1 }]), validateImageFile, createMaquina);
router.post("/batch", updateMaquinasBatch);
router.get("/:id", getMaquinaById);
router.post("/:id/create-folder", createMachineFolder); // Crear carpeta para máquina existente
// Middleware para manejar errores de multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Il file è troppo grande. La dimensione massima è 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Troppi file. Massimo 2 file consentiti.'
      });
    }
    return res.status(400).json({
      error: 'Errore nel caricamento del file: ' + err.message
    });
  }
  if (err) {
    return res.status(400).json({
      error: err.message || 'Errore nel caricamento del file'
    });
  }
  next();
};

// Para PUT con archivos, el orden es importante: upload procesa los archivos, luego validateImageFile valida, luego el controlador
router.put("/:id", 
  (req, res, next) => {
    console.log('🔵 PUT /api/maquinas/:id - Iniciando middleware chain');
    console.log('🔵 Content-Type:', req.headers['content-type']);
    next();
  },
  upload.fields([{ name: 'foto1', maxCount: 1 }, { name: 'foto2', maxCount: 1 }]), 
  handleMulterError,
  validateImageFile, 
  (req, res, next) => {
    console.log('🔵 Antes de updateMaquina - Body:', JSON.stringify(req.body, null, 2));
    next();
  },
  updateMaquina
);

export default router;
