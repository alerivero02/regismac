import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Datos de las máquinas a importar
const maquinasData = [
  { numero: "1299", responsable: "Carinci", responsableProve: "Carinci", partenza: 27, temp0: 8, tempMinus8: 20, gas: 449, giri: "1/2" },
  { numero: "1300", responsable: "Hasan", responsableProve: "Carinci", partenza: 22, temp0: 8, tempMinus8: 13, gas: 449, giri: "1/2" },
  { numero: "1301", responsable: "Hasan", responsableProve: "Carinci", partenza: 26, temp0: 5.5, tempMinus8: 14, gas: 449, giri: "1/2" },
  { numero: "1302", responsable: "Hasan", responsableProve: "Carinci", partenza: 26, temp0: 7, tempMinus8: 16, gas: 404, giri: "1 1/2" },
  { numero: "1303", responsable: "Hasan", responsableProve: "Carinci", partenza: 26, temp0: 7.47, tempMinus8: 18, gas: 404, giri: "1 1/2" },
  { numero: "1304", responsable: "Hasan", responsableProve: "Hasan", partenza: 24, temp0: 7.13, tempMinus8: 17.1, gas: 404, giri: "1 1/2" },
  { numero: "1305", responsable: "Hasan", responsableProve: "Carinci", partenza: 22, temp0: 6.36, tempMinus8: 15.12, gas: 404, giri: "1 1/2" },
  { numero: "1306", responsable: "Hasan", responsableProve: "Carinci", partenza: 24, temp0: 7.3, tempMinus8: 16, gas: 404, giri: "1 1/2" },
  { numero: "1307", responsable: "Hasan", responsableProve: "Carinci", partenza: 25, temp0: 8.09, tempMinus8: 19, gas: 404, giri: "1 1/2" },
  { numero: "1308", responsable: "Hasan", responsableProve: "Carinci", partenza: 25, temp0: 7.2, tempMinus8: 15.3, gas: 449, giri: "1/2" },
  { numero: "1309", responsable: "Hasan", responsableProve: "Carinci", partenza: 25, temp0: 6.4, tempMinus8: 14.6, gas: 449, giri: "1/2" },
  { numero: "1310", responsable: "Hasan", responsableProve: "Cardoni", partenza: 28, temp0: 7.15, tempMinus8: 15.15, gas: 449, giri: "1/2" },
  { numero: "1311", responsable: "Hasan", responsableProve: "Carinci", partenza: 22, temp0: 6, tempMinus8: 11.35, gas: 449, giri: "1/2" },
  { numero: "1312", responsable: "Hasan", responsableProve: "Carinci", partenza: 20, temp0: 5, tempMinus8: 10.8, gas: 449, giri: "1/2" },
  { numero: "1313", responsable: "Hasan", responsableProve: "Carinci", partenza: 23, temp0: 7.4, tempMinus8: 14.3, gas: 449, giri: "1/2" },
  { numero: "1314", responsable: "Hasan", responsableProve: "Carinci", partenza: 24, temp0: 6.09, tempMinus8: 11.7, gas: 449, giri: "1/2" },
  { numero: "1315", responsable: "Hasan", responsableProve: "Carinci", partenza: 25, temp0: 7.05, tempMinus8: 14.1, gas: 404, giri: "1 1/2" },
  { numero: "1316", responsable: "Carinci", responsableProve: "Carinci", partenza: 25, temp0: 7.3, tempMinus8: 17.07, gas: 404, giri: "1 1/2" },
  { numero: "1317", responsable: "Carinci", responsableProve: "Carinci", partenza: 25, temp0: 7.49, tempMinus8: 16.58, gas: 404, giri: "1 1/2" },
  { numero: "1318", responsable: "Carinci", responsableProve: "Carinci", partenza: 25, temp0: 6.06, tempMinus8: 13.1, gas: 449, giri: "1/2" },
  { numero: "1319", responsable: "Carinci", responsableProve: "Carinci", partenza: 25, temp0: 6.5, tempMinus8: 14.4, gas: 449, giri: "1/2" },
  { numero: "1320", responsable: "Hasan", responsableProve: "Hasan", partenza: 25, temp0: 7.4, tempMinus8: 14.6, gas: 449, giri: "1 1/2" },
  { numero: "1321", responsable: "Hasan", responsableProve: "Hasan", partenza: 25, temp0: 4.2, tempMinus8: 11.3, gas: 449, giri: "1/2" },
  { numero: "1322", responsable: "Hasan", responsableProve: "Carinci", partenza: 25, temp0: 6.5, tempMinus8: 13.55, gas: 449, giri: "1/2" },
];

