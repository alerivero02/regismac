/**
 * Script para verificar datos completos en Neon y comparar con Railway
 */

import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function verificarNeonCompleto() {
  // URL de Neon (la original)
  const neonUrl = process.env.NEON_DATABASE_URL || 'postgresql://neondb_owner:npg_X7abERnIgAT4@ep-lingering-tooth-agdmiw5c.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  
  // URL de Railway
  const railwayUrl = process.env.DATABASE_URL || 'postgresql://postgres:omXDwdltqYYBKtdDqesWwZPlNZJyoaZx@hopper.proxy.rlwy.net:14653/railway';

  console.log('🔍 Verificando datos en Neon (original)...\n');

  const neonClient = new Client({
    connectionString: neonUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const railwayClient = new Client({
    connectionString: railwayUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await neonClient.connect();
    console.log('✅ Conectado a Neon\n');

    await railwayClient.connect();
    console.log('✅ Conectado a Railway\n');

    const tables = ['Usuario', 'Tecnico', 'Maquina', 'Test', 'Lotto', 'Materiale'];
    
    console.log('📊 COMPARACIÓN DE DATOS:\n');
    console.log('Tabla'.padEnd(15) + 'Neon'.padEnd(12) + 'Railway'.padEnd(12) + 'Diferencia');
    console.log('-'.repeat(60));

    for (const table of tables) {
      try {
        const neonResult = await neonClient.query(`SELECT COUNT(*) as count FROM "${table}"`);
        const railwayResult = await railwayClient.query(`SELECT COUNT(*) as count FROM "${table}"`);
        
        const neonCount = parseInt(neonResult.rows[0].count);
        const railwayCount = parseInt(railwayResult.rows[0].count);
        const diff = neonCount - railwayCount;
        const estado = diff === 0 ? '✅' : `⚠️  -${diff}`;
        
        console.log(
          table.padEnd(15) + 
          neonCount.toString().padEnd(12) + 
          railwayCount.toString().padEnd(12) + 
          estado
        );
      } catch (error) {
        console.log(`${table}: Error - ${error.message}`);
      }
    }

    // Verificar máquinas específicas
    console.log('\n\n📋 MÁQUINAS EN NEON:');
    const neonMaquinas = await neonClient.query('SELECT id_maquina, numero_telaio, stato FROM "Maquina" ORDER BY id_maquina');
    console.log(`   Total: ${neonMaquinas.rows.length} máquinas`);
    const neonIds = neonMaquinas.rows.map(m => m.id_maquina);
    neonMaquinas.rows.forEach(m => {
      console.log(`   - ID: ${m.id_maquina}, Telaio: ${m.numero_telaio}, Estado: ${m.stato || 'N/A'}`);
    });

    console.log('\n📋 MÁQUINAS EN RAILWAY:');
    const railwayMaquinas = await railwayClient.query('SELECT id_maquina, numero_telaio, stato FROM "Maquina" ORDER BY id_maquina');
    console.log(`   Total: ${railwayMaquinas.rows.length} máquinas`);
    const railwayIds = railwayMaquinas.rows.map(m => m.id_maquina);
    railwayMaquinas.rows.forEach(m => {
      console.log(`   - ID: ${m.id_maquina}, Telaio: ${m.numero_telaio}, Estado: ${m.stato || 'N/A'}`);
    });

    // Encontrar máquinas faltantes
    const neonIdsSet = new Set(neonIds);
    const railwayIdsSet = new Set(railwayIds);
    const faltantes = neonIds.filter(id => !railwayIdsSet.has(id));
    
    if (faltantes.length > 0) {
      console.log('\n⚠️  MÁQUINAS FALTANTES EN RAILWAY:');
      for (const id of faltantes) {
        const maquina = neonMaquinas.rows.find(m => m.id_maquina === id);
        console.log(`   - ID: ${id}, Telaio: ${maquina?.numero_telaio || 'N/A'}, Estado: ${maquina?.stato || 'N/A'}`);
      }
    }

    // Encontrar pruebas faltantes
    console.log('\n\n📋 PRUEBAS POR MÁQUINA EN NEON:');
    const testsPorMaquinaNeon = await neonClient.query(`
      SELECT id_maquina, COUNT(*) as count 
      FROM "Test" 
      GROUP BY id_maquina 
      ORDER BY id_maquina
    `);
    testsPorMaquinaNeon.rows.forEach(t => {
      console.log(`   Máquina ${t.id_maquina}: ${t.count} pruebas`);
    });

    console.log('\n📋 PRUEBAS POR MÁQUINA EN RAILWAY:');
    const testsPorMaquinaRailway = await railwayClient.query(`
      SELECT id_maquina, COUNT(*) as count 
      FROM "Test" 
      GROUP BY id_maquina 
      ORDER BY id_maquina
    `);
    testsPorMaquinaRailway.rows.forEach(t => {
      console.log(`   Máquina ${t.id_maquina}: ${t.count} pruebas`);
    });

    // Encontrar pruebas faltantes por máquina
    const testsNeon = await neonClient.query('SELECT id_test, id_maquina FROM "Test" ORDER BY id_test');
    const testsRailway = await railwayClient.query('SELECT id_test, id_maquina FROM "Test" ORDER BY id_test');
    const testsNeonIds = new Set(testsNeon.rows.map(t => t.id_test));
    const testsRailwayIds = new Set(testsRailway.rows.map(t => t.id_test));
    const testsFaltantes = testsNeon.rows.filter(t => !testsRailwayIds.has(t.id_test));
    
    if (testsFaltantes.length > 0) {
      console.log('\n⚠️  PRUEBAS FALTANTES EN RAILWAY:');
      testsFaltantes.forEach(t => {
        console.log(`   - Test ID: ${t.id_test}, Máquina: ${t.id_maquina}`);
      });
    }


  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await neonClient.end();
    await railwayClient.end();
  }
}

verificarNeonCompleto()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
