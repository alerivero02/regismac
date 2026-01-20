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

// Sistema de backups automáticos
let backupIntervalId = null;
let isBackupRunning = false;

async function executeAutomaticBackup() {
  // Evitar ejecuciones simultáneas
  if (isBackupRunning) {
    console.log('⏭️  Backup automático omitido: ya hay un backup en ejecución');
    return;
  }

  try {
    isBackupRunning = true;
    console.log('🔄 Ejecutando backup automático...');
    
    // Importar función de backup dinámicamente
    const { backupDatabase } = await import('./scripts/backup-database-postgres.js');
    const backupPath = await backupDatabase();
    
    console.log(`✅ Backup automático completado: ${backupPath}`);
    
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
    console.error('❌ Error en backup automático:', error.message);
    // No lanzar error para no detener el servidor
  } finally {
    isBackupRunning = false;
  }
}

function startAutomaticBackups() {
  // Solo en producción
  if (process.env.NODE_ENV !== 'production') {
    console.log('ℹ️  Backups automáticos deshabilitados en desarrollo');
    return;
  }

  // Verificar si está habilitado (por defecto sí)
  const enableAutoBackups = process.env.ENABLE_AUTO_BACKUPS !== 'false';
  if (!enableAutoBackups) {
    console.log('ℹ️  Backups automáticos deshabilitados por configuración');
    return;
  }

  // Intervalo de backups (por defecto cada 24 horas)
  const backupIntervalHours = parseInt(process.env.BACKUP_INTERVAL_HOURS || '24', 10);
  const backupIntervalMs = backupIntervalHours * 60 * 60 * 1000;

  console.log(`🔄 Sistema de backups automáticos iniciado (cada ${backupIntervalHours} horas)`);

  // Ejecutar backup inmediatamente al iniciar (opcional)
  const runOnStart = process.env.BACKUP_ON_START !== 'false';
  if (runOnStart) {
    // Esperar 5 minutos después del inicio para no sobrecargar el servidor
    setTimeout(() => {
      executeAutomaticBackup().catch(err => {
        console.error('Error en backup inicial:', err);
      });
    }, 5 * 60 * 1000);
  }

  // Programar backups periódicos
  backupIntervalId = setInterval(() => {
    executeAutomaticBackup().catch(err => {
      console.error('Error en backup periódico:', err);
    });
  }, backupIntervalMs);
}

// Sistema de conexión serial USB al ESP32
async function startSerialConnection() {
  // Solo intentar conectar si está habilitado
  const enableSerial = process.env.ENABLE_SERIAL_CONNECTION !== 'false';
  if (!enableSerial) {
    console.log('ℹ️  Conexión serial deshabilitada por configuración');
    return;
  }

  try {
    console.log('🔌 Intentando conectar al ESP32 por USB...');
    const serialPortService = await import('./src/services/serialPort.service.js');
    
    // Esperar 2 segundos después del inicio para que el sistema esté listo
    setTimeout(async () => {
      try {
        const port = await serialPortService.connectToESP32();
        console.log(`✅ Conectado al ESP32 en puerto: ${port}`);
      } catch (error) {
        console.log('ℹ️  No se pudo conectar automáticamente al ESP32:', error.message);
        console.log('   Puedes conectar manualmente usando el endpoint /api/sensor/conectar');
      }
    }, 2000);
  } catch (error) {
    console.log('ℹ️  Servicio serial no disponible:', error.message);
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
      
      // Iniciar sistema de backups automáticos
      startAutomaticBackups();
      
      // Intentar conectar automáticamente al ESP32 por USB (solo en desarrollo)
      if (process.env.NODE_ENV === 'development') {
        startSerialConnection();
      }
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
  // Limpiar intervalos antes de cerrar
  if (backupIntervalId) {
    clearInterval(backupIntervalId);
  }
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
