import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Datos de los tests a importar (máquinas 1299-1322)
const testsData = [
  { numero: "1299", temp0: 8, tempMinus8: 20, partenza: 27 },
  { numero: "1300", temp0: 8, tempMinus8: 13, partenza: 22 },
  { numero: "1301", temp0: 5.5, tempMinus8: 14, partenza: 26 },
  { numero: "1302", temp0: 7, tempMinus8: 16, partenza: 26 },
  { numero: "1303", temp0: 7.47, tempMinus8: 18, partenza: 26 },
  { numero: "1304", temp0: 7.13, tempMinus8: 17.1, partenza: 24 },
  { numero: "1305", temp0: 6.36, tempMinus8: 15.12, partenza: 22 },
  { numero: "1306", temp0: 7.3, tempMinus8: 16, partenza: 24 },
  { numero: "1307", temp0: 8.09, tempMinus8: 19, partenza: 25 },
  { numero: "1308", temp0: 7.2, tempMinus8: 15.3, partenza: 25 },
  { numero: "1309", temp0: 6.4, tempMinus8: 14.6, partenza: 25 },
  { numero: "1310", temp0: 7.15, tempMinus8: 15.15, partenza: 28 },
  { numero: "1311", temp0: 6, tempMinus8: 11.35, partenza: 22 },
  { numero: "1312", temp0: 5, tempMinus8: 10.8, partenza: 20 },
  { numero: "1313", temp0: 7.4, tempMinus8: 14.3, partenza: 23 },
  { numero: "1314", temp0: 6.09, tempMinus8: 11.7, partenza: 24 },
  { numero: "1315", temp0: 7.05, tempMinus8: 14.1, partenza: 25 },
  { numero: "1316", temp0: 7.3, tempMinus8: 17.07, partenza: 25 },
  { numero: "1317", temp0: 7.49, tempMinus8: 16.58, partenza: 25 },
  { numero: "1318", temp0: 6.06, tempMinus8: 13.1, partenza: 25 },
  { numero: "1319", temp0: 6.5, tempMinus8: 14.4, partenza: 25 },
  { numero: "1320", temp0: 7.4, tempMinus8: 14.6, partenza: 25 },
  { numero: "1321", temp0: 4.2, tempMinus8: 11.3, partenza: 25 },
  { numero: "1322", temp0: 6.5, tempMinus8: 13.55, partenza: 25 },
];

// Función para convertir minutos con decimales a segundos
function minutosASegundos(minutos) {
  return Math.round(minutos * 60);
}

