import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Lista de materiales comunes para máquinas de refrigeración
const materialiData = [
  { cod_articolo: 'LMSOF0015', codice: 'LMSOF0015', descrizione: 'SERBATOI', fornitore: 'AEFFE 04', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'UCLEO-AE2415Z', codice: 'UCLEO-AE2415Z', descrizione: 'UNITA\' CONDENSATRICE', fornitore: 'ARCI', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '02328037', codice: '02328037', descrizione: '023Z8037/DML 052 CART', fornitore: 'ARCI', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '014-0171', codice: '014-0171', descrizione: 'INDICATORE LIQUIDO E UM', fornitore: 'ARCI', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '068-2002', codice: '068-2002', descrizione: 'T/TE 2 ORIFICIO N. OX', fornitore: 'ARCI', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '068Z3727', codice: '068Z3727', descrizione: 'TS 2 N-CAR/CAR R404A', fornitore: 'ARCI', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'SRV0051602', codice: 'SRV0051602', descrizione: 'RAME NUDO BARRE 5 MT', fornitore: 'BRICOMAN/CET', unita_misura: 'mt', prezzo_unitario: 0 },
  { cod_articolo: 'GIUNTO 20/20', codice: '', descrizione: 'GIUNTO 20/20', fornitore: 'BRICOMAN/CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'GIUNTO 16/16', codice: '', descrizione: 'GIUNTO 16/16', fornitore: 'BRICOMAN/CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'RICARICA OSSIGENO 5 LT RICOX5', codice: '', descrizione: 'RICARICA OSSIGENO 5 LT RICOX5', fornitore: 'CENTRO SERVIZI ANTINCENDIO', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'RICARICA OSSIGENO 7 LT RICOX7', codice: '', descrizione: 'RICARICA OSSIGENO 7 LT RICOX7', fornitore: 'CENTRO SERVIZI ANTINCENDIO', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'DAB 60182213H', codice: 'DAB 60182213H', descrizione: 'DAB VS 65/150 M', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'CONDIZIONATORI', codice: '', descrizione: 'CONDIZIONATORI', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'SRV 500094', codice: 'SRV 500094', descrizione: 'RAME CLIM 25 MT 1/4', fornitore: 'CET', unita_misura: 'mt', prezzo_unitario: 0 },
  { cod_articolo: 'SRV 500095', codice: 'SRV 500095', descrizione: 'RAME CLIM PLAT 50 MT 1/4', fornitore: 'CET', unita_misura: 'mt', prezzo_unitario: 0 },
  { cod_articolo: 'SRV 500098', codice: 'SRV 500098', descrizione: 'RAME CLIM PLAT 50 MT 3/8', fornitore: 'CET', unita_misura: 'mt', prezzo_unitario: 0 },
  { cod_articolo: 'LTO 8280RB2010', codice: 'LTO 8280RB2010', descrizione: 'LEGA 8280 1 KG', fornitore: 'CET', unita_misura: 'kg', prezzo_unitario: 0 },
  { cod_articolo: 'LXO94164800', codice: 'LXO94164800', descrizione: 'PROLUNGA CROM 11/4X11/2', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'ARNF29036N', codice: 'ARNF29036N', descrizione: 'FASC NERA 290 X 3,6 MM', fornitore: 'CET', unita_misura: 'mt', prezzo_unitario: 0 },
  { cod_articolo: 'IBP5002A01400', codice: 'IBP5002A01400', descrizione: 'CURVA RAME D 14', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'IBP5270014000', codice: 'IBP5270014000', descrizione: 'MANICOTTO RAME', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'TCG11286', codice: 'TCG11286', descrizione: 'BOCCH RIDOTTO 1/2 X 3/8', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'TCG11350', codice: 'TCG11350', descrizione: 'BOCCHETTONE X RACC 1/4', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'TCG11351', codice: 'TCG11351', descrizione: 'BOCCHETTONE X RACC 3/8', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'TCG11352', codice: 'TCG11352', descrizione: 'BOCCHETTONE X RACC 1/2', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'TCG11285', codice: 'TCG11285', descrizione: 'BOCCH RIDOTTO 1/4', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'TCG50975', codice: 'TCG50975', descrizione: 'NASTRO ANTICOND. MT10 H5 NERO', fornitore: 'CET', unita_misura: 'mt', prezzo_unitario: 0 },
  { cod_articolo: 'ACLACE-13X015', codice: 'ACLACE-13X015', descrizione: 'TUBO ISOLANTE 13X015 2 MT', fornitore: 'CET', unita_misura: 'mt', prezzo_unitario: 0 },
  { cod_articolo: 'LTO811001251', codice: 'LTO811001251', descrizione: 'BARATTOLO 125 GR DISSOSSIDANTE', fornitore: 'CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'POLISTIRENE WAFER MM20 200KPA', codice: '', descrizione: 'POLISTIRENE WAFER MM20 200KPA', fornitore: 'DE MASI SRL', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'POLISTIRENE WAFER 300KPA', codice: '', descrizione: 'POLISTIRENE WAFER 300KPA', fornitore: 'DE MASI SRL', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '1510-8/6-1/8', codice: '1510-8/6-1/8', descrizione: 'ACCESSORI RACCORDERIA', fornitore: 'ECOSTAR', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '2543-1/8', codice: '2543-1/8', descrizione: 'RACCORDI RAPIDI', fornitore: 'ECOSTAR', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'RICARICA GAS R32', codice: '', descrizione: 'RICARICA GAS R32', fornitore: 'FM MONDO IDEA/TESAFI', unita_misura: 'kg', prezzo_unitario: 0 },
  { cod_articolo: 'BOMBOLA R449A-', codice: '', descrizione: 'BOMBOLA R449A-', fornitore: 'Gas Service', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '03110-S', codice: '03110-S', descrizione: 'SCATOLE ALL 20/10', fornitore: 'LAV. LAMIERE LAZIO', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '03111-S', codice: '03111-S', descrizione: 'COPERCHI ALL 20/10', fornitore: 'LAV. LAMIERE LAZIO', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '03108-S', codice: '03108-S', descrizione: 'SCATOLE ALL 20/10', fornitore: 'LAV. LAMIERE LAZIO', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '03109-S', codice: '03109-S', descrizione: 'COPERCHI ALL 20/10', fornitore: 'LAV. LAMIERE LAZIO', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '03105-S', codice: '03105-S', descrizione: 'SCATOLE RAME 8/10', fornitore: 'LAV. LAMIERE LAZIO', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '03107/S', codice: '03107/S', descrizione: 'COPERCHI RAME 8/10 03107/S', fornitore: 'LAV. LAMIERE LAZIO', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'Mek1', codice: 'Mek1', descrizione: 'TELAIO ZINCATO', fornitore: 'MEK', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'Mek2', codice: 'Mek2', descrizione: 'RONDELLE', fornitore: 'MEK', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'GAS R404A 10 KG', codice: '', descrizione: 'GAS R404A 10 KG', fornitore: 'RIO CARS', unita_misura: 'kg', prezzo_unitario: 0 },
  { cod_articolo: '3045', codice: '3045', descrizione: 'CIRCOLATORE DAB', fornitore: 'SETA90', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'BOMBOLA R449A-XP40', codice: '', descrizione: 'BOMBOLA R449A-XP40', fornitore: 'SOC ASPEX', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '112599', codice: '112599', descrizione: 'UNITA\' CONDENSATRICE', fornitore: 'SPS SOC ASPEX', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'BOMBOLA ACETILE', codice: '', descrizione: 'BOMBOLA ACETILE', fornitore: 'ANTINCENDIO (mandrione)', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'GAS 800 LT', codice: '', descrizione: 'GAS 800 LT', fornitore: 'TERMOGAS', unita_misura: 'lt', prezzo_unitario: 0 },
  { cod_articolo: 'BARRA FILETTATA/SUPPORTO', codice: '', descrizione: 'BARRA FILETTATA/SUPPORTO', fornitore: 'TESAFI', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'INTAGL-M4X12', codice: '', descrizione: 'INTAGL-M4X12', fornitore: 'TESAFI', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'RICARICA GAS R410', codice: '', descrizione: 'RICARICA GAS R410', fornitore: 'TESAFI', unita_misura: 'kg', prezzo_unitario: 0 },
  { cod_articolo: 'VALVOLA A SFERA NORMALE 3/4', codice: '', descrizione: 'VALVOLA A SFERA NORMALE 3/4', fornitore: 'TESAFI/CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: 'VALVOLA A SFERA C/LEV', codice: '', descrizione: 'VALVOLA A SFERA C/LEV', fornitore: 'TESAFI/CET', unita_misura: 'pz', prezzo_unitario: 0 },
  { cod_articolo: '51343412 990 500', codice: '51343412 990 500', descrizione: 'VITE-TC-ISO1207-(PLASTICA)', fornitore: 'WHURT', unita_misura: 'pz', prezzo_unitario: 0 },
];

async function importarMateriali() {
  try {
    console.log('🚀 Iniciando importación de materiales...\n');

    if (materialiData.length === 0) {
      console.log('⚠️  No hay materiales para importar.');
      return;
    }

    let creados = 0;
    let actualizados = 0;
    let errores = 0;

    for (const data of materialiData) {
      try {
        const existente = await prisma.materiale.findUnique({
          where: { cod_articolo: data.cod_articolo },
        });

        if (existente) {
          await prisma.materiale.update({
            where: { cod_articolo: data.cod_articolo },
            data: {
              codice: data.codice || null,
              descrizione: data.descrizione,
              fornitore: data.fornitore,
              unita_misura: data.unita_misura || null,
              prezzo_unitario: data.prezzo_unitario || null,
              note: data.note || null,
            },
          });
          actualizados++;
          console.log(`✓ Materiale actualizado: ${data.cod_articolo}`);
        } else {
          await prisma.materiale.create({
            data: {
              cod_articolo: data.cod_articolo,
              codice: data.codice || null,
              descrizione: data.descrizione,
              fornitore: data.fornitore,
              unita_misura: data.unita_misura || null,
              prezzo_unitario: data.prezzo_unitario || null,
              note: data.note || null,
              stock_comprado: 0,
              stock_utilizado: 0,
              stock_disponible: 0,
            },
          });
          creados++;
          console.log(`✅ Materiale creado: ${data.cod_articolo}`);
        }
      } catch (error) {
        errores++;
        console.error(`❌ Error con ${data.cod_articolo}:`, error.message);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Creados: ${creados}`);
    console.log(`   ✓ Actualizados: ${actualizados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log('\n✨ Importación completada!');
  } catch (error) {
    console.error('❌ Error en la importación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importarMateriali();
