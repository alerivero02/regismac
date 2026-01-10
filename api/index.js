// Handler ABSOLUTAMENTE MÍNIMO - Solo devolver respuesta
export default function handler(req, res) {
  // Para /api/auth/me, devolver 401 directamente
  if (req.url?.includes('/auth/me') || req.url?.includes('/api/auth/me')) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  
  // Para otros endpoints, devolver 404
  return res.status(404).json({ error: 'Not found' });
}
