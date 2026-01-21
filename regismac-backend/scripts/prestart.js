/**
 * Script de pre-inicio para asegurar que Prisma Client esté generado
 * Se ejecuta antes de iniciar el servidor en producción
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
  log('🔄 Ejecutando migraciones de Prisma en producción...');
  try {
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
      env: { ...process.env }
    });
    log('✅ Migraciones ejecutadas correctamente');
  } catch (error) {
    logError('❌ Error al ejecutar migraciones:', error.message);
    // En producción, continuar aunque falle (puede que ya estén aplicadas)
    log('⚠️  Continuando sin aplicar migraciones...');
  }
}


