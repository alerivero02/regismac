import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import app from '../regismac-backend/src/app.js';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'minimal',
});

app.locals.prisma = prisma;

export default async function handler(req, res) {
  try {
    if (!prisma.$connect) {
      await prisma.$connect();
    }
    return app(req, res);
  } catch (error) {
    console.error('Error en handler de Vercel:', error);
    
    if (error.code?.startsWith('P10')) {
      return res.status(503).json({
        error: 'Error de conexión a la base de datos',
        message: 'El servicio no está disponible temporalmente'
      });
    }
    
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
