import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createComercial() {
  try {
    const email = process.argv[2] || 'fotovoltaico.ecosun@gmail.com';
    const password = process.argv[3] || 'comercial123';
    const nombre = process.argv[4] || 'Comercial';
    const apellido = process.argv[5] || 'EcoSun';

    // Verificar si ya existe
    const existing = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('ℹ️  El usuario ya existe. Actualizando a comercial aprobado...');
      
      // Actualizar a comercial aprobado
      const updated = await prisma.usuario.update({
        where: { email },
        data: {
          rol: 'comercial',
          estado: 'aprobado',
          nombre: nombre,
          apellido: apellido,
          fecha_aprobacion: new Date(),
        },
      });

      console.log('✅ Usuario actualizado exitosamente:');
      console.log(`   Email: ${updated.email}`);
      console.log(`   Nombre: ${updated.nombre} ${updated.apellido || ''}`);
      console.log(`   Rol: ${updated.rol}`);
      console.log(`   Estado: ${updated.estado}`);
    } else {
      // Crear nuevo comercial
      const hashedPassword = await bcrypt.hash(password, 10);
      const comercial = await prisma.usuario.create({
        data: {
          email,
          password: hashedPassword,
          nombre,
          apellido,
          rol: 'comercial',
          estado: 'aprobado',
          fecha_aprobacion: new Date(),
        },
      });

      console.log('✅ Comercial creado exitosamente:');
      console.log(`   Email: ${comercial.email}`);
      console.log(`   Nombre: ${comercial.nombre} ${comercial.apellido || ''}`);
      console.log(`   Rol: ${comercial.rol}`);
      console.log(`   Estado: ${comercial.estado}`);
      console.log(`   Password: ${password} (cámbiala después del primer login)`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createComercial();

