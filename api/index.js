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
      const appModule = await import('../regismac-backend/src/app.js');
      app = appModule.default;
      const prismaInstance = getPrisma();
      app.locals.prisma = prismaInstance;
    } catch (error) {
      console.error('Error al importar o inicializar la aplicación:', error);
      throw error;
    }
  }
  return app;
}

export default async function handler(req, res) {
  try {
    const expressApp = await getApp();
    return expressApp(req, res, (err) => {
      if (err) {
        console.error('Error en Express handler:', err);
        console.error('Error name:', err.name);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        if (!res.headersSent) {
          return res.status(500).json({
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'production' 
              ? 'An error occurred' 
              : err.message
          });
        }
      }
    });
  } catch (error) {
    console.error('Error inicializando aplicación:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' 
          ? 'An error occurred during initialization' 
          : error.message
      });
    }
  }
}

