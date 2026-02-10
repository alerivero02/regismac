/**
 * Script para insertar registros faltantes
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function insertarFaltantes() {
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

    // Insertar Lotto 3 si no existe
    console.log('\n📋 Insertando Lotto 3...');
    try {
      await client.query(`
        INSERT INTO "Lotto" ("id_lotto", "numero_lotto", "anno", "descrizione", "data_creazione", "numero_telaio_da", "numero_telaio_a", "createdAt", "updatedAt") 
        VALUES (3, 'LOTTO-2025-001', 2025, '', '2026-02-09T11:44:26.998Z', '1311', '1322', '2026-02-09T11:44:26.998Z', '2026-02-09T11:44:26.998Z')
        ON CONFLICT ("id_lotto") DO NOTHING
      `);
      console.log('   ✅ Lotto 3 insertado o ya existía');
    } catch (error) {
      console.log('   ⚠️  Error:', error.message.substring(0, 80));
    }

    // Insertar Tecnico 4 si no existe
    console.log('\n📋 Insertando Tecnico 4...');
    try {
      await client.query(`
        INSERT INTO "Tecnico" ("id_tecnico", "nome", "cognome", "id_usuario") 
        VALUES (4, 'Mahmudul', 'Hasan', 6)
        ON CONFLICT ("id_tecnico") DO NOTHING
      `);
      console.log('   ✅ Tecnico 4 insertado o ya existía');
    } catch (error) {
      console.log('   ⚠️  Error:', error.message.substring(0, 80));
    }

    // Insertar Tecnico 5 si no existe
    console.log('\n📋 Insertando Tecnico 5...');
    try {
      await client.query(`
        INSERT INTO "Tecnico" ("id_tecnico", "nome", "cognome", "id_usuario") 
        VALUES (5, 'Marco', 'Carinci', 4)
        ON CONFLICT ("id_tecnico") DO NOTHING
      `);
      console.log('   ✅ Tecnico 5 insertado o ya existía');
    } catch (error) {
      console.log('   ⚠️  Error:', error.message.substring(0, 80));
    }

    // Intentar insertar la máquina faltante (probablemente id_maquina que falta)
    console.log('\n📋 Verificando máquinas faltantes...');
    const maquinasResult = await client.query('SELECT COUNT(*) as count FROM "Maquina"');
    console.log(`   Máquinas actuales: ${maquinasResult.rows[0].count}`);

    // Verificar qué máquinas faltan comparando con el backup
    // Por ahora, intentar insertar todas las máquinas del backup de nuevo con ON CONFLICT
    console.log('\n📋 Intentando insertar máquinas faltantes...');
    
    // Deshabilitar foreign keys temporalmente
    await client.query('SET session_replication_role = replica;');
    
    // Lista de todas las máquinas del backup (solo las que pueden faltar)
    const maquinasFaltantes = [
      `INSERT INTO "Maquina" ("id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas", "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2", "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto") VALUES (1, '1323', 'ARCH123', 'R449a', 650, 'R449A', NULL, NULL, 'consegnata', NULL, NULL, '2026-01-07T22:00:00.000Z', '2025-10-27T10:57:00.000Z', '2025-10-28T06:00:00.000Z', 5, 1) ON CONFLICT ("id_maquina") DO NOTHING`,
      // Agregar más si es necesario
    ];

    let insertadas = 0;
    for (const insert of maquinasFaltantes) {
      try {
        await client.query(insert);
        insertadas++;
      } catch (error) {
        // Ignorar errores de duplicados
      }
    }

    // Rehabilitar foreign keys
    await client.query('SET session_replication_role = DEFAULT;');

    console.log(`   ✅ ${insertadas} máquinas adicionales procesadas`);

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

insertarFaltantes()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
