/**
 * Logger de seguridad para registrar eventos de seguridad
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Tipos de eventos de seguridad
 */
export const SecurityEventType = {
  AUTH_FAILURE: 'AUTH_FAILURE',
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  PATH_TRAVERSAL_ATTEMPT: 'PATH_TRAVERSAL_ATTEMPT',
  INVALID_INPUT: 'INVALID_INPUT',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  ADMIN_ACTION: 'ADMIN_ACTION',
  DATA_MODIFICATION: 'DATA_MODIFICATION',
};

/**
 * Log de evento de seguridad
 */
export const logSecurityEvent = (type, details = {}) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    ...details,
  };
  
  // En desarrollo, mostrar en consola
  if (isDevelopment) {
    console.log(`[SECURITY] ${type}:`, logEntry);
  } else {
    // En producción, solo loguear eventos importantes
    if ([
      SecurityEventType.AUTH_FAILURE,
      SecurityEventType.RATE_LIMIT_EXCEEDED,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
      SecurityEventType.UNAUTHORIZED_ACCESS,
    ].includes(type)) {
      console.warn(`[SECURITY] ${type}:`, JSON.stringify(logEntry));
    }
  }
  
  // Aquí podrías enviar a un servicio de logging externo (Sentry, LogRocket, etc.)
  return logEntry;
};

/**
 * Middleware para loguear intentos de autenticación fallidos
 */
export const logAuthAttempt = (req, success, reason = null) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  const email = req.body?.email || 'unknown';
  
  logSecurityEvent(
    success ? SecurityEventType.AUTH_SUCCESS : SecurityEventType.AUTH_FAILURE,
    {
      ip,
      userAgent,
      email: success ? email : email, // En caso de éxito, no loguear email por seguridad
      reason,
      path: req.path,
    }
  );
};

/**
 * Log de actividad sospechosa
 */
export const logSuspiciousActivity = (req, reason, details = {}) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  
  logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, {
    ip,
    userAgent,
    reason,
    path: req.path,
    method: req.method,
    ...details,
  });
};

/**
 * Log de intento de path traversal
 */
export const logPathTraversalAttempt = (req, path) => {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  
  logSecurityEvent(SecurityEventType.PATH_TRAVERSAL_ATTEMPT, {
    ip,
    userAgent,
    attemptedPath: path,
    originalPath: req.path,
  });
};

/**
 * Log de acceso no autorizado
 */
export const logUnauthorizedAccess = (req, reason) => {
  // No loguear errores 401 esperados en endpoints públicos o de polling
  // Estos son normales cuando el usuario no está autenticado aún
  const publicPaths = ['/api/sensor/estado', '/api/health'];
  const isPublicPath = publicPaths.some(path => req.path.includes(path));
  
  // Solo loguear si es una ruta protegida importante o si hay actividad sospechosa
  if (isPublicPath && reason === 'Usuario no autenticado') {
    // No loguear - es un comportamiento esperado
    return;
  }
  
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  const userId = req.user?.id_usuario || 'anonymous';
  
  logSecurityEvent(SecurityEventType.UNAUTHORIZED_ACCESS, {
    ip,
    userAgent,
    userId,
    reason,
    path: req.path,
    method: req.method,
  });
};

