import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Emails de los usuarios técnicos a verificar/corregir
const emailsTecnicos = [
  'Mahmudlhasan429@gmail.com',
  'marcocarinci.ecosun@gmail.com'
];

async function fixTecnicos() {
  try {
    console.log('🔍 Verificando usuarios técnicos...\n');

    for (const email of emailsTecnicos) {
      console.log(`\n📧 Procesando: ${email}`);
      
      // Buscar usuario por email (intentar con diferentes formatos)
      let usuario = await prisma.usuario.findUnique({
        where: { email: email.toLowerCase() },
        include: { tecnico: true }
      });
      
      // Si no se encuentra con minúsculas, intentar con el formato original
      if (!usuario) {
        usuario = await prisma.usuario.findUnique({
          where: { email: email },
          include: { tecnico: true }
        });
      }
      
      // Si aún no se encuentra, buscar todos y filtrar
      if (!usuario) {
        const usuarios = await prisma.usuario.findMany({
          include: { tecnico: true }
        });
        usuario = usuarios.find(u => 
          u.email.toLowerCase() === email.toLowerCase()
        );
      }

      if (!usuario) {
        console.log(`   ⚠️  Usuario no encontrado en la base de datos`);
        continue;
      }

      console.log(`   ✅ Usuario encontrado:`);
      console.log(`      ID: ${usuario.id_usuario}`);
      console.log(`      Nombre: ${usuario.nombre} ${usuario.apellido || ''}`);
      console.log(`      Rol actual: ${usuario.rol}`);
      console.log(`      Estado actual: ${usuario.estado}`);
      console.log(`      Técnico asociado: ${usuario.tecnico ? 'Sí' : 'No'}`);

      // Verificar y actualizar rol y estado si es necesario
      let necesitaActualizacion = false;
      const updates = {};

      if (usuario.rol !== 'tecnico') {
        console.log(`   🔄 Actualizando rol de '${usuario.rol}' a 'tecnico'`);
        updates.rol = 'tecnico';
        necesitaActualizacion = true;
      }

      if (usuario.estado !== 'aprobado') {
        console.log(`   🔄 Actualizando estado de '${usuario.estado}' a 'aprobado'`);
        updates.estado = 'aprobado';
        updates.fecha_aprobacion = new Date();
        necesitaActualizacion = true;
      }

      // Actualizar usuario si es necesario
      if (necesitaActualizacion) {
        const usuarioActualizado = await prisma.usuario.update({
          where: { id_usuario: usuario.id_usuario },
          data: updates
        });
        console.log(`   ✅ Usuario actualizado correctamente`);
      }

      // Verificar y crear técnico si no existe
      if (!usuario.tecnico) {
        console.log(`   🔄 Creando registro de técnico...`);
        try {
          const tecnico = await prisma.tecnico.create({
            data: {
              nome: usuario.nombre,
              cognome: usuario.apellido || '',
              id_usuario: usuario.id_usuario
            }
          });
          console.log(`   ✅ Técnico creado: ID ${tecnico.id_tecnico}`);
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`   ⚠️  Ya existe un técnico para este usuario (posible duplicado)`);
          } else {
            throw error;
          }
        }
      } else {
        console.log(`   ✅ Técnico ya existe: ID ${usuario.tecnico.id_tecnico}`);
      }
    }

    console.log('\n\n📊 Verificación final de técnicos disponibles...\n');
    
    // Verificar todos los técnicos disponibles
    const tecnicos = await prisma.tecnico.findMany({
      where: {
        usuario: {
          estado: 'aprobado',
          rol: 'tecnico'
        }
      },
      include: {
        usuario: {
          select: {
            email: true,
            nombre: true,
            apellido: true,
            rol: true,
            estado: true
          }
        }
      },
      orderBy: {
        nome: 'asc'
      }
    });

    console.log(`✅ Total de técnicos disponibles: ${tecnicos.length}\n`);
    tecnicos.forEach((tecnico, index) => {
      console.log(`${index + 1}. ${tecnico.nome} ${tecnico.cognome}`);
      console.log(`   Email: ${tecnico.usuario?.email || 'N/A'}`);
      console.log(`   Rol: ${tecnico.usuario?.rol || 'N/A'}`);
      console.log(`   Estado: ${tecnico.usuario?.estado || 'N/A'}`);
      console.log('');
    });

    console.log('✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Detalles:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixTecnicos();

