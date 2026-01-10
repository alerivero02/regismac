import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function migrateOrdini() {
  try {
    console.log('🔄 Iniciando migración de órdenes...');
    
    // Verificar si existe la tabla antigua
    const oldOrdini = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM OrdineMateriale
    `.catch(() => null);
    
    if (!oldOrdini || oldOrdini[0]?.count === 0) {
      console.log('✅ No hay datos antiguos para migrar');
      return;
    }
    
    console.log(`📦 Encontradas ${oldOrdini[0].count} órdenes antiguas`);
    
    // Obtener todas las órdenes antiguas
    const ordiniVecchi = await prisma.$queryRaw`
      SELECT * FROM OrdineMateriale ORDER BY id_ordine
    `;
    
    console.log(`📦 Migrando ${ordiniVecchi.length} órdenes...`);
    
    // Agrupar órdenes por datos comunes (mismo estado, fechas, usuario, note)
    const ordiniGrouped = {};
    
    ordiniVecchi.forEach(ordine => {
      const key = `${ordine.stato}_${ordine.data_richiesta}_${ordine.id_usuario || 'null'}_${ordine.note || 'null'}`;
      if (!ordiniGrouped[key]) {
        ordiniGrouped[key] = {
          stato: ordine.stato,
          data_richiesta: ordine.data_richiesta,
          data_ordine: ordine.data_ordine,
          data_consegna_prevista: ordine.data_consegna_prevista,
          id_usuario: ordine.id_usuario,
          note: ordine.note,
          items: []
        };
      }
      ordiniGrouped[key].items.push({
        id_materiale: ordine.id_materiale,
        quantita: ordine.quantita,
      });
    });
    
    // Crear las nuevas órdenes
    let created = 0;
    for (const [key, ordineData] of Object.entries(ordiniGrouped)) {
      await prisma.ordine.create({
        data: {
          stato: ordineData.stato,
          data_richiesta: ordineData.data_richiesta,
          data_ordine: ordineData.data_ordine,
          data_consegna_prevista: ordineData.data_consegna_prevista,
          id_usuario: ordineData.id_usuario,
          note: ordineData.note,
          items: {
            create: ordineData.items.map(item => ({
              id_materiale: item.id_materiale,
              quantita: item.quantita,
            }))
          }
        }
      });
      created++;
    }
    
    console.log(`✅ Migración completada: ${created} órdenes creadas con ${ordiniVecchi.length} items totales`);
    console.log('⚠️  IMPORTANTE: La tabla OrdineMateriale antigua aún existe. Elimínala manualmente después de verificar que todo funciona correctamente.');
    
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateOrdini();

