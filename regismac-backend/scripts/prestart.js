/**
 * Script de pre-inicio para asegurar que Prisma Client esté generado
 * Se ejecuta antes de iniciar el servidor en producción
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prismaClientPath = join(__dirname, '..', 'node_modules', '@prisma', 'client', 'index.js');

console.log('🔍 Verificando Prisma Client...');

if (!existsSync(prismaClientPath)) {
  console.log('⚠️  Prisma Client no encontrado. Generando...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: join(__dirname, '..')
    });
    console.log('✅ Prisma Client generado exitosamente');
  } catch (error) {
    console.error('❌ Error al generar Prisma Client:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Prisma Client ya está generado');
}

