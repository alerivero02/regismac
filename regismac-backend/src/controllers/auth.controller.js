import passport from "passport";
import { ApiError } from "../utils/apiError.js";
import { UsuariosService } from "../services/usuarios.service.js";

// Función helper para obtener la URL del frontend correcta
function getFrontendURL(req, host = null) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL;
  }
  
  const backendHost = host || req.get('host');
  if (backendHost.includes('localhost') || backendHost.includes('127.0.0.1')) {
    return 'http://localhost:5173';
  }
  
  // Si es una IP local, usar esa IP para el frontend también
  return `http://${backendHost.split(':')[0]}:5173`;
}

export const googleAuth = async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('❌ Google OAuth no configurado: faltan variables de entorno');
      return res.status(503).json({ 
        error: "Google OAuth non configurato. Contatta l'amministratore." 
      });
    }

    // Verificar que passport tenga la estrategia de Google configurada
    // Si no está configurada, intentar configurarla ahora (por si las variables de entorno
    // no estaban disponibles cuando se cargó el módulo)
    if (!passport._strategies || !passport._strategies.google) {
      console.warn('⚠️  Estrategia de Google no encontrada, intentando configurar...');
      // Re-importar passport para forzar reconfiguración
      const passportModule = await import('../config/passport.js');
      const passportInstance = passportModule.default;
      
      if (!passportInstance._strategies || !passportInstance._strategies.google) {
        console.error('❌ Estrategia de Google no está configurada en Passport');
        console.error('❌ Variables disponibles:', {
          GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Sí' : 'No',
          GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Sí' : 'No',
          BACKEND_URL: process.env.BACKEND_URL
        });
        return res.status(503).json({ 
          error: "Google OAuth non configurato. Contatta l'amministratore." 
        });
      }
    }
    
    // Detectar si viene de una IP local (no localhost)
    const referer = req.get('referer');
    const host = req.get('host');
    let frontendIP = null;
    
    if (referer) {
      try {
        const refererURL = new URL(referer);
        if (refererURL.hostname && !refererURL.hostname.includes('localhost') && refererURL.hostname !== '127.0.0.1') {
          frontendIP = refererURL.hostname;
        }
      } catch (e) {
        // Ignorar errores
      }
    }
    
    if (!frontendIP && host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      frontendIP = host.split(':')[0];
    }
    
    // Si viene de una IP local, guardar la URL del frontend en la sesión
    if (frontendIP) {
      req.session.originalFrontendURL = `http://${frontendIP}:5173`;
    }
    
    // Usar siempre localhost para el callback (como estaba al inicio)
    // El callback funcionará porque el servidor está escuchando en 0.0.0.0
    return passport.authenticate("google", {
      scope: ["profile", "email", "https://www.googleapis.com/auth/drive.file"],
    })(req, res, next);
  } catch (error) {
    console.error('❌ Error en googleAuth:', error);
    console.error('❌ Stack:', error.stack);
    return res.status(500).json({
      error: "Errore interno del server",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const googleCallback = async (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    const frontendURL = process.env.FRONTEND_URL || req.session?.originalFrontendURL || getFrontendURL(req);
    return res.redirect(`${frontendURL}/login?error=auth_failed`);
  }
  
  // En producción, usar FRONTEND_URL de las variables de entorno
  // En desarrollo, detectar automáticamente
  const frontendURL = process.env.FRONTEND_URL || req.session?.originalFrontendURL || getFrontendURL(req);
  
  passport.authenticate("google", {
    failureRedirect: `${frontendURL}/login?error=auth_failed`,
  })(req, res, async (err) => {
    if (err) {
      // Manejar errores específicos de OAuth
      console.error('❌ Error en Google OAuth callback:', err);
      console.error('❌ Detalles del error:', {
        message: err.message,
        code: err.code,
        status: err.status,
        oauthError: err.oauthError,
        stack: err.stack
      });
      
      if (err.message && err.message.includes('redirect_uri_mismatch')) {
        console.error(`⚠️  El redirect_uri no coincide.`);
        console.error(`⚠️  Asegúrate de tener http://localhost:3000/api/auth/google/callback en Google Cloud Console`);
        return res.redirect(`${frontendURL}/login?error=redirect_uri_mismatch`);
      }
      
      return next(err);
    }

    try {
      const googleUser = req.user;
      
      if (!googleUser) {
        console.error('❌ No se recibió el usuario de Google OAuth');
        return res.redirect(`${frontendURL}/login?error=auth_failed`);
      }

      if (!req.app || !req.app.locals || !req.app.locals.prisma) {
        console.error('❌ Prisma no está disponible en req.app.locals');
        return res.redirect(`${frontendURL}/login?error=server_error`);
      }
      
      const { UsuariosService } = await import("../services/usuarios.service.js");
      const service = new UsuariosService(req.app.locals.prisma);

      // Buscar si el usuario ya existe por Google ID o email
      let usuario = await service.findByGoogleId(googleUser.google_id);
      
      if (!usuario) {
        // Si no se encuentra por google_id, buscar por email
        usuario = await service.findByEmail(googleUser.email);
        
        if (usuario) {
          // Usuario existe pero no tiene google_id, actualizarlo
          const datosActualizacion = {
            google_id: googleUser.google_id,
            google_email: googleUser.email,
            foto: googleUser.foto,
          };
          
          // SIEMPRE actualizar refresh token si está presente
          if (googleUser.refreshToken) {
            datosActualizacion.google_refresh_token = googleUser.refreshToken;
          }
          
          usuario = await service.update(usuario.id_usuario, datosActualizacion);
        } else {
          // Usuario no existe, crear nuevo con estado pendiente
          const datosCreacion = {
            email: googleUser.email,
            nombre: googleUser.nombre,
            apellido: googleUser.apellido,
            google_id: googleUser.google_id,
            google_email: googleUser.email,
            foto: googleUser.foto,
            estado: 'pendiente',
          };
          
          // SIEMPRE guardar refresh token si está presente
          if (googleUser.refreshToken) {
            datosCreacion.google_refresh_token = googleUser.refreshToken;
          }
          
          usuario = await service.create(datosCreacion);
        }
      } else {
        // Usuario encontrado por google_id, actualizar datos si es necesario
        const datosActualizacion = {};
        
        // Actualizar foto si cambió
        if (googleUser.foto && googleUser.foto !== usuario.foto) {
          datosActualizacion.foto = googleUser.foto;
        }
        
        // Actualizar refresh token si está presente
        if (googleUser.refreshToken) {
          datosActualizacion.google_refresh_token = googleUser.refreshToken;
        }
        
        // Solo actualizar si hay cambios
        if (Object.keys(datosActualizacion).length > 0) {
          usuario = await service.update(usuario.id_usuario, datosActualizacion);
        }
      }

      // Verificar si está aprobado
      if (usuario.estado !== 'aprobado') {
        // Si está pendiente, redirigir con mensaje amigable
        if (usuario.estado === 'pendiente') {
          return res.redirect(`${frontendURL}/login?solicitud_enviada=true`);
        }
        // Si está rechazado, mostrar error
        return res.redirect(`${frontendURL}/login?error=rechazado`);
      }

      // Guardar accessToken y refreshToken en la sesión para usar con Google Drive
      if (googleUser.accessToken) {
        req.session.googleAccessToken = googleUser.accessToken;
      }
      if (googleUser.refreshToken) {
        req.session.googleRefreshToken = googleUser.refreshToken;
      }

      // Guardar usuario en sesión (sin password) y agregar tokens
      const { password, ...usuarioSinPassword } = usuario;
      const usuarioConToken = {
        ...usuarioSinPassword,
        accessToken: googleUser.accessToken, // Para usar con Google Drive
        refreshToken: googleUser.refreshToken, // Para renovar el access token
      };
      req.login(usuarioConToken, (loginErr) => {
        if (loginErr) {
          console.error('❌ Error al hacer login:', loginErr);
          return res.redirect(`${frontendURL}/login?error=auth_failed`);
        }
        // Redirigir al frontend usando la URL detectada
        res.redirect(`${frontendURL}/`);
      });
    } catch (error) {
      console.error('❌ Error en googleCallback:', error);
      console.error('❌ Stack:', error.stack);
      console.error('❌ Error details:', {
        message: error.message,
        name: error.name,
        code: error.code
      });
      return res.redirect(`${frontendURL}/login?error=server_error`);
    }
  });
};

export const logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: "Error al cerrar sesión" });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Error al destruir sesión" });
      }
      res.json({ message: "Sesión cerrada correctamente" });
    });
  });
};

export const getCurrentUser = async (req, res) => {
  // Verificar que req.user existe y tiene los campos necesarios
  if (req.user && req.user.id_usuario) {
    try {
      // Obtener el usuario completo de la base de datos para verificar si tiene contraseña
      const { UsuariosService } = await import("../services/usuarios.service.js");
      const service = new UsuariosService(req.app.locals.prisma);
      const usuarioCompleto = await service.findById(req.user.id_usuario);
      
      // Devolver usuario sin password pero con indicador si tiene password
      const { password, ...usuarioSinPassword } = usuarioCompleto || req.user;
      const usuarioRespuesta = {
        ...usuarioSinPassword,
        tiene_password: !!password, // Indicador booleano si tiene contraseña
      };
      
      res.json(usuarioRespuesta);
    } catch (error) {
      // Si hay error, devolver el usuario de la sesión
      res.json(req.user);
    }
  } else {
    // No hay sesión activa o el usuario no está autenticado
    res.status(401).json({ error: "No autenticado" });
  }
};

