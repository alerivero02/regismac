import { PrismaClient } from '@prisma/client';

let prisma;
let app;

function getPrisma() {
  if (!prisma) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

async function getApp() {
  if (!app) {
    try {
      console.log('=== Inicializando aplicación ===');
      console.log('Variables de entorno disponibles:', {
        DATABASE_URL: process.env.DATABASE_URL ? 'Sí' : 'No',
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
      
      // Intentar inicializar Prisma, pero no fallar si no está disponible
      try {
        console.log('Obteniendo instancia de Prisma...');
        const prismaInstance = getPrisma();
        console.log('Prisma obtenido');
        
        if (app.locals) {
          app.locals.prisma = prismaInstance;
          console.log('✅ Prisma configurado en app.locals');
        } else {
          console.warn('⚠️  app.locals no está disponible');
        }
      } catch (prismaError) {
        console.error('⚠️  Error al inicializar Prisma (continuando sin Prisma):', prismaError.message);
        // No lanzar error, continuar sin Prisma
        if (app.locals) {
          app.locals.prisma = null;
        }
      }
      
      console.log('=== Aplicación inicializada correctamente ===');
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
          locals: {},
          listen: () => {}
        };
      }
    }
  }
  return app;
}

export default async function handler(req, res) {
  // Asegurar que siempre se envíe una respuesta
  let responseSent = false;
  let timeout;
  
  // Función helper para enviar respuesta de forma segura
  const safeSend = (status, data) => {
    if (!responseSent && !res.headersSent) {
      try {
        responseSent = true;
        if (timeout) clearTimeout(timeout);
        return res.status(status).json(data);
      } catch (e) {
        console.error('Error al enviar respuesta:', e);
      }
    }
  };
  
  try {
    console.log(`=== Nueva petición: ${req.method} ${req.url} ===`);
    
    timeout = setTimeout(() => {
      if (!responseSent && !res.headersSent) {
        console.error('⚠️  Timeout: La petición tardó demasiado');
        safeSend(504, { error: 'Request timeout' });
      }
    }, 25000); // 25 segundos (Vercel tiene límite de 30s para funciones)
    
    const sendErrorResponse = (error, status = 500) => {
      console.error('=== ERROR EN HANDLER ===');
      console.error('Error:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      if (error.cause) {
        console.error('Error cause:', error.cause);
      }
      
      // Para endpoints de auth, devolver 401 si no hay autenticación
      if (req.url?.includes('/auth/me')) {
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
      
      // Asegurar que req.app esté disponible
      if (!req.app) {
        req.app = expressApp;
      }
      
      // Verificar que expressApp sea válido
      if (!expressApp) {
        console.error('❌ expressApp es null o undefined');
        safeSend(500, { error: 'Application not initialized' });
        return;
      }
      
      // Wrapper para asegurar que siempre se maneje el error
      return new Promise((resolve) => {
        try {
          // Express app puede ser llamada directamente como función
          // En Express 5, el app es una función que acepta (req, res, next)
          const result = expressApp(req, res, (err) => {
            if (timeout) clearTimeout(timeout);
            if (err) {
              console.error('Error en expressApp callback:', err);
              // Para endpoints de auth, devolver 401 si no hay autenticación
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
              resolve();
            } else {
              if (!responseSent) {
                responseSent = true;
              }
              console.log('Petición manejada correctamente');
              resolve();
            }
          });
          
          // Si expressApp retorna una Promise, manejarla
          if (result && typeof result.then === 'function') {
            result.catch((err) => {
              if (timeout) clearTimeout(timeout);
              console.error('Error en Promise de expressApp:', err);
              sendErrorResponse(err);
              resolve();
            });
          }
        } catch (callError) {
          if (timeout) clearTimeout(timeout);
          console.error('Error al llamar expressApp:', callError);
          sendErrorResponse(callError);
          resolve();
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
    
    // Para endpoints de auth, devolver 401 si no hay autenticación
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
