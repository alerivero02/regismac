/**
 * Script para hacer backup directo de Neon PostgreSQL usando conexión Node.js
 * No requiere pg_dump instalado localmente
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, '../regismac-backend/backups');

// Crear directorio de backups si no existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL no está configurada');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupFileName = `regismac_backup_neon_${timestamp}.sql`;
  const backupPath = path.join(BACKUP_DIR, backupFileName);

  console.log('🔄 Iniciando backup de la base de datos Neon PostgreSQL...');
  console.log(`   Archivo: ${backupFileName}`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Obtener todas las tablas
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    console.log(`📋 Encontradas ${tables.length} tablas`);

    let sqlContent = `-- Backup de base de datos Neon PostgreSQL\n`;
    sqlContent += `-- Generado: ${new Date().toISOString()}\n`;
    sqlContent += `-- Base de datos: ${new URL(dbUrl).pathname.slice(1)}\n\n`;

    // Para cada tabla, obtener estructura y datos
    for (const table of tables) {
      console.log(`   Procesando tabla: ${table}...`);

      // Obtener estructura de la tabla
      const createTableResult = await client.query(`
        SELECT 
          'CREATE TABLE IF NOT EXISTS "' || table_name || '" (' ||
          string_agg(
            '"' || column_name || '" ' || 
            CASE 
              WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
              WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
              WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
              WHEN data_type = 'integer' THEN 'INTEGER'
              WHEN data_type = 'bigint' THEN 'BIGINT'
              WHEN data_type = 'double precision' THEN 'DOUBLE PRECISION'
              WHEN data_type = 'boolean' THEN 'BOOLEAN'
              WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
              WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
              WHEN data_type = 'text' THEN 'TEXT'
              WHEN data_type = 'date' THEN 'DATE'
              ELSE UPPER(data_type)
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE 
              WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default
              ELSE ''
            END,
            ', '
          ) ||
          ');' as create_statement
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        GROUP BY table_name;
      `, [table]);

      if (createTableResult.rows.length > 0) {
        sqlContent += `\n-- Tabla: ${table}\n`;
        sqlContent += createTableResult.rows[0].create_statement + '\n\n';

        // Obtener datos
        const dataResult = await client.query(`SELECT * FROM "${table}"`);
        
        if (dataResult.rows.length > 0) {
          sqlContent += `-- Datos de ${table}\n`;
          
          for (const row of dataResult.rows) {
            const columns = Object.keys(row).map(k => `"${k}"`).join(', ');
            const values = Object.values(row).map(v => {
              if (v === null) return 'NULL';
              if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
              if (v instanceof Date) return `'${v.toISOString()}'`;
              return v;
            }).join(', ');
            
            sqlContent += `INSERT INTO "${table}" (${columns}) VALUES (${values});\n`;
          }
          sqlContent += '\n';
        }
      }
    }

    // Guardar archivo
    fs.writeFileSync(backupPath, sqlContent, 'utf8');

    const stats = fs.statSync(backupPath);
    console.log(`✅ Backup creado exitosamente: ${backupFileName}`);
    console.log(`   Tamaño: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Ubicación: ${backupPath}`);

    return backupPath;

  } catch (error) {
    console.error('❌ Error al crear backup:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('backup-neon-directo.js')) {
  backupDatabase()
    .then(() => {
      console.log('\n✅ Proceso de backup completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error en el proceso de backup:', error.message);
      process.exit(1);
    });
}

export { backupDatabase };
