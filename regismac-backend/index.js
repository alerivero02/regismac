import 'dotenv/config';
import os from 'os';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import app from "./src/app.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

app.locals.prisma = prisma;

export async function reconnectPrisma() {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    console.log('✅ Reconexión a la base de datos exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error al reconectar:', error);
    return false;
  }
}

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.') || 
            iface.address.startsWith('10.') ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(iface.address)) {
          return iface.address;
        }
      }
    }
  }
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

// Sistema de ping automático para mantener el servicio activo en Render
function startAutoPing() {
  // Solo en producción y si hay URL configurada
  if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
    const pingInterval = 4 * 60 * 1000; // 4 minutos (Render duerme después de 15 min)
    const pingUrl = new URL(`${process.env.BACKEND_URL}/api/health`);
    const httpModule = pingUrl.protocol === 'https:' ? https : http;
    
    setInterval(() => {
      const req = httpModule.get(pingUrl, (res) => {
        // Ping exitoso, servicio activo
        res.on('data', () => {}); // Consumir respuesta
        res.on('end', () => {});
      });
      
      req.on('error', () => {
        // Ignorar errores de ping (no crítico)
      });
      
      req.setTimeout(5000, () => {
        req.destroy(); // Timeout de 5 segundos
      });
    }, pingInterval);
  }
}

async function startServer() {
  try {
    await prisma.$connect();
    
    // Ejecutar limpieza DEFINITIVA de técnicos al iniciar (solo en producción)
    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('🧹 Ejecutando limpieza DEFINITIVA de técnicos al iniciar...');
        const { limpiarTecnicosDefinitivo } = await import('./scripts/limpiarTecnicosDefinitivo.js');
        // Usar la instancia de Prisma ya conectada
        await limpiarTecnicosDefinitivo(prisma);
      } catch (error) {
        console.error('⚠️  Error al ejecutar limpieza de técnicos (continuando de todas formas):', error.message);
        console.error('   Stack:', error.stack);
        // No detener el servidor si falla la limpieza
      }
    }
    
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';
    
    app.listen(PORT, HOST, () => {
      // Logs mínimos para producción
      if (process.env.NODE_ENV === 'development') {
        const localIP = getLocalIP();
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Local network: http://${localIP}:${PORT}`);
      }
      
      // Iniciar ping automático para mantener servicio activo
      startAutoPing();
    });
  } catch (error) {
    console.error("Database connection error:", error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error("Check:");
      console.error("  1. Database is running");
      console.error("  2. .env configuration is correct");
      console.error("  3. Database 'regismac' exists");
      console.error(`DATABASE_URL: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@') : 'Not configured'}`);
    }
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
