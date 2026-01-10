import { ApiError } from "../utils/apiError.js";
import { TecnicosService } from "../services/tecnicos.service.js";

export const getTecnicos = async (req, res, next) => {
  try {
    const service = new TecnicosService(req.app.locals.prisma);
    const data = await service.getTecnicosFromUsuarios();
    res.json(data);
  } catch (e) {
    console.error('❌ Error en getTecnicos:', {
      message: e.message,
      code: e.code,
      name: e.name,
      stack: e.stack
    });
    next(e);
  }
};

export const getTecnicoById = async (req, res, next) => {
  try {
    const service = new TecnicosService(req.app.locals.prisma);
    const id = Number(req.params.id);

    const tecnico = await service.findById(id);
    if (!tecnico) throw new ApiError("Técnico no encontrado", 404);

    res.json(tecnico);
  } catch (e) {
    next(e);
  }
};

export const createTecnico = async (req, res, next) => {
  try {
    const service = new TecnicosService(req.app.locals.prisma);
    const nuevo = await service.create(req.body);
    res.status(201).json(nuevo);
  } catch (e) {
    next(e);
  }
};

export const updateTecnico = async (req, res, next) => {
  try {
    const service = new TecnicosService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const updated = await service.update(id, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const deleteTecnico = async (req, res, next) => {
  try {
    const service = new TecnicosService(req.app.locals.prisma);
    const id = Number(req.params.id);
    await service.delete(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
