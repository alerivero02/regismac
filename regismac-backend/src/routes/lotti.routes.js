import express from 'express';
import {
  getLotti,
  getLottoById,
  createLotto,
  updateLotto,
  deleteLotto,
  asignarMaquinasPorRango,
  getMaquinasDisponiblesEnRango,
  quitarMaquinaDelLote
} from '../controllers/lotti.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

router.get('/', getLotti);
router.get('/disponibles', getMaquinasDisponiblesEnRango);
router.get('/:id', getLottoById);
router.post('/', createLotto);
router.put('/:id', updateLotto);
router.delete('/:id', deleteLotto);
router.post('/:id/asignar-rango', asignarMaquinasPorRango);
router.post('/:id/quitar-maquina', quitarMaquinaDelLote);

export default router;

