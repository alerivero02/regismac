/**
 * Script para importar materiales desde la lista proporcionada
 * Ejecuta: node scripts/importMaterialiLista.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lista de materiales desde la imagen
const materiales = [
  { cod_articolo: 'DAB 60182213H', codice: 'DAB 60182213H', descrizione: 'DAB VS 65/150 M', fornitore: 'CET' },
  { cod_articolo: '3045', codice: '3045', descrizione: 'CIRCOLATORE DAB', fornitore: 'SETA90' },
  { cod_articolo: '03110-S', codice: '03110-S', descrizione: 'SCATOLE ALL 20/10', fornitore: 'LAV. LAMIERE LAZIO' },
  { cod_articolo: '03111-S', codice: '03111-S', descrizione: 'COPERCHI ALL 20/10', fornitore: 'LAV. LAMIERE LAZIO' },
  { cod_articolo: '03108-S', codice: '03108-S', descrizione: 'SCATOLE ALL 20/10', fornitore: 'LAV. LAMIERE LAZIO' },
  { cod_articolo: '03109-S', codice: '03109-S', descrizione: 'COPERCHI ALL 20/10', fornitore: 'LAV. LAMIERE LAZIO' },
  { cod_articolo: '03105-S', codice: '03105-S', descrizione: 'SCATOLE RAME 8/10', fornitore: 'LAV. LAMIERE LAZIO' },
  { cod_articolo: '03107/S', codice: '03107/S', descrizione: 'COPERCHI RAME 8/10 03107/S', fornitore: 'LAV. LAMIERE LAZIO' },
  { cod_articolo: 'MEK1', codice: 'MEK1', descrizione: 'TELAIO ZINCATO', fornitore: 'MEK' },
  { cod_articolo: 'MEK2', codice: 'MEK2', descrizione: 'RONDELLE', fornitore: 'MEK' },
  { cod_articolo: 'UCLEO-AE2415Z', codice: 'UCLEO-AE2415Z', descrizione: 'UNITA\' CONDENSATRICE', fornitore: 'ARCI' },
  { cod_articolo: '023Z8037', codice: '023Z8037', descrizione: '023Z8037/DML 052 CART', fornitore: 'ARCI' },
  { cod_articolo: '014-0171', codice: '014-0171', descrizione: 'INDICATORE LIQUIDO E UM', fornitore: 'ARCI' },
  { cod_articolo: '068-2002', codice: '068-2002', descrizione: 'T/TE 2 ORIFICIO N. OX', fornitore: 'ARCI' },
  { cod_articolo: '068Z3727', codice: '068Z3727', descrizione: 'TS 2 N-CAR/CAR R404A', fornitore: 'ARCI' },
  { cod_articolo: '112599', codice: '112599', descrizione: 'UNITA\' CONDENSATRICE', fornitore: 'SPS SOC ASPEX' },
  { cod_articolo: 'CONDIZIONATORI', codice: '', descrizione: 'CONDIZIONATORI', fornitore: 'CET' },
  { cod_articolo: 'SRV 500094', codice: 'SRV 500094', descrizione: 'RAME CLIM 25 MT 1/4', fornitore: 'CET' },
  { cod_articolo: 'SRV 500095', codice: 'SRV 500095', descrizione: 'RAME CLIM PLAT 50 MT 1/4', fornitore: 'CET' },
  { cod_articolo: 'SRV 500098', codice: 'SRV 500098', descrizione: 'RAME CLIM PLAT 50 MT 3/8', fornitore: 'CET' },
  { cod_articolo: 'LTO 8280RB2010', codice: 'LTO 8280RB2010', descrizione: 'LEGA 8280 1 KG', fornitore: 'CET' },
  { cod_articolo: 'LXO94164800', codice: 'LXO94164800', descrizione: 'RIDUZIONE CROM 11/4X11/2', fornitore: 'CET' },
  { cod_articolo: 'ARNF29036N', codice: 'ARNF29036N', descrizione: 'FASC NERA 290 X 3,6 MM', fornitore: 'CET' },
  { cod_articolo: 'IBP5002A01400', codice: 'IBP5002A01400', descrizione: 'CURVA RAME', fornitore: 'CET' },
  { cod_articolo: 'IBP5270014000', codice: 'IBP5270014000', descrizione: 'MANICOTTO RAME', fornitore: 'CET' },
  { cod_articolo: 'SRV0051602', codice: 'SRV0051602', descrizione: 'RAME NUDO BARRE 5 MT', fornitore: 'BRICOMAN/CET' },
  { cod_articolo: 'TCG11286', codice: 'TCG11286', descrizione: 'BOCCH RIDOTTO 1/2 X 3/8', fornitore: 'CET' },
  { cod_articolo: 'TCG11350', codice: 'TCG11350', descrizione: 'BOCCHETTONE X RACC 1/4', fornitore: 'CET' },
  { cod_articolo: 'TCG11351', codice: 'TCG11351', descrizione: 'BOCCHETTONE X RACC 3/8', fornitore: 'CET' },
  { cod_articolo: 'TCG11352', codice: 'TCG11352', descrizione: 'BOCCHETTONE X RACC 1/2', fornitore: 'CET' },
  { cod_articolo: 'TCG11285', codice: 'TCG11285', descrizione: 'BOCCH RIDOTTO 1/4', fornitore: 'CET' },
  { cod_articolo: 'TCG50975', codice: 'TCG50975', descrizione: 'NASTRO ANTICOND. MT10 H5 NERO', fornitore: 'CET' },
  { cod_articolo: 'ACLACE-13X015', codice: 'ACLACE-13X015', descrizione: 'TUBO ISOLANTE 13X015 2 MT', fornitore: 'CET' },
  { cod_articolo: 'LTO811001251', codice: 'LTO811001251', descrizione: 'BARATTOLO 125 GR DISSOSSIDANTE', fornitore: 'CET' },
  { cod_articolo: 'GIUNTO 20/20', codice: '', descrizione: 'GIUNTO 20/20', fornitore: 'BRICOMAN/CET' },
  { cod_articolo: 'GIUNTO 16/16', codice: '', descrizione: 'GIUNTO 16/16', fornitore: 'BRICOMAN/CET' },
  { cod_articolo: 'LMSOF0015', codice: 'LMSOF0015', descrizione: 'SERBATOI', fornitore: 'AEFFE 04' },
  { cod_articolo: '1510-8/6-1/8', codice: '1510-8/6-1/8', descrizione: 'ACCESSORI RACCORDERIA', fornitore: 'ECOSTAR' },
  { cod_articolo: '2543-1/8', codice: '2543-1/8', descrizione: 'RACCORDI RAPIDI', fornitore: 'ECOSTAR' },
  { cod_articolo: 'VALVOLA SFERA 3/4', codice: '', descrizione: 'VALVOLA A SFERA NORMALE 3/4', fornitore: 'TESAFI/CET' },
  { cod_articolo: 'VALVOLA SFERA C/LEV', codice: '', descrizione: 'VALVOLA A SFERA C/LEV', fornitore: 'TESAFI/CET' },
  { cod_articolo: 'BARRA FILETTATA', codice: '', descrizione: 'BARRA FILETTATA/SUPPORTO', fornitore: 'TESAFI' },
  { cod_articolo: '51343412 990 500', codice: '51343412 990 500', descrizione: 'VITE-TC-ISO1207-(PLASTICA)', fornitore: 'WHURT' },
  { cod_articolo: 'INTAGL-M4X12', codice: '', descrizione: 'INTAGL-M4X12', fornitore: 'TESAFI' },
  { cod_articolo: 'POLISTIRENE 20MM', codice: '', descrizione: 'POLISTIRENE WAFER MM20 200KPA', fornitore: 'DE MASI SRL' },
  { cod_articolo: 'POLISTIRENE 300KPA', codice: '', descrizione: 'POLISTIRENE WAFER 300KPA', fornitore: 'DE MASI SRL' },
  { cod_articolo: 'RICOX5', codice: 'RICOX5', descrizione: 'RICARICA OSSIGENO 5 LT RICOX5', fornitore: 'CENTRO SERVIZI ANTINCENDIO' },
  { cod_articolo: 'GAS R32', codice: '', descrizione: 'RICARICA GAS R32', fornitore: 'FM MONDO IDEA/TESAFI' },
  { cod_articolo: 'GAS 800 LT', codice: '', descrizione: 'GAS 800 LT', fornitore: 'TERMOGAS' },
  { cod_articolo: 'GAS R410', codice: '', descrizione: 'RICARICA GAS R410', fornitore: 'TESAFI' },
  { cod_articolo: '141530P', codice: '141530P', descrizione: 'BOMBOLA R449A-', fornitore: 'SOC ASPEX' },
  { cod_articolo: 'GAS R404A 10KG', codice: '', descrizione: 'GAS R404A 10 KG', fornitore: 'RIO CARS' },
  { cod_articolo: 'BAD5', codice: 'BAD5', descrizione: 'BOMBOLA ACETILENE 5 LT', fornitore: 'CENTRO SERVIZI ANTICENDI' },
];

async function importarMateriales() {
  try {
    console.log('🔄 Iniciando importación de materiales...\n');
    
    let creados = 0;
    let existentes = 0;
    let errores = 0;

    for (const materiale of materiales) {
      try {
        // Verificar si ya existe (por cod_articolo y fornitore)
        const existente = await prisma.materiale.findFirst({
          where: {
            cod_articolo: materiale.cod_articolo,
            fornitore: materiale.fornitore,
          },
        });

        if (existente) {
          console.log(`⚠️  Ya existe: ${materiale.cod_articolo} - ${materiale.descrizione}`);
          existentes++;
          continue;
        }

        // Crear el materiale
        await prisma.materiale.create({
          data: {
            cod_articolo: materiale.cod_articolo,
            codice: materiale.codice || null,
            descrizione: materiale.descrizione,
            fornitore: materiale.fornitore,
            activar_alerta: true, // Por defecto activar alerta
            stock_minimo: null, // Se configurará después
          },
        });

        console.log(`✅ Creado: ${materiale.cod_articolo} - ${materiale.descrizione}`);
        creados++;
      } catch (error) {
        console.error(`❌ Error al crear ${materiale.cod_articolo}:`, error.message);
        errores++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Resumen de importación:');
    console.log(`   ✅ Creados: ${creados}`);
    console.log(`   ⚠️  Existentes: ${existentes}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📦 Total procesados: ${materiales.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importarMateriales();

