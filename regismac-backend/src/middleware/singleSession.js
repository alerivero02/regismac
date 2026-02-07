/**
 * Middleware de control de sesión única por usuario.
 * Comprueba contra la BD: si el usuario tiene otra sesión activa (otro dispositivo),
 * esta sesión se invalida y se devuelve 401 session_replaced.
 * No se aplica a rutas de login para no bloquear el acceso.
 */
export const enforceSingleSession = async (req, res, next) => {
  const path = req.path || req.originalUrl?.split('?')[0] || '';
  const isLoginRoute =
    path === '/api/auth/google' ||
    path === '/api/auth/google/callback' ||
    path === '/api/usuarios/login';

  if (isLoginRoute) {
    return next();
  }

  if (!req.user?.id_usuario || !req.sessionID) {
    return next();
  }

  let prisma;
  try {
    prisma = req.app?.locals?.prisma;
  } catch (_) {}
  if (!prisma) {
    return next();
  }

  try {
    const u = await prisma.usuario.findUnique({
      where: { id_usuario: req.user.id_usuario },
      select: { current_session_id: true },
    });
    const dbSessionId = u?.current_session_id ?? null;
    if (dbSessionId === null) {
      return next();
    }
    if (dbSessionId === req.sessionID) {
      return next();
    }
  } catch (_) {
    return next();
  }

  req.logout((err) => {
    if (err) console.warn('singleSession: error en logout', err);
    if (req.session) req.session.destroy(() => {});
    res.status(401).json({
      error: 'Sessione sostituita',
      code: 'session_replaced',
      message: 'Hai effettuato l\'accesso da un altro dispositivo o browser. Effettua nuovamente il login.',
    });
  });
};
