/**
 * Vercel Serverless Function Handler
 * 
 * Este archivo actúa como punto de entrada para las funciones serverless de Vercel.
 * Convierte la aplicación Express en una función compatible con Vercel.
 * 
 * @see https://vercel.com/docs/functions/serverless-functions
 */

import 'dotenv/config';
import app from '../regismac-backend/src/app.js';
import { PrismaClient } from '@prisma/client';

// Inicializar Prisma Client para uso en serverless (singleton pattern)
let prisma;

/**
 * Obtiene o crea una instancia de Prisma Client
 * Implementa singleton pattern para reutilizar conexiones en serverless
 * 
 * @returns {PrismaClient} Instancia de Prisma Client
 */
function getPrisma() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
      errorFormat: 'pretty',
      // Configuración optimizada para serverless
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    
    // Manejar desconexión limpia al terminar el proceso
    const gracefulShutdown = async () => {
      try {
        await prisma.$disconnect();
        console.log('✅ Prisma Client desconectado correctamente');
      } catch (error) {
        console.error('❌ Error al desconectar Prisma:', error);
      }
    };

    process.on('beforeExit', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  }
  return prisma;
}

// Inicializar Prisma en el app locals para que esté disponible en todas las rutas
const prismaInstance = getPrisma();
app.locals.prisma = prismaInstance;

/**
 * Handler principal para Vercel Serverless Functions
 * 
 * Vercel pasa los objetos req y res de Node.js estándar, que Express puede manejar directamente.
 * 
 * @param {http.IncomingMessage} req - Request object de Node.js/Vercel
 * @param {http.ServerResponse} res - Response object de Node.js/Vercel
 * @returns {Promise<void>}
 */
export default async function handler(req, res) {
  // Asegurar conexión a Prisma antes de manejar la request
  try {
    // Verificar conexión (Prisma maneja pooling automáticamente)
    await prismaInstance.$connect();
  } catch (error) {
    console.error('❌ Error conectando a Prisma:', error);
    return res.status(500).json({ 
      error: 'Database connection error',
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message 
    });
  }

  // Manejar la request con Express
  // Express maneja automáticamente los objetos req/res de Node.js
  return app(req, res, (err) => {
    // Manejar errores no capturados por Express
    if (err) {
      console.error('❌ Error no manejado en Express:', err);
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

