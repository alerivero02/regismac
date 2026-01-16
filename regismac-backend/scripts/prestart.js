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

console.log('🔍 Verificando Prisma Client...');

// Verificar si existe Prisma Client en alguna de las ubicaciones posibles
const prismaClientExists = possiblePaths.some(path => existsSync(path));

if (!prismaClientExists) {
  console.log('⚠️  Prisma Client no encontrado. Generando...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
      env: { ...process.env }
    });
    console.log('✅ Prisma Client generado exitosamente');
  } catch (error) {
    console.error('❌ Error al generar Prisma Client:', error.message);
    // En producción, intentar continuar de todas formas (puede que ya esté generado)
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Continuando de todas formas en producción...');
    } else {
      process.exit(1);
    }
  }
} else {
  console.log('✅ Prisma Client ya está generado');
}

// Ejecutar limpieza de técnicos al iniciar (solo en producción)
if (process.env.NODE_ENV === 'production') {
  try {
    console.log('🧹 Ejecutando limpieza de técnicos...');
    const { limpiarTecnicos } = await import('./limpiarTecnicos.js');
    await limpiarTecnicos();
  } catch (error) {
    console.error('⚠️  Error al ejecutar limpieza de técnicos (continuando de todas formas):', error.message);
    // No detener el servidor si falla la limpieza
  }
}

