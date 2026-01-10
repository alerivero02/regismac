import { ApiError } from "../utils/apiError.js";
import { UsuariosService } from "../services/usuarios.service.js";
import jwt from 'jsonwebtoken';

export const registrarUsuario = async (req, res, next) => {
  try {
    const service = new UsuariosService(req.app.locals.prisma);
    const { email, password, nombre, apellido } = req.body;

    // Validar campos requeridos
    if (!email || !nombre) {
      throw new ApiError("Email e nome sono obbligatori", 400);
    }
    
    // Si no hay password ni google_id, es un error
    if (!password && !google_id) {
      throw new ApiError("Devi fornire una password o registrarti con Google", 400);
    }

    // Verificar si el email ya existe
    const usuarioExistente = await service.findByEmail(email);
    if (usuarioExistente) {
      throw new ApiError("L'email è già registrato", 400);
    }

    // Crear usuario con estado pendiente
    const nuevoUsuario = await service.create({
      email,
      password,
      nombre,
      apellido: apellido || null,
      estado: 'pendiente',
    });

    // No retornar la contraseña
    const { password: _, ...usuarioSinPassword } = nuevoUsuario;

    res.status(201).json({
      message: "Utente registrato. In attesa di approvazione dell'amministratore.",
      usuario: usuarioSinPassword,
    });
  } catch (err) {
    next(err);
  }
};

export const loginUsuario = async (req, res, next) => {
  try {
    const service = new UsuariosService(req.app.locals.prisma);
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError("Email e password sono obbligatori", 400);
    }

    // Buscar usuario
    const usuario = await service.findByEmail(email);
    if (!usuario) {
      throw new ApiError("Credenziali non valide", 401);
    }

    // Verificar si está aprobado
    if (usuario.estado !== 'aprobado') {
      throw new ApiError(
        usuario.estado === 'pendiente' 
          ? "Il tuo account è in attesa di approvazione" 
          : "Il tuo account è stato rifiutato",
        403
      );
    }

    // Verificar si el usuario tiene contraseña establecida
    if (!usuario.password) {
      // Si no tiene contraseña, debe usar Google o establecer una primero
      throw new ApiError("Questo account non ha una password impostata. Accedi con Google oppure imposta una password dal tuo profilo.", 401);
    }

    // Verificar contraseña
    const passwordValido = await service.verificarPassword(password, usuario.password);
    if (!passwordValido) {
      throw new ApiError("Credenziali non valide", 401);
    }

    // Crear sesión (sin password)
    const { password: _, ...usuarioSinPassword } = usuario;
    req.login(usuarioSinPassword, (err) => {
      if (err) {
        return next(err);
      }
      res.json({
        message: "Accesso effettuato con successo",
        usuario: usuarioSinPassword,
      });
    });
  } catch (err) {
    next(err);
  }
};

export const getUsuarios = async (req, res, next) => {
  try {
    // Verificar que sea admin
    if (!req.user || req.user.rol !== 'admin') {
      throw new ApiError("No autorizado. Se requiere rol de administrador", 403);
    }

    const service = new UsuariosService(req.app.locals.prisma);
    const usuarios = await service.findAll();
    
    // No retornar contraseñas
    const usuariosSinPassword = usuarios.map(u => {
      const { password, ...rest } = u;
      return rest;
    });

    res.json(usuariosSinPassword);
  } catch (err) {
    next(err);
  }
};

export const getPendientes = async (req, res, next) => {
  try {
    const service = new UsuariosService(req.app.locals.prisma);
    const pendientes = await service.getPendientes();
    
    // No retornar contraseñas
    const pendientesSinPassword = pendientes.map(u => {
      const { password, ...rest } = u;
      return rest;
    });

    res.json(pendientesSinPassword);
  } catch (err) {
    next(err);
  }
};

export const aprobarUsuario = async (req, res, next) => {
  try {
    const service = new UsuariosService(req.app.locals.prisma);
    const { TecnicosService } = await import("../services/tecnicos.service.js");
    const tecnicosService = new TecnicosService(req.app.locals.prisma);
    
    const id = Number(req.params.id);
    const usuarioAprobado = await service.aprobarUsuario(id, req.user.id_usuario);

    // Crear técnico automáticamente para el usuario aprobado
    try {
      await tecnicosService.prisma.tecnico.create({
        data: {
          nome: usuarioAprobado.nombre,
          cognome: usuarioAprobado.apellido || '',
          id_usuario: usuarioAprobado.id_usuario
        }
      });
    } catch (error) {
      // Si ya existe un técnico para este usuario, ignorar el error
      if (error.code !== 'P2002' && !error.message?.includes('Unique constraint')) {
        throw error;
      }
    }

    const { password: _, ...usuarioSinPassword } = usuarioAprobado;
    res.json({
      message: "Utente approvato con successo",
      usuario: usuarioSinPassword,
    });
  } catch (err) {
    next(err);
  }
};

export const establecerPassword = async (req, res, next) => {
  try {
    const service = new UsuariosService(req.app.locals.prisma);
    
    // El usuario solo puede establecer su propia contraseña, o un admin puede establecerla para cualquier usuario
    const userId = req.user.rol === 'admin' && req.body.id_usuario 
      ? Number(req.body.id_usuario) 
      : req.user.id_usuario;
    
    const { password } = req.body;
    
    if (!password) {
      throw new ApiError("La password è obbligatoria", 400);
    }

    const usuarioActualizado = await service.establecerPassword(userId, password);
    const { password: _, ...usuarioSinPassword } = usuarioActualizado;

    res.json({
      message: "Password impostata con successo",
      usuario: usuarioSinPassword,
    });
  } catch (err) {
    next(err);
  }
};

export const rechazarUsuario = async (req, res, next) => {
  try {
    const service = new UsuariosService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const usuarioRechazado = await service.rechazarUsuario(id, req.user.id_usuario);

    const { password: _, ...usuarioSinPassword } = usuarioRechazado;
    res.json({
      message: "Utente rifiutato",
      usuario: usuarioSinPassword,
    });
  } catch (err) {
    next(err);
  }
};

export const updateRol = async (req, res, next) => {
  try {
    // Verificar que sea admin
    if (!req.user || req.user.rol !== 'admin') {
      throw new ApiError("Non autorizzato. È richiesto il ruolo di amministratore", 403);
    }

    const service = new UsuariosService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const { rol } = req.body;

    if (!rol) {
      throw new ApiError("Il campo 'rol' è obbligatorio", 400);
    }

    const usuarioActualizado = await service.updateRol(id, rol);
    const { password: _, ...usuarioSinPassword } = usuarioActualizado;

    res.json({
      message: "Ruolo aggiornato con successo",
      usuario: usuarioSinPassword,
    });
  } catch (err) {
    next(err);
  }
};

