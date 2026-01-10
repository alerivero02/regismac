import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para actualizar los tipos de gas a solo R449a y R404a
 * - Convierte r404 a R404a
 * - Convierte r404a a R404a
 * - Convierte r449a a R449a
 * - Elimina cualquier otro tipo de gas (lo deja en null)
 */
async function updateTiposGas() {
  try {
    console.log('🔄 Iniciando actualización de tipos de gas...');

    // Obtener todas las máquinas
    const maquinas = await prisma.maquina.findMany({
      select: {
        id_maquina: true,
        numero_telaio: true,
        tipo_gas: true,
      },
    });

    console.log(`📊 Encontradas ${maquinas.length} máquinas`);

    let actualizadas = 0;
    let eliminadas = 0;

    for (const maquina of maquinas) {
      if (!maquina.tipo_gas) {
        continue; // Saltar si no tiene tipo de gas
      }

      const tipoGasLower = maquina.tipo_gas.toLowerCase().trim();
      let nuevoTipoGas = null;

      // Normalizar tipos de gas
      if (tipoGasLower === 'r404' || tipoGasLower === 'r404a') {
        nuevoTipoGas = 'R404a';
      } else if (tipoGasLower === 'r449a') {
        nuevoTipoGas = 'R449a';
      } else {
        // Cualquier otro tipo se elimina (se pone null)
        nuevoTipoGas = null;
        eliminadas++;
      }

      // Solo actualizar si cambió
      if (nuevoTipoGas !== maquina.tipo_gas) {
        await prisma.maquina.update({
          where: { id_maquina: maquina.id_maquina },
          data: { tipo_gas: nuevoTipoGas },
        });

        if (nuevoTipoGas) {
          console.log(`✅ ${maquina.numero_telaio}: "${maquina.tipo_gas}" → "${nuevoTipoGas}"`);
          actualizadas++;
        } else {
          console.log(`🗑️  ${maquina.numero_telaio}: "${maquina.tipo_gas}" → eliminado`);
        }
      }
    }

    console.log('\n📈 Resumen:');
    console.log(`   ✅ Actualizadas: ${actualizadas}`);
    console.log(`   🗑️  Eliminadas: ${eliminadas}`);
    console.log(`   ✅ Total procesadas: ${actualizadas + eliminadas}`);

    // Verificar que solo quedan R449a y R404a
    const tiposRestantes = await prisma.maquina.findMany({
      where: {
        tipo_gas: {
          not: null,
        },
      },
      select: {
        tipo_gas: true,
      },
      distinct: ['tipo_gas'],
    });

    console.log('\n🔍 Tipos de gas restantes en la base de datos:');
    tiposRestantes.forEach((t) => {
      console.log(`   - ${t.tipo_gas}`);
    });

    console.log('\n✅ Actualización completada!');
  } catch (error) {
    console.error('❌ Error al actualizar tipos de gas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
updateTiposGas()
  .then(() => {
    console.log('✅ Script ejecutado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  });















