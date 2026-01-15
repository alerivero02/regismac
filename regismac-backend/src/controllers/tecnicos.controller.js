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

    const prisma = req.app.locals.prisma;
    let corregidos = 0;
    let creados = 0;
    let eliminados = 0;
    let errores = 0;

    // PASO 1: Eliminar registros de técnico con roles incorrectos
    const todosLosTecnicos = await prisma.tecnico.findMany({
      where: {
        id_usuario: { not: null }
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            rol: true,
            estado: true,
            email: true
          }
        }
      }
    });

    for (const tecnico of todosLosTecnicos) {
      if (tecnico.usuario) {
        const rolLower = (tecnico.usuario.rol || '').toLowerCase();
        if (rolLower !== 'tecnico') {
          try {
            await prisma.tecnico.delete({
              where: { id_tecnico: tecnico.id_tecnico }
            });
            eliminados++;
          } catch (deleteError) {
            errores++;
          }
        }
      } else {
        try {
          await prisma.tecnico.delete({
            where: { id_tecnico: tecnico.id_tecnico }
          });
          eliminados++;
        } catch (deleteError) {
          errores++;
        }
      }
    }

    // PASO 2: Obtener usuarios técnicos aprobados
    const usuariosTecnicos = await prisma.usuario.findMany({
      where: {
        estado: 'aprobado',
        rol: 'tecnico'
      },
      select: {
        id_usuario: true,
        nombre: true,
        apellido: true,
        email: true,
        tecnico: {
          select: {
            id_tecnico: true
          }
        }
      }
    });

    // PASO 3: Crear técnicos para usuarios que no los tienen
    for (const usuario of usuariosTecnicos) {
      if (!usuario.tecnico) {
        try {
          await prisma.tecnico.create({
            data: {
              nome: usuario.nombre,
              cognome: usuario.apellido || '',
              id_usuario: usuario.id_usuario
            }
          });
          creados++;
        } catch (createError) {
          if (createError.code !== 'P2002') {
            errores++;
          }
        }
      }
    }

    // PASO 4: Verificar resultado final
    const tecnicosFinales = await prisma.tecnico.findMany({
      where: {
        usuario: {
          rol: 'tecnico',
          estado: 'aprobado'
        }
      },
      include: {
        usuario: {
          select: {
            email: true,
            rol: true,
            estado: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Corrección de técnicos completada",
      resumen: {
        eliminados,
        creados,
        totalTecnicosValidos: tecnicosFinales.length,
        errores
      },
      tecnicos: tecnicosFinales.map(t => ({
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
