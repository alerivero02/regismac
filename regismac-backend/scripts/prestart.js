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

// En producción, ejecutar migraciones pendientes (sin volcar salida Prisma)
if (isProduction) {
  (async () => {
    try {
      const migrationLockPath = join(__dirname, '..', 'prisma', 'migrations', 'migration_lock.toml');
      if (existsSync(migrationLockPath)) {
        const lockContent = await readFile(migrationLockPath, 'utf-8');
        if (lockContent.includes('provider = "mysql"')) {
          const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
          if (existsSync(migrationsDir)) {
            rmSync(migrationsDir, { recursive: true, force: true });
          }
        }
      }
      execSync('npx prisma migrate deploy', {
        stdio: 'pipe',
        cwd: join(__dirname, '..'),
        env: { ...process.env }
      });
      console.log('Migraciones: OK');
    } catch (error) {
      // Mostrar error completo para debugging
      const errorMessage = error.message || String(error);
      const errorOutput = error.stdout ? error.stdout.toString() : '';
      const errorStderr = error.stderr ? error.stderr.toString() : '';
      
      console.error('Migraciones: Command failed: npx prisma migrate deploy');
      console.error('Error completo:', errorMessage);
      if (errorOutput) {
        console.error('stdout:', errorOutput);
      }
      if (errorStderr) {
        console.error('stderr:', errorStderr);
      }
      
      if (error.message && error.message.includes('P3019')) {
        try {
          const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
          if (existsSync(migrationsDir)) {
            rmSync(migrationsDir, { recursive: true, force: true });
          }
        } catch (_) {}
      }
    }
  })();
}


