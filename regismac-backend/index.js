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

const isProduction = process.env.NODE_ENV === 'production';
const log = isProduction ? () => {} : console.log;
const logError = console.error;

export async function reconnectPrisma() {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    log('✅ Reconexión a la base de datos exitosa');
    return true;
  } catch (error) {
    logError('❌ Error al reconectar:', error);
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

// Sistema de backups automáticos
let backupIntervalId = null;
let isBackupRunning = false;

async function executeAutomaticBackup() {
  if (isBackupRunning) {
    return;
  }

  try {
    isBackupRunning = true;
    const { backupDatabase } = await import('./scripts/backup-database-postgres.js');
    await backupDatabase();
    
    // Log de seguridad (opcional, solo si tienes el módulo)
    try {
      const { logSecurityEvent, SecurityEventType } = await import('./src/utils/securityLogger.js');
      logSecurityEvent(SecurityEventType.ADMIN_ACTION, {
        action: 'automatic_backup_executed',
        backupPath: backupPath,
      });
    } catch (e) {
      // Ignorar si no está disponible
    }
  } catch (error) {
    logError('❌ Error en backup automático:', error.message);
  } finally {
    isBackupRunning = false;
  }
}

function startAutomaticBackups() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const enableAutoBackups = process.env.ENABLE_AUTO_BACKUPS !== 'false';
  if (!enableAutoBackups) {
    return;
  }

  const backupIntervalHours = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24', 10);
  const backupIntervalMs = backupIntervalHours * 60 * 60 * 1000;

  const runOnStart = process.env.BACKUP_ON_START !== 'false';
  if (runOnStart) {
    setTimeout(() => {
      executeAutomaticBackup().catch(() => {});
    }, 5 * 60 * 1000);
  }

  backupIntervalId = setInterval(() => {
    executeAutomaticBackup().catch(() => {});
  }, backupIntervalMs);
}

async function startSerialConnection() {
  const enableSerial = process.env.ENABLE_SERIAL_CONNECTION !== 'false';
  if (!enableSerial) {
    return;
  }

  try {
    const serialPortService = await import('./src/services/serialPort.service.js');
    setTimeout(async () => {
      try {
        await serialPortService.connectToESP32();
      } catch (error) {
        log('ℹ️  No se pudo conectar automáticamente al ESP32');
      }
    }, 2000);
  } catch (error) {
    log('ℹ️  Servicio serial no disponible');
  }
}

async function startServer() {
  try {
    await prisma.$connect();
    
    const PORT = process.env.PORT || 3000;
    const HOST = process.env.HOST || '0.0.0.0';
    
    app.listen(PORT, HOST, () => {
      if (!isProduction) {
        const localIP = getLocalIP();
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Local network: http://${localIP}:${PORT}`);
      }
      
      startAutoPing();
      startAutomaticBackups();
      
      if (!isProduction) {
        startSerialConnection();
      }
    });
  } catch (error) {
    logError("Database connection error:", error.message);
    if (!isProduction) {
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
  // Limpiar intervalos antes de cerrar
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
  }
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
