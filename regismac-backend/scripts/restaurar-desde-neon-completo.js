/**
 * Script para restaurar TODOS los datos faltantes directamente desde Neon
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function restaurarDesdeNeonCompleto() {
  const neonUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  const railwayUrl = process.env.DATABASE_URL || 'postgresql://postgres:omXDwdltqYYBKtdDqesWwZPlNZJyoaZx@hopper.proxy.rlwy.net:14653/railway';

  console.log('🔄 Restaurando datos faltantes desde Neon a Railway...\n');

  const neonClient = new Client({
    connectionString: neonUrl,
    ssl: { rejectUnauthorized: false }
  });

  const railwayClient = new Client({
    connectionString: railwayUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await neonClient.connect();
    console.log('✅ Conectado a Neon');

    await railwayClient.connect();
    console.log('✅ Conectado a Railway\n');

    // Deshabilitar foreign keys en Railway
    await railwayClient.query('SET session_replication_role = replica;');
    console.log('🔓 Foreign keys deshabilitadas temporalmente\n');

    // 1. Restaurar Usuario faltante
    console.log('📋 1. Restaurando Usuario faltante...');
    const usuariosNeon = await neonClient.query('SELECT * FROM "Usuario" ORDER BY id_usuario');
    const usuariosRailway = await railwayClient.query('SELECT id_usuario FROM "Usuario"');
    const usuariosRailwayIds = new Set(usuariosRailway.rows.map(u => u.id_usuario));
    
    let usuariosInsertados = 0;
    for (const usuario of usuariosNeon.rows) {
      if (!usuariosRailwayIds.has(usuario.id_usuario)) {
        try {
          await railwayClient.query(`
            INSERT INTO "Usuario" (
              "id_usuario", "email", "nombre", "apellido", "password", "google_id", 
              "google_email", "google_refresh_token", "foto", "rol", "estado", 
              "fecha_registro", "fecha_aprobacion", "aprobado_por", "current_session_id"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT ("id_usuario") DO NOTHING
          `, [
            usuario.id_usuario, usuario.email, usuario.nombre, usuario.apellido,
            usuario.password, usuario.google_id, usuario.google_email, usuario.google_refresh_token,
            usuario.foto, usuario.rol, usuario.estado, usuario.fecha_registro,
            usuario.fecha_aprobacion, usuario.aprobado_por, usuario.current_session_id
          ]);
          usuariosInsertados++;
          console.log(`   ✅ Usuario ${usuario.id_usuario} (${usuario.email}) insertado`);
        } catch (error) {
          console.log(`   ⚠️  Error insertando usuario ${usuario.id_usuario}: ${error.message.substring(0, 60)}`);
        }
      }
    }
    console.log(`   Total: ${usuariosInsertados} usuarios insertados\n`);

    // 2. Restaurar Materiale faltante
    console.log('📋 2. Restaurando Materiale faltante...');
    const materialeNeon = await neonClient.query('SELECT * FROM "Materiale" ORDER BY id_materiale');
    const materialeRailway = await railwayClient.query('SELECT id_materiale FROM "Materiale"');
    const materialeRailwayIds = new Set(materialeRailway.rows.map(m => m.id_materiale));
    
    let materialeInsertados = 0;
    for (const materiale of materialeNeon.rows) {
      if (!materialeRailwayIds.has(materiale.id_materiale)) {
        try {
          await railwayClient.query(`
            INSERT INTO "Materiale" (
              "id_materiale", "cod_articolo", "codice", "descrizione", "fornitore",
              "unita_misura", "prezzo_unitario", "note", "stock_comprado", "stock_utilizado",
              "stock_disponible", "activar_alerta", "stock_minimo", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT ("id_materiale") DO NOTHING
          `, [
            materiale.id_materiale, materiale.cod_articolo, materiale.codice, materiale.descrizione,
            materiale.fornitore, materiale.unita_misura, materiale.prezzo_unitario, materiale.note,
            materiale.stock_comprado, materiale.stock_utilizado, materiale.stock_disponible,
            materiale.activar_alerta, materiale.stock_minimo, materiale.createdAt, materiale.updatedAt
          ]);
          materialeInsertados++;
        } catch (error) {
          console.log(`   ⚠️  Error insertando materiale ${materiale.id_materiale}: ${error.message.substring(0, 60)}`);
        }
      }
    }
    console.log(`   Total: ${materialeInsertados} materiale insertados\n`);

    // 3. Restaurar Máquina faltante (ID: 8)
    console.log('📋 3. Restaurando Máquina faltante (ID: 8)...');
    const maquina8 = await neonClient.query('SELECT * FROM "Maquina" WHERE id_maquina = 8');
    if (maquina8.rows.length > 0) {
      const m = maquina8.rows[0];
      try {
        await railwayClient.query(`
          INSERT INTO "Maquina" (
            "id_maquina", "numero_telaio", "seriale_compressore", "tipo_gas", "quantita_gas",
            "tipo_valvola", "regolazione_valvola", "annotazioni", "stato", "foto1", "foto2",
            "data_consegna", "fecha_primera_prueba", "fecha_estado_ok", "id_tecnico", "id_lotto"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT ("id_maquina") DO NOTHING
        `, [
          m.id_maquina, m.numero_telaio, m.seriale_compressore, m.tipo_gas, m.quantita_gas,
          m.tipo_valvola, m.regolazione_valvola, m.annotazioni, m.stato, m.foto1, m.foto2,
          m.data_consegna, m.fecha_primera_prueba, m.fecha_estado_ok, m.id_tecnico, m.id_lotto
        ]);
        console.log(`   ✅ Máquina 8 (Telaio: ${m.numero_telaio}) insertada\n`);
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message.substring(0, 80)}\n`);
      }
    }

    // 4. Restaurar Prueba faltante (Test ID: 1)
    console.log('📋 4. Restaurando Prueba faltante (Test ID: 1)...');
    const test1 = await neonClient.query('SELECT * FROM "Test" WHERE id_test = 1');
    if (test1.rows.length > 0) {
      const t = test1.rows[0];
      try {
        await railwayClient.query(`
          INSERT INTO "Test" (
            "id_test", "id_maquina", "id_tecnico", "temperatura_iniziale", "regolazione_vite",
            "tempo_0_gradi", "tempo_meno8_gradi", "quantita_liquido", "humedad_ambiente",
            "fecha_test", "hora_test", "observazioni"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT ("id_test") DO NOTHING
        `, [
          t.id_test, t.id_maquina, t.id_tecnico, t.temperatura_iniziale, t.regolazione_vite,
          t.tempo_0_gradi, t.tempo_meno8_gradi, t.quantita_liquido, t.humedad_ambiente,
          t.fecha_test, t.hora_test, t.observazioni
        ]);
        console.log(`   ✅ Test 1 (Máquina: ${t.id_maquina}) insertado\n`);
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message.substring(0, 80)}\n`);
      }
    }

    // Rehabilitar foreign keys
    await railwayClient.query('SET session_replication_role = DEFAULT;');
    console.log('🔒 Foreign keys rehabilitadas\n');

    // Verificación final
    console.log('🔍 Verificación final:\n');
    const tables = ['Usuario', 'Tecnico', 'Maquina', 'Test', 'Lotto', 'Materiale'];
    for (const table of tables) {
      const neonCount = (await neonClient.query(`SELECT COUNT(*) as count FROM "${table}"`)).rows[0].count;
      const railwayCount = (await railwayClient.query(`SELECT COUNT(*) as count FROM "${table}"`)).rows[0].count;
      const estado = parseInt(neonCount) === parseInt(railwayCount) ? '✅' : '⚠️';
      console.log(`   ${table}: Neon=${neonCount}, Railway=${railwayCount} ${estado}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await neonClient.end();
    await railwayClient.end();
  }
}

restaurarDesdeNeonCompleto()
  .then(() => {
    console.log('\n✅ Restauración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
