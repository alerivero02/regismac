/**
 * Middleware de control de sesión única por usuario.
 * Si el usuario tiene una sesión activa en otro dispositivo/navegador,
 * esta sesión se considera inválida y se devuelve 401 con código session_replaced.
 */
export const enforceSingleSession = (req, res, next) => {
  if (!req.user || !req.user.id_usuario) {
    return next();
  }
  // Si no hay sessionID (ej. sin cookie de sesión), dejar que requireAuth responda
  if (!req.sessionID) {
    return next();
  }
  const sessionIdInUser = req.user.current_session_id;
  if (!sessionIdInUser) {
    return next();
  }
  if (sessionIdInUser !== req.sessionID) {
    req.logout((err) => {
      if (err) {
        console.warn('singleSession: error en logout', err);
      }
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.status(401).json({
        error: 'Sessione sostituita',
        code: 'session_replaced',
        message: 'Hai effettuato l\'accesso da un altro dispositivo o browser. Effettua nuovamente il login.',
      });
    });
    return;
  }
  next();
}
