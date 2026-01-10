// Handler MÍNIMO - Solo para /api/auth/me devolver 401 directamente
// Sin importar nada de la app para verificar que el handler funciona

async function handler(req, res) {
  // SIEMPRE devolver una respuesta
  let responseSent = false;
  
  const safeSend = (status, data) => {
    if (!responseSent && !res.headersSent) {
      try {
        responseSent = true;
        res.status(status).json(data);
      } catch (e) {
        console.error('Error crítico al enviar respuesta:', e);
      }
    }
  };
  
  try {
    console.log(`=== Handler MÍNIMO: ${req.method} ${req.url} ===`);
    
    // Para /api/auth/me, devolver 401 directamente sin importar nada
    if (req.url?.includes('/auth/me')) {
      console.log('Endpoint /api/auth/me - devolviendo 401');
      return safeSend(401, { error: 'No autenticado' });
    }
    
    // Para otros endpoints, intentar cargar la app
    try {
      console.log('Importando app.js...');
      const appModule = await import('../regismac-backend/src/app.js');
      console.log('App module importado');
      
      const expressApp = appModule.default;
      if (!expressApp) {
        console.error('❌ App module no exporta un default válido');
        return safeSend(500, { error: 'Application not initialized' });
      }
      
      console.log('App obtenida, manejando petición...');
      
      // Asegurar que req.app esté disponible
      if (!req.app) {
        req.app = expressApp;
      }
      
      // NO inicializar Prisma
      if (expressApp.locals) {
        expressApp.locals.prisma = null;
      }
      
      // Wrapper para asegurar que siempre se maneje el error
      return new Promise((resolve) => {
        let promiseResolved = false;
        
        const markResolved = () => {
          if (!promiseResolved) {
            promiseResolved = true;
            resolve();
          }
        };
        
        try {
          expressApp(req, res, (err) => {
            if (err) {
              console.error('Error en expressApp callback:', err);
              if (req.url?.includes('/auth/me')) {
                safeSend(401, { error: 'No autenticado' });
              } else {
                safeSend(err.status || 500, {
                  error: err.message || 'Internal server error',
                  message: process.env.NODE_ENV === 'production' 
                    ? undefined 
                    : err.message
                });
              }
              markResolved();
            } else {
              if (!responseSent) {
                responseSent = true;
              }
              console.log('Petición manejada correctamente');
              markResolved();
            }
          });
        } catch (callError) {
          console.error('Error al llamar expressApp:', callError);
          if (req.url?.includes('/auth/me')) {
            safeSend(401, { error: 'No autenticado' });
          } else {
            safeSend(500, {
              error: 'Internal server error',
              message: process.env.NODE_ENV === 'production' 
                ? 'An error occurred' 
                : callError?.message || 'Unknown error'
            });
          }
          markResolved();
        }
      });
    } catch (appError) {
      console.error('❌ Error al importar app.js:', appError);
      console.error('❌ Error name:', appError?.name);
      console.error('❌ Error message:', appError?.message);
      console.error('❌ Error stack:', appError?.stack);
      
      // Si falla la importación, devolver 401 para /auth/me
      if (req.url?.includes('/auth/me')) {
        return safeSend(401, { error: 'No autenticado' });
      }
      
      return safeSend(500, {
        error: 'Application initialization failed',
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred' 
          : appError?.message || 'Unknown error'
      });
    }
  } catch (criticalError) {
    console.error('❌ ERROR CRÍTICO EN HANDLER:', criticalError);
    console.error('❌ Stack:', criticalError?.stack);
    
    // Para /api/auth/me, SIEMPRE devolver 401
    if (req.url?.includes('/auth/me')) {
      safeSend(401, { error: 'No autenticado' });
    } else {
      safeSend(500, { 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred' 
          : criticalError?.message || 'Unknown error'
      });
    }
  }
}

export default handler;
