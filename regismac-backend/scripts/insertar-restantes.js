/**
 * Script para insertar registros restantes faltantes
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function insertarRestantes() {
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

    // Insertar Lotto 3
    console.log('\n📋 Insertando Lotto 3...');
    try {
      const result = await client.query(`
        INSERT INTO "Lotto" ("id_lotto", "numero_lotto", "anno", "descrizione", "data_creazione", "numero_telaio_da", "numero_telaio_a", "createdAt", "updatedAt") 
        VALUES (3, 'LOTTO-2025-001', 2025, '', '2026-02-09T11:44:26.998Z', '1311', '1322', '2026-02-09T11:44:26.998Z', '2026-02-09T11:44:26.998Z')
        ON CONFLICT ("id_lotto") DO NOTHING
        RETURNING id_lotto
      `);
      if (result.rows.length > 0) {
        console.log(`   ✅ Lotto 3 insertado (id: ${result.rows[0].id_lotto})`);
      } else {
        console.log('   ℹ️  Lotto 3 ya existía');
      }
    } catch (error) {
      console.log('   ⚠️  Error:', error.message.substring(0, 100));
    }

    // Insertar todas las máquinas del backup una por una con ON CONFLICT
    console.log('\n📋 Insertando máquinas faltantes...');
    const maquinas = [
      `INSERT INTO "Maquina" ("id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas", "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2", "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto") VALUES (1, '1323', 'ARCH123', 'R449a', 650, 'R449A', NULL, NULL, 'consegnata', NULL, NULL, '2026-01-07T22:00:00.000Z', '2025-10-27T10:57:00.000Z', '2025-10-28T06:00:00.000Z', 5, 1) ON CONFLICT ("id_maquina") DO NOTHING`,
      `INSERT INTO "Maquina" ("id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas", "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2", "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto") VALUES (2, '1324', 'ARCH124', 'R449a', 650, 'R449A', NULL, NULL, 'consegnata', NULL, NULL, '2026-01-07T22:00:00.000Z', '2026-01-16T14:09:00.000Z', '2026-01-16T14:10:00.000Z', NULL, 1) ON CONFLICT ("id_maquina") DO NOTHING`,
      `INSERT INTO "Maquina" ("id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas", "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2", "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto") VALUES (3, '1325', 'ARCH125', 'R449a', 650, 'R449A', NULL, NULL, 'consegnata', NULL, NULL, '2026-01-07T22:00:00.000Z', '2025-10-29T09:10:00.000Z', '2025-10-29T09:10:00.000Z', NULL, 1) ON CONFLICT ("id_maquina") DO NOTHING`,
      `INSERT INTO "Maquina" ("id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas", "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2", "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto") VALUES (4, '1326', 'ARCH126', 'R449a', 650, 'R449A', NULL, NULL, 'consegnata', NULL, NULL, '2026-01-07T22:00:00.000Z', '2025-11-14T12:30:00.000Z', '2026-01-19T13:46:00.000Z', NULL, 1) ON CONFLICT ("id_maquina") DO NOTHING`,
      `INSERT INTO "Maquina" ("id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas", "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2", "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto") VALUES (5, '1327', 'ARCH127', 'R449a', 650, 'R449A', NULL, NULL, 'consegnata', NULL, NULL, '2026-01-07T22:00:00.000Z', '2025-11-03T07:35:00.000Z', '2025-11-03T07:36:00.000Z', NULL, 1) ON CONFLICT ("id_maquina") DO NOTHING`,
      `INSERT INTO "Maquina" ("id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas", "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2", "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto") VALUES (6, '1328', 'ARCH128', 'R449a', 650, 'R449A', NULL, NULL, 'consegnata', NULL, NULL, '2026-01-07T22:00:00.000Z', '2025-11-04T07:30:00.000Z', '2025-11-04T07:31:00.000Z', NULL, 1) ON CONFLICT ("id_maquina") DO NOTHING`,
      `INSERT INTO "Maquina" ("id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas", "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2", "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto") VALUES (7, '1329', 'ARCH129', 'R449a', 650, 'R449A', NULL, NULL, 'consegnata', NULL, NULL, '2026-01-07T22:00:00.000Z', '2025-11-05T07:46:00.000Z', '2025-11-05T07:47:00.000Z', NULL, 1) ON CONFLICT ("id_maquina") DO NOTHING`,
    ];

    let insertadas = 0;
    for (const insert of maquinas) {
      try {
        const result = await client.query(insert);
        if (result.rowCount > 0) {
          insertadas++;
        }
      } catch (error) {
        // Ignorar errores de duplicados
      }
    }

    // Rehabilitar foreign keys
    await client.query('SET session_replication_role = DEFAULT;');

    console.log(`   ✅ ${insertadas} máquinas adicionales insertadas`);

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

insertarRestantes()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