async function importarTests() {
  try {
    console.log('🚀 Iniciando importación de tests...\n');

    // 1. Buscar técnico Marco Carinci
    const tecnicoCarinci = await prisma.tecnico.findFirst({
      where: {
        OR: [
          { nome: "Marco", cognome: "Carinci" },
          { nome: { contains: "Marco" }, cognome: { contains: "Carinci" } },
          { cognome: "Carinci" }
        ]
      }
    });

    if (!tecnicoCarinci) {
      console.error('❌ No se encontró el técnico Marco Carinci');
      console.log('💡 Creando técnico Marco Carinci...');
      const nuevoTecnico = await prisma.tecnico.create({
        data: {
          nome: "Marco",
          cognome: "Carinci"
        }
      });
      console.log(`✅ Técnico creado: Marco Carinci (ID: ${nuevoTecnico.id_tecnico})`);
      var idTecnicoCarinci = nuevoTecnico.id_tecnico;
    } else {
      console.log(`✓ Técnico encontrado: Marco Carinci (ID: ${tecnicoCarinci.id_tecnico})`);
      var idTecnicoCarinci = tecnicoCarinci.id_tecnico;
    }

    console.log('\n📦 Importando tests...\n');

    let creados = 0;
    let actualizados = 0;
    let errores = 0;

    for (const data of testsData) {
      try {
        // Buscar la máquina
        const maquina = await prisma.maquina.findUnique({
          where: { numero_telaio: data.numero }
        });

        if (!maquina) {
          console.log(`⚠️  Máquina ${data.numero} no encontrada, saltando...`);
          continue;
        }

        // Convertir tiempos de minutos a segundos
        const tempo0Segundos = minutosASegundos(data.temp0);
        const tempoMenos8Segundos = minutosASegundos(data.tempMinus8);

        // Verificar si ya existe un test para esta máquina con estos tiempos
        const testExistente = await prisma.test.findFirst({
          where: {
            id_maquina: maquina.id_maquina,
            tempo_0_gradi: tempo0Segundos,
            tempo_meno8_gradi: tempoMenos8Segundos,
          }
        });

        if (testExistente) {
          // Actualizar el test existente con el técnico
          await prisma.test.update({
            where: { id_test: testExistente.id_test },
            data: {
              id_tecnico: idTecnicoCarinci,
              hora_test: testExistente.hora_test || testExistente.fecha_test,
            }
          });
          actualizados++;
          console.log(`✓ Test actualizado para máquina ${data.numero}`);
        } else {
          // Crear nuevo test
          const fechaTest = new Date(); // Usar fecha actual
          await prisma.test.create({
            data: {
              id_maquina: maquina.id_maquina,
              id_tecnico: idTecnicoCarinci,
              tempo_0_gradi: tempo0Segundos,
              tempo_meno8_gradi: tempoMenos8Segundos,
              humedad_ambiente: data.partenza || null,
              hora_test: fechaTest,
              observazioni: 'Test importado desde Excel',
            }
          });
          creados++;
          console.log(`✅ Test creado para máquina ${data.numero}`);
        }

        // Verificar si la máquina tiene menos de 2 tests y crear un segundo test si es necesario
        const todosLosTests = await prisma.test.findMany({
          where: { id_maquina: maquina.id_maquina }
        });

        if (todosLosTests.length < 2) {
          // Crear un segundo test con los mismos tiempos pero con fecha posterior
          const primerTest = todosLosTests[0];
          const fechaSegundoTest = new Date(primerTest.hora_test || primerTest.fecha_test);
          fechaSegundoTest.setDate(fechaSegundoTest.getDate() + 1); // 1 día después

          await prisma.test.create({
            data: {
              id_maquina: maquina.id_maquina,
              id_tecnico: idTecnicoCarinci,
              tempo_0_gradi: tempo0Segundos,
              tempo_meno8_gradi: tempoMenos8Segundos,
              humedad_ambiente: data.partenza || null,
              hora_test: fechaSegundoTest,
              observazioni: 'Segundo test - Validación estado OK',
            }
          });
          console.log(`  └─ Segundo test creado para máquina ${data.numero}`);
        }

        // Obtener la máquina actualizada después de crear/actualizar el test
        const maquinaActualizada = await prisma.maquina.findUnique({
          where: { id_maquina: maquina.id_maquina }
        });

        // Actualizar fecha_primera_prueba si no existe
        if (!maquinaActualizada.fecha_primera_prueba) {
          const primeraPrueba = await prisma.test.findFirst({
            where: { id_maquina: maquina.id_maquina },
            orderBy: { fecha_test: 'asc' }
          });

          if (primeraPrueba) {
            await prisma.maquina.update({
              where: { id_maquina: maquina.id_maquina },
              data: {
                fecha_primera_prueba: primeraPrueba.hora_test || primeraPrueba.fecha_test
              }
            });
            console.log(`  └─ Fecha primera prueba actualizada para máquina ${data.numero}`);
          }
        }

        // Verificar si debe actualizar fecha_estado_ok
        // Obtener todos los tests de esta máquina actualizados
        const testsDeMaquina = await prisma.test.findMany({
          where: { id_maquina: maquina.id_maquina },
          orderBy: { fecha_test: 'asc' }
        });

        // Filtrar pruebas que tengan ambos tiempos registrados
        const testsCompletos = testsDeMaquina.filter(t => 
          t.tempo_0_gradi !== null && t.tempo_meno8_gradi !== null
        );

        // Si hay al menos 2 pruebas completas, verificar condiciones
        if (testsCompletos.length >= 2) {
          const ultimas2Tests = testsCompletos.slice(-2);
            // Importar función de verificación de límites
            const { verificarLimitesTest } = await import('../src/config/testLimits.js');
            
            const cumplenCondiciones = ultimas2Tests.every(test => {
              return verificarLimitesTest(test.tempo_0_gradi, test.tempo_meno8_gradi);
            });

          if (cumplenCondiciones) {
            // Obtener la máquina actualizada
            const maquinaActual = await prisma.maquina.findUnique({
              where: { id_maquina: maquina.id_maquina }
            });
            
            // Actualizar estado a "ok" si no lo está
            const updateData = { stato: 'ok' };
            
            // Si no tiene fecha_estado_ok, establecerla con la fecha del segundo test
            if (!maquinaActual.fecha_estado_ok) {
              const fechaEstadoOk = ultimas2Tests[1].hora_test || ultimas2Tests[1].fecha_test;
              updateData.fecha_estado_ok = fechaEstadoOk;
              await prisma.maquina.update({
                where: { id_maquina: maquina.id_maquina },
                data: updateData
              });
              console.log(`  └─ Estado OK y fecha actualizados para máquina ${data.numero}`);
            } else if (maquinaActual.stato !== 'ok') {
              // Solo actualizar el estado si no está en "ok"
              await prisma.maquina.update({
                where: { id_maquina: maquina.id_maquina },
                data: { stato: 'ok' }
              });
              console.log(`  └─ Estado actualizado a OK para máquina ${data.numero}`);
            }
          }
        }

      } catch (error) {
        errores++;
        console.error(`❌ Error con máquina ${data.numero}:`, error.message);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Tests creados: ${creados}`);
    console.log(`   ✓ Tests actualizados: ${actualizados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log('\n✨ Importación completada!');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importarTests();

