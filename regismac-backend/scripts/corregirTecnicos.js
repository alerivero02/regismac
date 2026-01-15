/**
 * Script para corregir roles de usuarios técnicos en la base de datos
 * - Normaliza roles a minúsculas ('tecnico')
 * - Asegura que usuarios técnicos tengan estado 'aprobado'
 * - Crea registros de técnico para usuarios que no los tengan
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function corregirTecnicos() {
  try {
    console.log('🔍 Iniciando corrección de técnicos...\n');

    // PASO 1: Obtener todos los usuarios
    const todosUsuarios = await prisma.usuario.findMany({
      select: {
        id_usuario: true,
        email: true,
        nombre: true,
        apellido: true,
        rol: true,
        estado: true,
        tecnico: {
          select: {
            id_tecnico: true
          }
        }
      }
    });

    console.log(`📊 Total de usuarios encontrados: ${todosUsuarios.length}\n`);

    // PASO 2: Identificar usuarios que deberían ser técnicos
    // Buscar usuarios con rol técnico (en cualquier formato) o que tengan técnico asociado
    const usuariosTecnicos = todosUsuarios.filter(u => {
      const rolLower = (u.rol || '').toLowerCase();
      return rolLower === 'tecnico' || u.tecnico !== null;
    });

    console.log(`👷 Usuarios identificados como técnicos: ${usuariosTecnicos.length}\n`);

    let corregidos = 0;
    let creados = 0;
    let errores = 0;

    // PASO 3: Corregir cada usuario técnico
    for (const usuario of usuariosTecnicos) {
      try {
        const updates = {};
        const rolActual = usuario.rol || '';
        const rolLower = rolActual.toLowerCase();

        // Normalizar rol a 'tecnico' (minúsculas)
        if (rolLower !== 'tecnico') {
          updates.rol = 'tecnico';
          console.log(`  ⚠️  Usuario ${usuario.email}: rol '${rolActual}' → 'tecnico'`);
        }

        // Asegurar estado 'aprobado'
        if (usuario.estado !== 'aprobado') {
          updates.estado = 'aprobado';
          updates.fecha_aprobacion = new Date();
          console.log(`  ⚠️  Usuario ${usuario.email}: estado '${usuario.estado}' → 'aprobado'`);
        }

        // Actualizar usuario si es necesario
        if (Object.keys(updates).length > 0) {
          await prisma.usuario.update({
            where: { id_usuario: usuario.id_usuario },
            data: updates
          });
          corregidos++;
        }

        // PASO 4: Crear registro de técnico si no existe
        if (!usuario.tecnico) {
          try {
            await prisma.tecnico.create({
              data: {
                nome: usuario.nombre,
                cognome: usuario.apellido || '',
                id_usuario: usuario.id_usuario
              }
            });
            console.log(`  ✅ Creado técnico para usuario ${usuario.email}`);
            creados++;
          } catch (createError) {
            if (createError.code === 'P2002') {
              // Ya existe un técnico con este id_usuario (duplicado)
              console.log(`  ℹ️  Técnico ya existe para usuario ${usuario.email}`);
            } else {
              console.error(`  ❌ Error al crear técnico para ${usuario.email}:`, createError.message);
              errores++;
            }
          }
        } else {
          console.log(`  ✓ Usuario ${usuario.email} ya tiene técnico asociado`);
        }
      } catch (error) {
        console.error(`  ❌ Error procesando usuario ${usuario.email}:`, error.message);
        errores++;
      }
    }

    // PASO 5: Eliminar registros de técnico que pertenecen a usuarios con roles incorrectos
    const tecnicosConRolIncorrecto = await prisma.tecnico.findMany({
      where: {
        id_usuario: { not: null }
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            email: true,
            rol: true,
            estado: true
          }
        }
      }
    });

    let eliminados = 0;
    if (tecnicosConRolIncorrecto.length > 0) {
      console.log(`\n🔍 Verificando ${tecnicosConRolIncorrecto.length} registros de técnico...`);
      for (const tecnico of tecnicosConRolIncorrecto) {
        if (tecnico.usuario) {
          const rolLower = (tecnico.usuario.rol || '').toLowerCase();
          // Si el usuario NO es técnico, eliminar el registro de técnico
          if (rolLower !== 'tecnico') {
            try {
              await prisma.tecnico.delete({
                where: { id_tecnico: tecnico.id_tecnico }
              });
              console.log(`  ❌ Eliminado técnico ${tecnico.id_tecnico} - usuario ${tecnico.usuario.email} tiene rol '${tecnico.usuario.rol}' (no es técnico)`);
              eliminados++;
            } catch (deleteError) {
              console.error(`  ❌ Error al eliminar técnico ${tecnico.id_tecnico}:`, deleteError.message);
              errores++;
            }
          }
        } else {
          // Si no tiene usuario asociado, también eliminarlo
          try {
            await prisma.tecnico.delete({
              where: { id_tecnico: tecnico.id_tecnico }
            });
            console.log(`  ❌ Eliminado técnico ${tecnico.id_tecnico} - no tiene usuario asociado`);
            eliminados++;
          } catch (deleteError) {
            console.error(`  ❌ Error al eliminar técnico ${tecnico.id_tecnico}:`, deleteError.message);
            errores++;
          }
        }
      }
    }

    // PASO 6: Verificar usuarios con rol técnico pero sin técnico asociado
    const usuariosSinTecnico = await prisma.usuario.findMany({
      where: {
        rol: 'tecnico',
        estado: 'aprobado',
        tecnico: null
      },
      select: {
        id_usuario: true,
        email: true,
        nombre: true,
        apellido: true
      }
    });

    if (usuariosSinTecnico.length > 0) {
      console.log(`\n⚠️  Encontrados ${usuariosSinTecnico.length} usuarios técnicos sin registro de técnico:`);
      for (const usuario of usuariosSinTecnico) {
        try {
          await prisma.tecnico.create({
            data: {
              nome: usuario.nombre,
              cognome: usuario.apellido || '',
              id_usuario: usuario.id_usuario
            }
          });
          console.log(`  ✅ Creado técnico para usuario ${usuario.email}`);
          creados++;
        } catch (createError) {
          if (createError.code !== 'P2002') {
            console.error(`  ❌ Error al crear técnico para ${usuario.email}:`, createError.message);
            errores++;
          }
        }
      }
    }

    // RESUMEN
    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN DE CORRECCIÓN:');
    console.log('='.repeat(50));
    console.log(`✅ Usuarios corregidos: ${corregidos}`);
    console.log(`✅ Técnicos creados: ${creados}`);
    console.log(`❌ Técnicos eliminados (roles incorrectos): ${eliminados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log('='.repeat(50));

    // Verificación final
    console.log('\n🔍 Verificación final...');
    const tecnicosFinales = await prisma.tecnico.findMany({
      where: {
        usuario: {
          rol: 'tecnico',
          estado: 'aprobado'
        }
      },
      include: {
        usuario: {
          select: {
            email: true,
            rol: true,
            estado: true
          }
        }
      }
    });

    console.log(`\n✅ Total de técnicos válidos encontrados: ${tecnicosFinales.length}`);
    if (tecnicosFinales.length > 0) {
      console.log('\n📋 Lista de técnicos válidos:');
      tecnicosFinales.forEach((t, index) => {
        console.log(`  ${index + 1}. ${t.nome} ${t.cognome} (${t.usuario?.email || 'sin email'}) - Rol: ${t.usuario?.rol || 'N/A'}, Estado: ${t.usuario?.estado || 'N/A'}`);
      });
    } else {
      console.log('\n⚠️  No se encontraron técnicos válidos. Verifica que existan usuarios con rol "tecnico" y estado "aprobado".');
    }

  } catch (error) {
    console.error('❌ Error en la corrección:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

corregirTecnicos()
  .then(() => {
    console.log('\n✅ Corrección completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });

