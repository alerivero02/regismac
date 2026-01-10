// Handler absolutamente básico para Vercel
module.exports = function handler(req, res) {
  try {
    if (req.url && (req.url.includes('/auth/me') || req.url.includes('/api/auth/me'))) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
