import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { verificarLimitesTest } from '../src/config/testLimits.js';

const prisma = new PrismaClient();

async function recalcularFechaEstadoOk() {
  try {
    console.log('🔄 Iniciando recálculo de fecha_estado_ok...\n');

    // Obtener todas las máquinas
    const maquinas = await prisma.maquina.findMany({
      include: {
        tests: {
          orderBy: [
            { hora_test: 'asc' },
            { fecha_test: 'asc' },
            { id_test: 'asc' }
          ]
        }
      }
    });

    let actualizadas = 0;
    let sinCambios = 0;

    for (const maquina of maquinas) {
      // Filtrar pruebas completas
      const testsCompletos = maquina.tests.filter(t => 
        t.tempo_0_gradi !== null && t.tempo_meno8_gradi !== null
      );

      if (testsCompletos.length >= 2) {
        // Ordenar por fecha
        const testsOrdenados = [...testsCompletos].sort((a, b) => {
          const fechaA = new Date(a.hora_test || a.fecha_test || 0);
          const fechaB = new Date(b.hora_test || b.fecha_test || 0);
          return fechaA - fechaB;
        });

        // Tomar las últimas 2 pruebas
        const ultimas2Tests = testsOrdenados.slice(-2);
        const cumplenCondiciones = ultimas2Tests.every(test => {
          return verificarLimitesTest(test.tempo_0_gradi, test.tempo_meno8_gradi);
        });

        if (cumplenCondiciones) {
          // Calcular la fecha correcta (fecha de la prueba más reciente)
          const pruebaMasReciente = ultimas2Tests[ultimas2Tests.length - 1];
          const fechaEstadoOkCorrecta = pruebaMasReciente.hora_test || pruebaMasReciente.fecha_test;

          // Verificar si necesita actualización
          const fechaActual = maquina.fecha_estado_ok ? new Date(maquina.fecha_estado_ok) : null;
          const fechaCorrecta = new Date(fechaEstadoOkCorrecta);

          if (!fechaActual || fechaActual.getTime() !== fechaCorrecta.getTime()) {
            await prisma.maquina.update({
              where: { id_maquina: maquina.id_maquina },
              data: {
                stato: 'ok',
                fecha_estado_ok: fechaEstadoOkCorrecta
              }
            });

            console.log(`✅ Máquina ${maquina.numero_telaio} (ID: ${maquina.id_maquina}):`);
            console.log(`   Fecha anterior: ${fechaActual ? fechaActual.toISOString() : 'null'}`);
            console.log(`   Fecha nueva: ${fechaCorrecta.toISOString()}`);
            console.log(`   Mes: ${fechaCorrecta.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}\n`);
            actualizadas++;
          } else {
            sinCambios++;
          }
        }
      }
    }

    // Verificar máquinas específicas si se pasan como argumentos
    const maquinasEspecificas = process.argv.slice(2);
    if (maquinasEspecificas.length > 0) {
      console.log(`\n🔍 Verificando máquinas específicas: ${maquinasEspecificas.join(', ')}\n`);
      const ora = new Date();
      const inizioMese = new Date(ora.getFullYear(), ora.getMonth(), 1);
      console.log(`📅 Mes actual: ${ora.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`);
      console.log(`📅 Inicio del mes: ${inizioMese.toISOString()}\n`);
      
      for (const numeroTelaio of maquinasEspecificas) {
        const maquina = maquinas.find(m => m.numero_telaio === numeroTelaio);
        if (maquina) {
          console.log(`\n📋 Máquina ${maquina.numero_telaio} (ID: ${maquina.id_maquina}):`);
          console.log(`   Estado: ${maquina.stato}`);
          console.log(`   fecha_estado_ok: ${maquina.fecha_estado_ok ? new Date(maquina.fecha_estado_ok).toISOString() : 'null'}`);
          if (maquina.fecha_estado_ok) {
            const fechaOk = new Date(maquina.fecha_estado_ok);
            const estaEnEsteMes = fechaOk >= inizioMese;
            console.log(`   ¿Está en este mes?: ${estaEnEsteMes ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   Mes de fecha_estado_ok: ${fechaOk.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`);
          }
          console.log(`   data_consegna: ${maquina.data_consegna ? new Date(maquina.data_consegna).toISOString() : 'null'}`);
          console.log(`   Total pruebas: ${maquina.tests.length}`);
          const testsCompletos = maquina.tests.filter(t => 
            t.tempo_0_gradi !== null && t.tempo_meno8_gradi !== null
          );
          console.log(`   Pruebas completas: ${testsCompletos.length}`);
          if (testsCompletos.length >= 2) {
            const testsOrdenados = [...testsCompletos].sort((a, b) => {
              const fechaA = new Date(a.hora_test || a.fecha_test || 0);
              const fechaB = new Date(b.hora_test || b.fecha_test || 0);
              return fechaA - fechaB;
            });
            const ultimas2Tests = testsOrdenados.slice(-2);
            console.log(`   Últimas 2 pruebas:`);
            ultimas2Tests.forEach((test, idx) => {
              const fecha = new Date(test.hora_test || test.fecha_test);
              console.log(`     ${idx + 1}. Fecha: ${fecha.toISOString()}, 0°C: ${test.tempo_0_gradi}s, -8°C: ${test.tempo_meno8_gradi}s`);
              const cumple = verificarLimitesTest(test.tempo_0_gradi, test.tempo_meno8_gradi);
              console.log(`        Cumple condiciones: ${cumple ? '✅' : '❌'}`);
            });
            const cumplenCondiciones = ultimas2Tests.every(test => {
              return verificarLimitesTest(test.tempo_0_gradi, test.tempo_meno8_gradi);
            });
            console.log(`   Cumplen condiciones ambas: ${cumplenCondiciones ? '✅' : '❌'}`);
          }
        } else {
          console.log(`❌ Máquina ${numeroTelaio} no encontrada`);
        }
      }
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   Máquinas actualizadas: ${actualizadas}`);
    console.log(`   Máquinas sin cambios: ${sinCambios}`);
    console.log(`   Total procesadas: ${maquinas.length}`);

  } catch (error) {
    console.error('❌ Error al recalcular fecha_estado_ok:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

recalcularFechaEstadoOk()
  .then(() => {
    console.log('\n✅ Recálculo completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el recálculo:', error);
    process.exit(1);
  });

