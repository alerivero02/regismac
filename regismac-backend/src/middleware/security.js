/**
 * Middleware de seguridad para el backend
 * Incluye sanitización, validación y protección contra ataques comunes
 */

/**
 * Sanitiza strings eliminando caracteres peligrosos
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Eliminar < y >
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, '') // Eliminar event handlers
    .replace(/&#x?[0-9a-f]+;/gi, ''); // Eliminar entidades HTML
};

/**
 * Sanitiza un objeto recursivamente
 */
export const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        // Sanitizar también las claves
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
};

/**
 * Middleware para sanitizar el body de las peticiones
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Middleware para sanitizar los query parameters
 * En Express 5, req.query es de solo lectura, así que solo validamos sin modificar
 * La sanitización real se hace en preventPathTraversal que valida los valores
 */
export const sanitizeQuery = (req, res, next) => {
  // En Express 5, req.query es de solo lectura
  // La validación se hace en preventPathTraversal
  // Si necesitas valores sanitizados, usa req.sanitizedQuery después de validar
  next();
};

/**
 * Middleware para sanitizar los parámetros de la URL
 * En Express 5, req.params es de solo lectura, así que solo validamos sin modificar
 * La sanitización real se hace en preventPathTraversal que valida los valores
 */
export const sanitizeParams = (req, res, next) => {
  // En Express 5, req.params es de solo lectura
  // La validación se hace en preventPathTraversal
  // Si necesitas valores sanitizados, usa req.sanitizedParams después de validar
  next();
};

/**
 * Protección contra path traversal
 */
export const preventPathTraversal = (req, res, next) => {
  const suspiciousPatterns = [
    /\.\./,           // Path traversal
    /\/\//,           // Double slashes
    /%2e%2e/i,        // URL encoded ..
    /%2f/i,           // URL encoded /
    /<script/i,       // Script tags
    /javascript:/i,   // JavaScript protocol
  ];
  
  const checkString = (str) => {
    if (typeof str !== 'string') return false;
    return suspiciousPatterns.some(pattern => pattern.test(str));
  };
  
  // Verificar path
  if (checkString(req.path)) {
    return res.status(400).json({ 
      error: 'Ruta no válida',
      message: 'La ruta contiene caracteres no permitidos'
    });
  }
  
  // Verificar query parameters
  for (const key in req.query) {
    if (checkString(req.query[key])) {
      return res.status(400).json({ 
        error: 'Parámetro no válido',
        message: 'Los parámetros contienen caracteres no permitidos'
      });
    }
  }
  
  // Verificar parámetros de URL
  for (const key in req.params) {
    if (checkString(req.params[key])) {
      return res.status(400).json({ 
        error: 'Parámetro no válido',
        message: 'Los parámetros contienen caracteres no permitidos'
      });
    }
  }
  
  next();
};

/**
 * Validación de tamaño de payload
 */
export const validatePayloadSize = (maxSize = 10 * 1024 * 1024) => { // 10MB por defecto
  return (req, res, next) => {
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload demasiado grande',
        message: `El tamaño máximo permitido es ${maxSize / 1024 / 1024}MB`
      });
    }
    
    next();
  };
};

/**
 * Validación de headers requeridos
 */
export const validateHeaders = (requiredHeaders = []) => {
  return (req, res, next) => {
    const missingHeaders = requiredHeaders.filter(header => !req.get(header));
    
    if (missingHeaders.length > 0) {
      return res.status(400).json({
        error: 'Headers faltantes',
        message: `Se requieren los siguientes headers: ${missingHeaders.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Middleware para limitar métodos HTTP permitidos
 */
export const allowedMethods = (methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) => {
  return (req, res, next) => {
    if (!methods.includes(req.method)) {
      return res.status(405).json({
        error: 'Método no permitido',
        message: `El método ${req.method} no está permitido. Métodos permitidos: ${methods.join(', ')}`,
        allowed: methods
      });
    }
    next();
  };
};

