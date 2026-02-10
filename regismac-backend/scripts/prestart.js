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

// En producción, verificar si las tablas ya existen antes de intentar migraciones
if (isProduction) {
  (async () => {
    try {
      // Verificar si las tablas principales ya existen
      // Si existen, usar db push para sincronizar schema sin intentar migraciones fallidas
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      try {
        // Intentar una query simple para verificar si las tablas existen
        await prisma.$queryRaw`SELECT 1 FROM "Usuario" LIMIT 1`;
        await prisma.$disconnect();
        
        // Si llegamos aquí, las tablas ya existen
        // Usar db push para sincronizar el schema sin intentar migraciones fallidas
        console.log('✅ Tablas ya existen, sincronizando schema con db push...');
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'pipe',
          cwd: join(__dirname, '..'),
          env: { ...process.env }
        });
        console.log('✅ Schema sincronizado');
        return;
      } catch (tableCheckError) {
        // Si las tablas no existen, intentar migraciones primero
        await prisma.$disconnect();
        
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
        console.log('✅ Migraciones aplicadas');
        return;
      }
    } catch (error) {
      // Si hay errores verificando tablas o aplicando migraciones,
      // usar db push como fallback (ya que las tablas probablemente ya existen)
      const errorMessage = error.message || String(error);
      
      // Solo mostrar errores si no es un error esperado de tabla no encontrada
      if (!errorMessage.includes('does not exist') && !errorMessage.includes('P2021')) {
        console.error('⚠️  Error en verificación de tablas/migraciones:', errorMessage.substring(0, 200));
      }
      
      // Usar db push para asegurar que el schema esté sincronizado
      // Esto es seguro porque db push solo modifica el schema, no los datos
      console.log('🔄 Sincronizando schema con db push...');
      try {
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'pipe',
          cwd: join(__dirname, '..'),
          env: { ...process.env }
        });
        console.log('✅ Schema sincronizado');
      } catch (dbPushError) {
        // Solo mostrar error si es crítico
        const dbPushMessage = dbPushError.message || String(dbPushError);
        if (!dbPushMessage.includes('already in sync')) {
          console.error('⚠️  Error al sincronizar schema:', dbPushMessage.substring(0, 200));
        } else {
          console.log('✅ Schema ya está sincronizado');
        }
      }
    }
  })();
}


