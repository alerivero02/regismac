/**
 * Script para insertar los registros faltantes finales
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function insertarFaltantesFinal() {
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
      await client.query(`
        INSERT INTO "Lotto" ("id_lotto", "numero_lotto", "anno", "descrizione", "data_creazione", "numero_telaio_da", "numero_telaio_a", "createdAt", "updatedAt") 
        VALUES (1, 'LOTTO-2026-001', 2026, '', '2026-01-12T07:06:08.443Z', '1323', '1332', '2026-01-12T07:06:08.443Z', '2026-01-26T07:30:34.464Z')
        ON CONFLICT ("id_lotto") DO NOTHING
      `);
      console.log('   ✅ Lotto 1 procesado');
    } catch (error) {
      console.log('   ⚠️  Error:', error.message.substring(0, 80));
    }

    // Insertar Usuario 6 (Mahmudul Hasan)
    console.log('\n📋 Insertando Usuario 6...');
    try {
      await client.query(`
        INSERT INTO "Usuario" ("id_usuario", "email", "nombre", "apellido", "password", "google_id", "google_email", "google_refresh_token", "foto", "rol", "estado", "fecha_registro", "fecha_aprobacion", "aprobado_por", "current_session_id") 
        VALUES (6, 'Mahmudlhasan429@gmail.com', 'Mahmudul', 'Hasan', '$2b$10$QddJiyPh0T4eFgTWECrMH.2RxSmIvO00iOcX4qthjMRtFI7HiYCx2', NULL, NULL, NULL, NULL, 'tecnico', 'aprobado', '2025-11-24T07:21:45.598Z', '2025-11-24T07:21:57.709Z', 2, NULL)
        ON CONFLICT ("id_usuario") DO NOTHING
      `);
      console.log('   ✅ Usuario 6 procesado');
    } catch (error) {
      console.log('   ⚠️  Error:', error.message.substring(0, 80));
    }

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

insertarFaltantesFinal()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
