export const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.id_usuario) {
    return res.status(401).json({ error: "No autenticado" });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.id_usuario) {
    return res.status(401).json({ error: "No autenticado" });
  }
  if (req.user.rol !== 'admin') {
    return res.status(403).json({ error: "No autorizado. Se requiere rol de administrador" });
  }
  next();
};

// Validar que un ID sea un número válido
export const validateId = (req, res, next) => {
  const id = req.params.id || req.params.maquinaId || req.params.testId || req.params.materialeId || req.params.ordineId;
  
  if (id && (isNaN(Number(id)) || Number(id) <= 0)) {
    return res.status(400).json({ error: "ID non valido" });
  }
  
  next();
};

