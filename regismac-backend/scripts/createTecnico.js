import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTecnico() {
  try {
    const email = process.argv[2] || 'tecnico@regismac.com';
    const password = process.argv[3] || 'tecnico123';
    const nombre = process.argv[4] || 'Tecnico';
    const apellido = process.argv[5] || 'Prueba';

    // Verificar si ya existe
    const existing = await prisma.usuario.findUnique({
      where: { email },
      include: { tecnico: true }
    });

    if (existing) {
      console.log('ℹ️  El usuario ya existe. Actualizando a técnico aprobado...');
      
      // Actualizar a técnico aprobado
      const updated = await prisma.usuario.update({
        where: { email },
        data: {
          rol: 'tecnico',
          estado: 'aprobado',
          nombre: nombre,
          apellido: apellido,
          fecha_aprobacion: new Date(),
        },
        include: { tecnico: true }
      });

      // Crear técnico si no existe
      if (!updated.tecnico) {
        const tecnico = await prisma.tecnico.create({
          data: {
            nome: nombre,
            cognome: apellido,
            id_usuario: updated.id_usuario
          }
        });
        console.log('✅ Técnico creado para usuario existente');
        console.log(`   ID Técnico: ${tecnico.id_tecnico}`);
      }

      console.log('✅ Usuario actualizado exitosamente:');
      console.log(`   Email: ${updated.email}`);
      console.log(`   Nombre: ${updated.nombre} ${updated.apellido || ''}`);
      console.log(`   Rol: ${updated.rol}`);
      console.log(`   Estado: ${updated.estado}`);
    } else {
      // Crear nuevo técnico
      const hashedPassword = await bcrypt.hash(password, 10);
      const usuario = await prisma.usuario.create({
        data: {
          email,
          password: hashedPassword,
          nombre,
          apellido,
          rol: 'tecnico',
          estado: 'aprobado',
          fecha_aprobacion: new Date(),
        },
      });

      // Crear registro de técnico asociado
      const tecnico = await prisma.tecnico.create({
        data: {
          nome: nombre,
          cognome: apellido,
          id_usuario: usuario.id_usuario
        }
      });

      console.log('✅ Técnico creado exitosamente:');
      console.log(`   Email: ${usuario.email}`);
      console.log(`   Nombre: ${usuario.nombre} ${usuario.apellido || ''}`);
      console.log(`   Rol: ${usuario.rol}`);
      console.log(`   Estado: ${usuario.estado}`);
      console.log(`   ID Técnico: ${tecnico.id_tecnico}`);
      console.log(`   Password: ${password} (cámbiala después del primer login)`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTecnico();
