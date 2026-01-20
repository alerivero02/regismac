import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTecnicoPrueba() {
  try {
    console.log('Creando técnico de prueba...');
    
    const nome = 'Tecnico';
    const cognome = 'Prueba';
    
    // Verificar si ya existe
    const existing = await prisma.tecnico.findFirst({
      where: {
        nome: nome,
        cognome: cognome
      }
    });
    
    if (existing) {
      console.log('✅ El técnico de prueba ya existe con ID:', existing.id_tecnico);
      console.log('Datos:', {
        id: existing.id_tecnico,
        nome: existing.nome,
        cognome: existing.cognome
      });
      return existing;
    }
    
    // Crear el técnico
    const tecnico = await prisma.tecnico.create({
      data: {
        nome: nome,
        cognome: cognome
      }
    });
    
    console.log('✅ Técnico de prueba creado exitosamente con ID:', tecnico.id_tecnico);
    console.log('Datos:', {
      id: tecnico.id_tecnico,
      nome: tecnico.nome,
      cognome: tecnico.cognome
    });
    
    return tecnico;
  } catch (error) {
    console.error('❌ Error al crear técnico de prueba:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTecnicoPrueba()
  .then(() => {
    console.log('Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
