// Handler simple para Vercel que devuelve respuestas básicas
module.exports = function handler(req, res) {
  try {
    // Health check
    if (req.url && req.url.includes('/health')) {
      res.status(200).json({ status: 'ok', message: 'API funcionando correctamente' });
      return;
    }
    
    // Auth me endpoint
    if (req.url && (req.url.includes('/auth/me') || req.url.includes('/api/auth/me'))) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    
    // Not found
    res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};