// Función para convertir "1/2" a 0.5 y "1 1/2" a 1.5
function convertirGiri(giri) {
  if (giri === "1/2") return 0.5;
  if (giri === "1 1/2") return 1.5;
  return parseFloat(giri) || null;
}

// Función para convertir número de gas a tipo
function convertirTipoGas(gas) {
  if (gas === 449) return "R449A";
  if (gas === 404) return "R404A";
  return `R${gas}`;
}

// Función para convertir minutos con decimales a segundos
function minutosASegundos(minutos) {
  return Math.round(minutos * 60);
}

async function importarMaquinas() {
  try {
    console.log('🚀 Iniciando importación de máquinas...\n');

    // 1. Crear o obtener técnicos
    const tecnicosMap = {};
    const tecnicosNombres = ['Carinci', 'Hasan', 'Cardoni'];
    
    for (const nombre of tecnicosNombres) {
      let tecnico = await prisma.tecnico.findFirst({
        where: {
          OR: [
            { nome: nombre },
            { cognome: nombre },
            { nome: { contains: nombre } },
            { cognome: { contains: nombre } }
          ]
        }
      });

      if (!tecnico) {
        // Si no existe, crear uno nuevo
        // Asumimos que el nombre completo es solo el apellido
        tecnico = await prisma.tecnico.create({
          data: {
            nome: nombre,
            cognome: '',
          }
        });
        console.log(`✅ Técnico creado: ${nombre}`);
      } else {
        console.log(`✓ Técnico encontrado: ${nombre}`);
      }
      tecnicosMap[nombre] = tecnico.id_tecnico;
    }

    console.log('\n📦 Importando máquinas...\n');

    let creadas = 0;
    let actualizadas = 0;
    let errores = 0;

    for (const data of maquinasData) {
      try {
        const regolazioneValvola = convertirGiri(data.giri);
        const tipoGas = convertirTipoGas(data.gas);
        const idTecnico = tecnicosMap[data.responsable];

        // Verificar si la máquina ya existe
        const maquinaExistente = await prisma.maquina.findUnique({
          where: { numero_telaio: data.numero }
        });

        const datosMaquina = {
          numero_telaio: data.numero,
          tipo_gas: tipoGas,
          regolazione_valvola: regolazioneValvola?.toString() || null,
          stato: 'ok',
          annotazioni: 'OK',
          id_tecnico: idTecnico,
        };

        if (maquinaExistente) {
          // Actualizar máquina existente
          await prisma.maquina.update({
            where: { numero_telaio: data.numero },
            data: datosMaquina
          });
          actualizadas++;
          console.log(`✓ Máquina ${data.numero} actualizada`);
        } else {
          // Crear nueva máquina
          await prisma.maquina.create({
            data: datosMaquina
          });
          creadas++;
          console.log(`✅ Máquina ${data.numero} creada`);
        }

        // Crear test para cada máquina
        const maquina = await prisma.maquina.findUnique({
          where: { numero_telaio: data.numero }
        });

        if (maquina) {
          // Verificar si ya existe un test para esta máquina con estos datos
          const testExistente = await prisma.test.findFirst({
            where: {
              id_maquina: maquina.id_maquina,
              tempo_0_gradi: minutosASegundos(data.temp0),
              tempo_meno8_gradi: minutosASegundos(data.tempMinus8),
            }
          });

          if (!testExistente) {
            await prisma.test.create({
              data: {
                id_maquina: maquina.id_maquina,
                tempo_0_gradi: minutosASegundos(data.temp0),
                tempo_meno8_gradi: minutosASegundos(data.tempMinus8),
                humedad_ambiente: data.partenza || null,
                observazioni: `Test inicial - Responsable prove: ${data.responsableProve}`,
              }
            });
            console.log(`  └─ Test creado para máquina ${data.numero}`);
          }
        }

      } catch (error) {
        errores++;
        console.error(`❌ Error con máquina ${data.numero}:`, error.message);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Máquinas creadas: ${creadas}`);
    console.log(`   ✓ Máquinas actualizadas: ${actualizadas}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log('\n✨ Importación completada!');

  } catch (error) {
    console.error('❌ Error durante la importación:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importarMaquinas();

