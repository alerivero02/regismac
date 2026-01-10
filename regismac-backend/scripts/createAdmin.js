import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const email = process.argv[2] || 'admin@example.com';
    const password = process.argv[3] || 'admin123';
    const nombre = process.argv[4] || 'Administrador';

    // Verificar si ya existe
    const existing = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existing) {
      console.log('❌ El usuario ya existe');
      process.exit(1);
    }

    // Crear admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.usuario.create({
      data: {
        email,
        password: hashedPassword,
        nombre,
        rol: 'admin',
        estado: 'aprobado', // El admin se auto-aprueba
      },
    });

    console.log('✅ Administrador creado exitosamente:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Nombre: ${admin.nombre}`);
    console.log(`   Rol: ${admin.rol}`);
    console.log(`   Estado: ${admin.estado}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();

