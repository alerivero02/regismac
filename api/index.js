import 'dotenv/config';
import app from '../regismac-backend/src/app.js';
import { PrismaClient } from '@prisma/client';

let prisma;

function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
      errorFormat: 'pretty',
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    
    const gracefulShutdown = async () => {
      try {
        await prisma.$disconnect();
      } catch (error) {
        console.error('Error al desconectar Prisma:', error);
      }
    };

    process.on('beforeExit', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  }
  return prisma;
}

const prismaInstance = getPrisma();
app.locals.prisma = prismaInstance;

export default async function handler(req, res) {
  try {
    await prismaInstance.$connect();
  } catch (error) {
    console.error('Error conectando a Prisma:', error);
    return res.status(500).json({ 
      error: 'Database connection error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }

  return app(req, res, (err) => {
    if (err) {
      console.error('Error no manejado en Express:', err);
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
}

