/**
 * Script de pre-inicio para asegurar que Prisma Client esté generado
 * Se ejecuta antes de iniciar el servidor en producción
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verificar Prisma Client en diferentes ubicaciones posibles
const possiblePaths = [
  join(__dirname, '..', 'node_modules', '@prisma', 'client', 'index.js'),
  join(__dirname, '..', 'node_modules', '@prisma', 'client', 'index.mjs'),
  join(__dirname, '..', 'node_modules', '@prisma', 'client', 'index.d.ts')
];

const isProduction = process.env.NODE_ENV === 'production';
const log = isProduction ? () => {} : console.log;
const logError = console.error;

const prismaClientExists = possiblePaths.some(path => existsSync(path));

if (!prismaClientExists) {
  log('⚠️  Prisma Client no encontrado. Generando...');
  try {
    execSync('npx prisma generate', {
      stdio: isProduction ? 'ignore' : 'inherit',
      cwd: join(__dirname, '..'),
      env: { ...process.env }
    });
  } catch (error) {
    logError('❌ Error al generar Prisma Client:', error.message);
    if (!isProduction) {
      process.exit(1);
    }
  }
}

// En producción, ejecutar migraciones pendientes
if (isProduction) {
  (async () => {
    log('🔄 Ejecutando migraciones de Prisma en producción...');
    try {
      // Verificar si existe migration_lock.toml con provider incorrecto
      const migrationLockPath = join(__dirname, '..', 'prisma', 'migrations', 'migration_lock.toml');
      if (existsSync(migrationLockPath)) {
        const lockContent = await readFile(migrationLockPath, 'utf-8');
        // Si el lock tiene mysql pero el schema es postgresql, eliminar el directorio de migraciones
        if (lockContent.includes('provider = "mysql"')) {
          log('⚠️  Detectado migration_lock.toml con provider mysql, pero schema usa postgresql');
          log('🗑️  Eliminando directorio de migraciones para reiniciar historial...');
          const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
          if (existsSync(migrationsDir)) {
            rmSync(migrationsDir, { recursive: true, force: true });
            log('✅ Directorio de migraciones eliminado');
          }
        }
      }
      
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        cwd: join(__dirname, '..'),
        env: { ...process.env }
      });
      log('✅ Migraciones ejecutadas correctamente');
    } catch (error) {
      logError('❌ Error al ejecutar migraciones:', error.message);
      
      // Si es el error P3019 (provider mismatch), intentar eliminar migraciones y continuar
      if (error.message && error.message.includes('P3019')) {
        log('⚠️  Error P3019 detectado: provider mismatch en migration_lock.toml');
        try {
          const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
          if (existsSync(migrationsDir)) {
            rmSync(migrationsDir, { recursive: true, force: true });
            log('✅ Directorio de migraciones eliminado. Continuando...');
          }
        } catch (rmError) {
          logError('❌ Error al eliminar directorio de migraciones:', rmError.message);
        }
      }
      
      // En producción, continuar aunque falle (puede que ya estén aplicadas)
      log('⚠️  Continuando sin aplicar migraciones...');
    }
  })();
}


