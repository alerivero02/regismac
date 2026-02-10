/**
 * Script para verificar datos restaurados
 */

import 'dotenv/config';
import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

async function verificarDatos() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL no está configurada');
  }

  const client = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('railway.internal') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos\n');

    // Leer backup para contar registros esperados
    const backupPath = process.argv[2] || 'backups/regismac_backup_neon_2026-02-10T12-07-49.sql';
    const backupContent = fs.readFileSync(backupPath, 'utf8');
    
    const expected = {
      Usuario: (backupContent.match(/INSERT INTO "Usuario"/g) || []).length,
      Tecnico: (backupContent.match(/INSERT INTO "Tecnico"/g) || []).length,
      Maquina: (backupContent.match(/INSERT INTO "Maquina"/g) || []).length,
      Test: (backupContent.match(/INSERT INTO "Test"/g) || []).length,
      Lotto: (backupContent.match(/INSERT INTO "Lotto"/g) || []).length,
      Materiale: (backupContent.match(/INSERT INTO "Materiale"/g) || []).length,
    };

    console.log('📊 Comparación de datos:\n');
    console.log('Tabla'.padEnd(15) + 'Esperado'.padEnd(12) + 'Actual'.padEnd(12) + 'Estado');
    console.log('-'.repeat(50));

    const tables = ['Usuario', 'Tecnico', 'Maquina', 'Test', 'Lotto', 'Materiale'];
    let todosOk = true;

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
        const actual = parseInt(result.rows[0].count);
        const esperado = expected[table] || 0;
        const estado = actual === esperado ? '✅ OK' : `⚠️  Faltan ${esperado - actual}`;
        
        if (actual !== esperado) todosOk = false;
        
        console.log(
          table.padEnd(15) + 
          esperado.toString().padEnd(12) + 
          actual.toString().padEnd(12) + 
          estado
        );
      } catch (error) {
        console.log(`${table}: Error - ${error.message}`);
        todosOk = false;
      }
    }

    console.log('\n' + '-'.repeat(50));
    if (todosOk) {
      console.log('✅ Todos los datos están completos');
    } else {
      console.log('⚠️  Faltan algunos datos');
    }

    // Verificar lotes específicos
    console.log('\n📋 Verificando lotes específicos:');
    const lotesResult = await client.query('SELECT id_lotto, numero_lotto FROM "Lotto" ORDER BY id_lotto');
    console.log(`   Lotes encontrados: ${lotesResult.rows.length}`);
    lotesResult.rows.forEach(l => {
      console.log(`   - ID: ${l.id_lotto}, Número: ${l.numero_lotto}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

verificarDatos()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
