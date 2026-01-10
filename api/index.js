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
      console.log('Inicializando aplicación...');
      console.log('Variables de entorno disponibles:', {
        DATABASE_URL: process.env.DATABASE_URL ? 'Sí' : 'No',
        SESSION_SECRET: process.env.SESSION_SECRET ? 'Sí' : 'No',
        NODE_ENV: process.env.NODE_ENV,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Sí' : 'No',
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? 'Sí' : 'No'
      });
      
      const appModule = await import('../regismac-backend/src/app.js');
      app = appModule.default;
      
      console.log('App importada correctamente');
      
      const prismaInstance = getPrisma();
      app.locals.prisma = prismaInstance;
      
      console.log('Prisma configurado en app.locals');
    } catch (error) {
      console.error('❌ Error al importar o inicializar la aplicación:', error);
      console.error('❌ Error name:', error?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      throw error;
    }
  }
  return app;
}

export default async function handler(req, res) {
  // Asegurar que siempre se envíe una respuesta
  let responseSent = false;
  
  const sendErrorResponse = (error, status = 500) => {
    if (!responseSent && !res.headersSent) {
      responseSent = true;
      console.error('Error:', error);
      console.error('Error name:', error?.name);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      return res.status(status).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred' 
          : error?.message || 'Unknown error'
      });
    }
  };

  try {
    const expressApp = await getApp();
    
    // Wrapper para asegurar que siempre se maneje el error
    return new Promise((resolve) => {
      try {
        expressApp(req, res, (err) => {
          if (err) {
            sendErrorResponse(err);
            resolve();
          } else {
            resolve();
          }
        });
      } catch (err) {
        sendErrorResponse(err);
        resolve();
      }
    });
  } catch (error) {
    sendErrorResponse(error);
  }
}

