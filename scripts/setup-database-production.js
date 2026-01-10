/**
 * Script para configurar la base de datos de producción
 * Ejecuta las migraciones de Prisma en la base de datos de producción
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupProductionDatabase() {
  try {
    console.log('🔍 Verificando conexión a la base de datos...');
    
    // Verificar que DATABASE_URL está configurada
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL no está configurada. Configúrala en las variables de entorno.');
    }

    // Intentar conectar
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos exitosa');

    // Ejecutar migraciones
    console.log('📦 Ejecutando migraciones...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    console.log('✅ Migraciones completadas exitosamente');

    // Generar Prisma Client
    console.log('🔨 Generando Prisma Client...');
    execSync('npx prisma generate', { 
      stdio: 'inherit',
      cwd: process.cwd()
    });

    console.log('✅ Prisma Client generado');

    // Verificar tablas
    console.log('🔍 Verificando tablas...');
    const tables = await prisma.$queryRaw`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `;
    
    console.log(`✅ Base de datos configurada. Tablas encontradas: ${tables.length}`);
    console.log('📋 Tablas:', tables.map(t => t.TABLE_NAME).join(', '));

  } catch (error) {
    console.error('❌ Error configurando la base de datos:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupProductionDatabase();
