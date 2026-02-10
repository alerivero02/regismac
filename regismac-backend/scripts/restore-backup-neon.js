/**
 * Script para restaurar backup de Neon en Railway PostgreSQL
 * Uso: node scripts/restore-backup-neon.js <ruta-del-backup.sql>
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function restoreBackup(backupPath) {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL no está configurada');
  }

  if (!fs.existsSync(backupPath)) {
    throw new Error(`El archivo de backup no existe: ${backupPath}`);
  }

  console.log('🔄 Iniciando restauración de backup...');
  console.log(`   Archivo: ${path.basename(backupPath)}`);
  console.log(`   Base de datos: ${new URL(dbUrl).pathname.slice(1)}`);

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('railway.internal') ? false : {
      rejectUnauthorized: false
    },
    // Aumentar timeout para operaciones largas
    connectionTimeoutMillis: 30000,
    query_timeout: 60000
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Leer el archivo SQL
    const sqlContent = fs.readFileSync(backupPath, 'utf8');
    
    // Dividir en statements de manera más robusta
    // Primero, normalizar saltos de línea y espacios
    const normalized = sqlContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Dividir por punto y coma, pero mantener el contexto de los INSERTs
    // Usar una expresión regular más robusta que maneje saltos de línea dentro de VALUES
    const allStatements = [];
    let currentStatement = '';
    let inQuotes = false;
    let quoteChar = null;
    
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized[i];
      const nextChar = normalized[i + 1];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
        currentStatement += char;
      } else if (inQuotes && char === quoteChar && normalized[i - 1] !== '\\') {
        inQuotes = false;
        quoteChar = null;
        currentStatement += char;
      } else if (!inQuotes && char === ';' && (nextChar === '\n' || nextChar === undefined || nextChar.trim() === '')) {
        currentStatement += char;
        const trimmed = currentStatement.trim();
        if (trimmed.length > 0 && !trimmed.startsWith('--')) {
          allStatements.push(trimmed);
        }
        currentStatement = '';
      } else {
        currentStatement += char;
      }
    }
    
    // Agregar el último statement si no terminó con punto y coma
    if (currentStatement.trim().length > 0 && !currentStatement.trim().startsWith('--')) {
      allStatements.push(currentStatement.trim());
    }

    console.log(`📋 Encontrados ${allStatements.length} statements SQL`);

    // Separar CREATE TABLE e INSERTs
    const createTables = [];
    const inserts = {
      Usuario: [],
      Lotto: [],
      Materiale: [],
      Tecnico: [],
      Maquina: [],
      Test: []
    };

    for (const statement of allStatements) {
      if (statement.startsWith('CREATE TABLE')) {
        createTables.push(statement);
      } else if (statement.startsWith('INSERT INTO')) {
        // Identificar la tabla del INSERT
        const match = statement.match(/INSERT INTO\s+"?(\w+)"?/i);
        if (match && match[1]) {
          const tableName = match[1];
          if (inserts[tableName]) {
            inserts[tableName].push(statement);
          } else {
            // Tabla desconocida, agregarla a un array general
            if (!inserts['_other']) inserts['_other'] = [];
            inserts['_other'].push(statement);
          }
        }
      }
    }

    // Paso 1: Crear tablas
    console.log('\n📋 Paso 1: Creando tablas...');
    let executed = 0;
    let errors = 0;

    for (const createTable of createTables) {
      try {
        await client.query(createTable);
        executed++;
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('relation already exists')) {
          // Tabla ya existe, continuar
          executed++;
        } else {
          console.error(`⚠️  Error creando tabla:`, error.message.substring(0, 100));
          errors++;
        }
      }
    }
    console.log(`   ✅ ${executed} tablas procesadas`);

    // Paso 2: Deshabilitar temporalmente foreign keys para insertar datos
    console.log('\n📋 Paso 2: Deshabilitando temporalmente foreign keys...');
    try {
      // Deshabilitar triggers de foreign keys (PostgreSQL)
      await client.query('SET session_replication_role = replica;');
      console.log('   ✅ Foreign keys deshabilitadas temporalmente');
    } catch (fkError) {
      console.log('   ⚠️  No se pudieron deshabilitar foreign keys, continuando...');
    }

    // Paso 3: Insertar datos en orden correcto
    console.log('\n📋 Paso 3: Insertando datos...');
    
    const insertOrder = ['Usuario', 'Lotto', 'Materiale', 'Tecnico', 'Maquina', 'Test'];
    
    for (const tableName of insertOrder) {
      if (inserts[tableName] && inserts[tableName].length > 0) {
        console.log(`   Insertando ${tableName}...`);
        let tableExecuted = 0;
        let tableErrors = 0;
        
        for (const insert of inserts[tableName]) {
          try {
            // Agregar ON CONFLICT DO NOTHING si no existe
            let insertQuery = insert;
            if (!insertQuery.includes('ON CONFLICT')) {
              // Detectar la clave primaria de la tabla
              if (tableName === 'Usuario') {
                insertQuery = insert.replace(/;?\s*$/, '') + ' ON CONFLICT ("id_usuario") DO NOTHING;';
              } else if (tableName === 'Lotto') {
                insertQuery = insert.replace(/;?\s*$/, '') + ' ON CONFLICT ("id_lotto") DO NOTHING;';
              } else if (tableName === 'Materiale') {
                insertQuery = insert.replace(/;?\s*$/, '') + ' ON CONFLICT ("id_materiale") DO NOTHING;';
              } else if (tableName === 'Tecnico') {
                insertQuery = insert.replace(/;?\s*$/, '') + ' ON CONFLICT ("id_tecnico") DO NOTHING;';
              } else if (tableName === 'Maquina') {
                insertQuery = insert.replace(/;?\s*$/, '') + ' ON CONFLICT ("id_maquina") DO NOTHING;';
              } else if (tableName === 'Test') {
                insertQuery = insert.replace(/;?\s*$/, '') + ' ON CONFLICT ("id_test") DO NOTHING;';
              }
            }
            await client.query(insertQuery);
            tableExecuted++;
          } catch (error) {
            if (error.message.includes('duplicate key') || 
                error.message.includes('already exists') ||
                error.message.includes('unique constraint')) {
              // Registro duplicado, continuar
              tableExecuted++;
            } else if (error.message.includes('foreign key constraint')) {
              // Con foreign keys deshabilitadas, esto no debería pasar, pero por si acaso
              tableErrors++;
            } else {
              console.error(`     ⚠️  Error:`, error.message.substring(0, 80));
              tableErrors++;
            }
          }
        }
        console.log(`     ✅ ${tableExecuted} registros insertados, ${tableErrors} errores`);
        executed += tableExecuted;
        errors += tableErrors;
      }
    }

    // Paso 4: Rehabilitar foreign keys
    console.log('\n📋 Paso 4: Rehabilitando foreign keys...');
    try {
      await client.query('SET session_replication_role = DEFAULT;');
      console.log('   ✅ Foreign keys rehabilitadas');
    } catch (fkError) {
      console.log('   ⚠️  Error al rehabilitar foreign keys:', fkError.message.substring(0, 60));
    }

    // Insertar otras tablas si existen
    if (inserts['_other'] && inserts['_other'].length > 0) {
      console.log(`   Insertando otras tablas...`);
      for (const insert of inserts['_other']) {
        try {
          await client.query(insert);
          executed++;
        } catch (error) {
          if (!error.message.includes('duplicate key')) {
            errors++;
          }
        }
      }
    }

    console.log(`✅ Restauración completada:`);
    console.log(`   Statements ejecutados: ${executed}`);
    if (errors > 0) {
      console.log(`   Errores: ${errors} (pueden ser normales si las tablas ya existen)`);
    }

    // Verificar que los datos se restauraron
    console.log('\n🔍 Verificando datos restaurados...');
    
    const tables = ['Usuario', 'Tecnico', 'Maquina', 'Test', 'Lotto', 'Materiale'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
        const count = parseInt(result.rows[0].count);
        console.log(`   ${table}: ${count} registros`);
      } catch (error) {
        console.log(`   ${table}: Error al verificar (${error.message})`);
      }
    }

  } catch (error) {
    console.error('❌ Error al restaurar backup:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Ejecutar si se llama directamente
const backupPath = process.argv[2];

if (!backupPath) {
  console.error('❌ Uso: node scripts/restore-backup-neon.js <ruta-del-backup.sql>');
  console.error('   Ejemplo: node scripts/restore-backup-neon.js backups/regismac_backup_neon_2026-02-10T12-07-49.sql');
  process.exit(1);
}

// Resolver ruta relativa
const resolvedPath = path.isAbsolute(backupPath) 
  ? backupPath 
  : path.join(__dirname, '..', backupPath);

restoreBackup(resolvedPath)
  .then(() => {
    console.log('\n✅ Proceso de restauración completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el proceso de restauración:', error.message);
    process.exit(1);
  });

export { restoreBackup };
