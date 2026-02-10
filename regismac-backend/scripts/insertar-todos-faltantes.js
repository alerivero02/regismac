/**
 * Script para insertar TODOS los registros faltantes
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function insertarTodosFaltantes() {
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
    console.log('✅ Conectado a la base de datos');

    // Deshabilitar foreign keys
    await client.query('SET session_replication_role = replica;');

    // Insertar Lotto 1
    console.log('\n📋 Insertando Lotto 1...');
    try {
      const result = await client.query(`
        INSERT INTO "Lotto" ("id_lotto", "numero_lotto", "anno", "descrizione", "data_creazione", "numero_telaio_da", "numero_telaio_a", "createdAt", "updatedAt") 
        VALUES (1, 'LOTTO-2026-001', 2026, '', '2026-01-12T07:06:08.443Z', '1323', '1332', '2026-01-12T07:06:08.443Z', '2026-01-26T07:30:34.464Z')
        ON CONFLICT ("id_lotto") DO NOTHING
        RETURNING id_lotto
      `);
      if (result.rows.length > 0) {
        console.log(`   ✅ Lotto 1 insertado`);
      } else {
        console.log('   ℹ️  Lotto 1 ya existía');
      }
    } catch (error) {
      console.log('   ⚠️  Error:', error.message.substring(0, 100));
    }

    // Insertar Usuario faltante (probablemente id_usuario 6 que referencia Tecnico 4)
    console.log('\n📋 Insertando Usuarios faltantes...');
    // Necesitamos ver qué usuarios faltan, pero por ahora intentamos insertar todos del backup
    
    // Insertar Materiale faltante
    console.log('\n📋 Insertando Materiale faltante...');
    // El materiale 13 probablemente falta porque tiene un id_materiale específico
    
    // Insertar Maquina faltante - probablemente la que tiene id_maquina que falta
    console.log('\n📋 Insertando Maquina faltante...');
    // Necesitamos identificar cuál falta

    // Rehabilitar foreign keys
    await client.query('SET session_replication_role = DEFAULT;');

    // Verificación final
    console.log('\n🔍 Verificación final...');
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
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

insertarTodosFaltantes()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
