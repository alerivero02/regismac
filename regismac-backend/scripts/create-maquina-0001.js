import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createMaquina0001() {
  try {
    console.log('Creando máquina 0001...');
    
    // Verificar si ya existe
    const existing = await prisma.maquina.findUnique({
      where: { numero_telaio: '0001' }
    });
    
    if (existing) {
      console.log('✅ La máquina 0001 ya existe con ID:', existing.id_maquina);
      return existing;
    }
    
    // Crear la máquina
    const maquina = await prisma.maquina.create({
      data: {
        numero_telaio: '0001',
        seriale_compressore: 'TEST-0001',
        tipo_gas: 'R134a',
        quantita_gas: 0.0,
        tipo_valvola: 'Test',
        annotazioni: 'Máquina de prueba para tests con sensor ESP32',
        stato: 'en_produccion'
      }
    });
    
    console.log('✅ Máquina 0001 creada exitosamente con ID:', maquina.id_maquina);
    console.log('Datos:', {
      id: maquina.id_maquina,
      numero_telaio: maquina.numero_telaio,
      seriale_compressore: maquina.seriale_compressore,
      estado: maquina.stato
    });
    
    return maquina;
  } catch (error) {
    console.error('❌ Error al crear máquina 0001:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createMaquina0001()
  .then(() => {
    console.log('Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
