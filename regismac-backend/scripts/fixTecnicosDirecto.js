import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Emails de los usuarios técnicos a verificar/corregir
const emailsTecnicos = [
  'Mahmudlhasan429@gmail.com',
  'marcocarinci.ecosun@gmail.com'
];

async function fixTecnicosDirecto() {
  try {
    console.log('🔍 Verificando usuarios técnicos...\n');
    await prisma.$connect();

    for (const email of emailsTecnicos) {
      console.log(`\n📧 Procesando: ${email}`);
      
      // Buscar usuario usando queryRaw para evitar problemas con Prisma Client
      const usuarios = await prisma.$queryRaw`
        SELECT 
          id_usuario,
          email,
          nombre,
          apellido,
          rol,
          estado,
          fecha_aprobacion
        FROM "Usuario"
        WHERE LOWER(email) = LOWER(${email})
      `;

      if (!usuarios || usuarios.length === 0) {
        console.log(`   ⚠️  Usuario no encontrado en la base de datos`);
        continue;
      }

      const usuario = usuarios[0];
      console.log(`   ✅ Usuario encontrado:`);
      console.log(`      ID: ${usuario.id_usuario}`);
      console.log(`      Nombre: ${usuario.nombre} ${usuario.apellido || ''}`);
      console.log(`      Rol actual: ${usuario.rol}`);
      console.log(`      Estado actual: ${usuario.estado}`);

      // Verificar si tiene técnico asociado
      const tecnicos = await prisma.$queryRaw`
        SELECT id_tecnico FROM "Tecnico" WHERE id_usuario = ${usuario.id_usuario}
      `;
      const tieneTecnico = tecnicos && tecnicos.length > 0;
      console.log(`      Técnico asociado: ${tieneTecnico ? 'Sí' : 'No'}`);

      // Actualizar rol y estado si es necesario
      const updates = [];
      if (usuario.rol !== 'tecnico') {
        console.log(`   🔄 Actualizando rol de '${usuario.rol}' a 'tecnico'`);
        await prisma.$executeRaw`
          UPDATE "Usuario"
          SET rol = 'tecnico'
          WHERE id_usuario = ${usuario.id_usuario}
        `;
        updates.push('rol');
      }

      if (usuario.estado !== 'aprobado') {
        console.log(`   🔄 Actualizando estado de '${usuario.estado}' a 'aprobado'`);
        await prisma.$executeRaw`
          UPDATE "Usuario"
          SET estado = 'aprobado',
              fecha_aprobacion = COALESCE(fecha_aprobacion, NOW())
          WHERE id_usuario = ${usuario.id_usuario}
        `;
        updates.push('estado');
      }

      if (updates.length > 0) {
        console.log(`   ✅ Usuario actualizado: ${updates.join(', ')}`);
      }

      // Crear técnico si no existe
      if (!tieneTecnico) {
        console.log(`   🔄 Creando registro de técnico...`);
        try {
          await prisma.$executeRaw`
            INSERT INTO "Tecnico" (nome, cognome, id_usuario)
            VALUES (${usuario.nombre}, ${usuario.apellido || ''}, ${usuario.id_usuario})
            ON CONFLICT (id_usuario) DO NOTHING
          `;
          
          const nuevoTecnico = await prisma.$queryRaw`
            SELECT id_tecnico FROM "Tecnico" WHERE id_usuario = ${usuario.id_usuario}
          `;
          
          if (nuevoTecnico && nuevoTecnico.length > 0) {
            console.log(`   ✅ Técnico creado: ID ${nuevoTecnico[0].id_tecnico}`);
          } else {
            console.log(`   ⚠️  Técnico ya existía o no se pudo crear`);
          }
        } catch (error) {
          if (error.code === 'P2002' || error.message.includes('unique')) {
            console.log(`   ⚠️  Ya existe un técnico para este usuario`);
          } else {
            throw error;
          }
        }
      } else {
        console.log(`   ✅ Técnico ya existe`);
      }
    }

    console.log('\n\n📊 Verificación final de técnicos disponibles...\n');
    
    // Verificar todos los técnicos disponibles
    const tecnicosFinales = await prisma.$queryRaw`
      SELECT 
        t.id_tecnico,
        t.nome,
        t.cognome,
        u.email,
        u.rol,
        u.estado
      FROM "Tecnico" t
      INNER JOIN "Usuario" u ON t.id_usuario = u.id_usuario
      WHERE u.estado = 'aprobado' AND u.rol = 'tecnico'
      ORDER BY t.nome ASC
    `;

    console.log(`✅ Total de técnicos disponibles: ${tecnicosFinales.length}\n`);
    tecnicosFinales.forEach((tecnico, index) => {
      console.log(`${index + 1}. ${tecnico.nome} ${tecnico.cognome}`);
      console.log(`   Email: ${tecnico.email || 'N/A'}`);
      console.log(`   Rol: ${tecnico.rol || 'N/A'}`);
      console.log(`   Estado: ${tecnico.estado || 'N/A'}`);
      console.log('');
    });

    // Verificar específicamente nuestros usuarios
    console.log('\n🔍 Verificación específica de usuarios corregidos:\n');
    const usuariosVerificados = await prisma.$queryRaw`
      SELECT 
        u.email,
        u.rol,
        u.estado,
        CASE WHEN t.id_tecnico IS NOT NULL THEN 'Sí' ELSE 'No' END as tiene_tecnico
      FROM "Usuario" u
      LEFT JOIN "Tecnico" t ON u.id_usuario = t.id_usuario
      WHERE u.email IN (${emailsTecnicos[0]}, ${emailsTecnicos[1]})
    `;

    usuariosVerificados.forEach(usuario => {
      console.log(`📧 ${usuario.email}:`);
      console.log(`   Rol: ${usuario.rol} ${usuario.rol === 'tecnico' ? '✅' : '❌'}`);
      console.log(`   Estado: ${usuario.estado} ${usuario.estado === 'aprobado' ? '✅' : '❌'}`);
      console.log(`   Técnico: ${usuario.tiene_tecnico} ${usuario.tiene_tecnico === 'Sí' ? '✅' : '❌'}`);
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

fixTecnicosDirecto();


