// Handler ULTRA SIMPLE - Solo devolver respuesta sin ninguna lógica
export default async function handler(req, res) {
  try {
    // Para /api/auth/me, devolver 401 directamente
    if (req.url?.includes('/auth/me') || req.url?.includes('/api/auth/me')) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    
    // Para otros endpoints, intentar cargar la app
    try {
      const appModule = await import('../regismac-backend/src/app.js');
      const expressApp = appModule.default;
      
      if (!expressApp) {
        return res.status(500).json({ error: 'Application not initialized' });
      }
      
      // Asegurar que req.app esté disponible
      if (!req.app) {
        req.app = expressApp;
      }
      
      // NO inicializar Prisma
      if (expressApp.locals) {
        expressApp.locals.prisma = null;
      }
      
      // Llamar expressApp
      return expressApp(req, res);
    } catch (appError) {
      console.error('Error al importar app.js:', appError);
      
      // Si falla la importación, devolver 401 para /auth/me
      if (req.url?.includes('/auth/me') || req.url?.includes('/api/auth/me')) {
        return res.status(401).json({ error: 'No autenticado' });
      }
      
      return res.status(500).json({
        error: 'Application initialization failed',
        message: process.env.NODE_ENV === 'production' 
          ? undefined 
          : appError?.message || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('ERROR CRÍTICO:', error);
    
    // Para /api/auth/me, SIEMPRE devolver 401
    if (req.url?.includes('/auth/me') || req.url?.includes('/api/auth/me')) {
      try {
        return res.status(401).json({ error: 'No autenticado' });
      } catch (e) {
        // Si incluso esto falla, no hacer nada
      }
    } else {
      try {
        return res.status(500).json({ 
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'production' 
            ? undefined 
            : error?.message || 'Unknown error'
        });
      } catch (e) {
        // Si incluso esto falla, no hacer nada
      }
    }
  }
}
