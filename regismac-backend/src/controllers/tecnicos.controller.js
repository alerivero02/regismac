import { ApiError } from "../utils/apiError.js";
import { TecnicosService } from "../services/tecnicos.service.js";
import { PrismaClient } from "@prisma/client";

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

// Endpoint temporal para corregir técnicos en producción
// Solo accesible si se proporciona un token secreto
export const corregirTecnicos = async (req, res, next) => {
  try {
    // Verificar token secreto (puedes cambiarlo o usar una variable de entorno)
    const secretToken = req.query.token || req.headers['x-secret-token'];
    const expectedToken = process.env.CORREGIR_TECNICOS_TOKEN || 'corregir-tecnicos-2024';
    
    if (secretToken !== expectedToken) {
      throw new ApiError("No autorizado", 401);
    }

    // Usar el script definitivo
    const { limpiarTecnicosDefinitivo } = await import('../../scripts/limpiarTecnicosDefinitivo.js');
    const resultado = await limpiarTecnicosDefinitivo();

    res.json({
      success: true,
      message: "Corrección DEFINITIVA de técnicos completada",
      resumen: resultado,
      tecnicos: resultado.tecnicos.map(t => ({
        id: t.id_tecnico,
        nombre: `${t.nome} ${t.cognome}`,
        email: t.usuario?.email,
        rol: t.usuario?.rol,
        estado: t.usuario?.estado
      }))
    });
  } catch (e) {
    next(e);
  }
};
