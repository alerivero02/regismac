import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import app from '../regismac-backend/src/app.js';

// Inicializar Prisma con configuración optimizada para serverless
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'minimal',
});

// Hacer Prisma disponible en toda la aplicación
app.locals.prisma = prisma;

// Handler para Vercel
export default async function handler(req, res) {
  try {
    // Asegurar que Prisma esté conectado
    if (!prisma.$connect) {
      await prisma.$connect();
    }

    // Procesar la petición con Express
    return app(req, res);
  } catch (error) {
    console.error('Error en handler de Vercel:', error);
    
    // Manejar errores de conexión a base de datos
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

// Cleanup en caso de cierre
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
