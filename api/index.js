// Handler simplificado SIN Prisma - Prisma es completamente opcional
let app;

async function getApp() {
  if (!app) {
    try {
      console.log('=== Inicializando aplicación (SIN Prisma) ===');
      console.log('Variables de entorno disponibles:', {
        SESSION_SECRET: process.env.SESSION_SECRET ? 'Sí' : 'No',
        NODE_ENV: process.env.NODE_ENV,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Sí' : 'No',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Sí' : 'No',
        BACKEND_URL: process.env.BACKEND_URL,
        FRONTEND_URL: process.env.FRONTEND_URL
      });
      
      console.log('Importando app.js...');
      const appModule = await import('../regismac-backend/src/app.js');
      console.log('App module importado');
      
      app = appModule.default;
      if (!app) {
        throw new Error('App module no exporta un default válido');
      }
      console.log('App default export obtenido');
      
      // NO inicializar Prisma - dejarlo como null
      // Los controladores ya manejan el caso cuando Prisma no está disponible
      if (app.locals) {
        app.locals.prisma = null;
        console.log('⚠️  Prisma deshabilitado - app funcionará sin base de datos');
      } else {
        console.warn('⚠️  app.locals no está disponible');
      }
      
      console.log('=== Aplicación inicializada correctamente (SIN Prisma) ===');
    } catch (error) {
      console.error('❌ Error al importar o inicializar la aplicación:', error);
      console.error('❌ Error name:', error?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      if (error.cause) {
        console.error('❌ Error cause:', error.cause);
      }
      // No lanzar el error, crear una app mínima para manejar errores
      try {
        const express = await import('express');
        const expressDefault = express.default || express;
        app = typeof expressDefault === 'function' ? expressDefault() : new expressDefault();
        if (!app || typeof app.use !== 'function') {
          throw new Error('No se pudo crear app de Express');
        }
        app.use((req, res) => {
          res.status(500).json({ 
            error: 'Application initialization failed',
            message: process.env.NODE_ENV === 'production' 
              ? undefined 
              : error.message
          });
        });
      } catch (expressError) {
        console.error('❌ Error al crear app mínima de Express:', expressError);
        // Crear un objeto mínimo que funcione como app
        app = {
          use: () => {},
          locals: { prisma: null },
          listen: () => {}
        };
      }
    }
  }
  return app;
}

async function handler(req, res) {
  // SIEMPRE devolver una respuesta, incluso si todo falla
  let responseSent = false;
  let timeout;
  
  // Función helper para enviar respuesta de forma segura
  const safeSend = (status, data) => {
    if (!responseSent && !res.headersSent) {
      try {
        responseSent = true;
        if (timeout) clearTimeout(timeout);
        res.status(status).json(data);
      } catch (e) {
        console.error('Error crítico al enviar respuesta:', e);
      }
    }
  };
  
  // Para endpoints de auth/me, devolver 401 directamente si hay cualquier problema
  const isAuthMe = req.url?.includes('/auth/me');
  
  try {
    console.log(`=== Nueva petición: ${req.method} ${req.url} ===`);
    
    timeout = setTimeout(() => {
      if (!responseSent && !res.headersSent) {
        console.error('⚠️  Timeout: La petición tardó demasiado');
        if (isAuthMe) {
          safeSend(401, { error: 'No autenticado' });
        } else {
          safeSend(504, { error: 'Request timeout' });
        }
      }
    }, 25000);
    
    const sendErrorResponse = (error, status = 500) => {
      console.error('=== ERROR EN HANDLER ===');
      console.error('Error:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      if (error.cause) {
        console.error('Error cause:', error.cause);
      }
      
      // Para endpoints de auth, SIEMPRE devolver 401
      if (isAuthMe) {
        return safeSend(401, { error: 'No autenticado' });
      }
      
      return safeSend(status, {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred' 
          : error?.message || 'Unknown error'
      });
    };

    try {
      console.log('Obteniendo app...');
      const expressApp = await getApp();
      console.log('App obtenida, manejando petición...');
      
      if (!expressApp) {
        console.error('❌ expressApp es null o undefined');
        if (isAuthMe) {
          return safeSend(401, { error: 'No autenticado' });
        }
        return safeSend(500, { error: 'Application not initialized' });
      }
      
      // Asegurar que req.app esté disponible
      if (!req.app) {
        req.app = expressApp;
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
          // Express app puede ser llamada directamente como función
          expressApp(req, res, (err) => {
            if (timeout) clearTimeout(timeout);
            if (err) {
              console.error('Error en expressApp callback:', err);
              if (isAuthMe) {
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
          if (timeout) clearTimeout(timeout);
          console.error('Error al llamar expressApp:', callError);
          sendErrorResponse(callError);
          markResolved();
        }
      });
    } catch (error) {
      if (timeout) clearTimeout(timeout);
      console.error('Error en handler try-catch (inicialización):', error);
      sendErrorResponse(error);
    }
  } catch (criticalError) {
    // Capturar cualquier error crítico que pueda ocurrir
    if (timeout) clearTimeout(timeout);
    console.error('❌ ERROR CRÍTICO EN HANDLER:', criticalError);
    console.error('❌ Stack:', criticalError?.stack);
    
    // Para endpoints de auth, SIEMPRE devolver 401
    if (isAuthMe) {
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
