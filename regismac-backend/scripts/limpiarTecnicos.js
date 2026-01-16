/**
 * Script para limpiar registros de técnico con roles incorrectos
 * Se ejecuta automáticamente al iniciar el servidor
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

// Permitir pasar prisma como parámetro para usar la instancia existente
export async function limpiarTecnicos(prismaInstance = null) {
  const prisma = prismaInstance || new PrismaClient();
  let shouldDisconnect = !prismaInstance;
  
  try {
    console.log('🧹 Iniciando limpieza de registros de técnico...');

    // PASO 1: Obtener todos los técnicos con sus usuarios
    const todosLosTecnicos = await prisma.tecnico.findMany({
      where: {
        id_usuario: { not: null }
      },
      include: {
        usuario: {
          select: {
            id_usuario: true,
            rol: true,
            estado: true,
            email: true,
            nombre: true,
            apellido: true
          }
        }
      }
    });

    console.log(`📊 Total de técnicos encontrados: ${todosLosTecnicos.length}`);

    let eliminados = 0;
    let creados = 0;

    // PASO 2: Eliminar técnicos con roles incorrectos
    for (const tecnico of todosLosTecnicos) {
      if (tecnico.usuario) {
        const rolLower = (tecnico.usuario.rol || '').toLowerCase().trim();
        // Si el usuario NO es técnico, eliminar el registro de técnico
        if (rolLower !== 'tecnico') {
          try {
            await prisma.tecnico.delete({
              where: { id_tecnico: tecnico.id_tecnico }
            });
            console.log(`❌ Eliminado técnico ${tecnico.id_tecnico} (${tecnico.nome} ${tecnico.cognome}) - usuario ${tecnico.usuario.email} tiene rol '${tecnico.usuario.rol}' (no es técnico)`);
            eliminados++;
          } catch (deleteError) {
            console.error(`❌ Error al eliminar técnico ${tecnico.id_tecnico}:`, deleteError.message);
          }
        }
      } else {
        // Si no tiene usuario asociado, también eliminarlo
        try {
          await prisma.tecnico.delete({
            where: { id_tecnico: tecnico.id_tecnico }
          });
          console.log(`❌ Eliminado técnico ${tecnico.id_tecnico} (${tecnico.nome} ${tecnico.cognome}) - no tiene usuario asociado`);
          eliminados++;
        } catch (deleteError) {
          console.error(`❌ Error al eliminar técnico ${tecnico.id_tecnico}:`, deleteError.message);
        }
      }
    }

    // PASO 3: Obtener usuarios técnicos aprobados que no tienen técnico
    const usuariosTecnicosSinTecnico = await prisma.usuario.findMany({
      where: {
        estado: 'aprobado',
        rol: 'tecnico',
        tecnico: null
      },
      select: {
        id_usuario: true,
        nombre: true,
        apellido: true,
        email: true
      }
    });

    // PASO 4: Crear técnicos para usuarios que no los tienen
    for (const usuario of usuariosTecnicosSinTecnico) {
      try {
        await prisma.tecnico.create({
          data: {
            nome: usuario.nombre,
            cognome: usuario.apellido || '',
            id_usuario: usuario.id_usuario
          }
        });
        console.log(`✅ Creado técnico para usuario ${usuario.email} (${usuario.nombre} ${usuario.apellido || ''})`);
        creados++;
      } catch (createError) {
        if (createError.code !== 'P2002') {
          console.error(`❌ Error al crear técnico para usuario ${usuario.email}:`, createError.message);
        }
      }
    }

    // PASO 5: Verificar resultado final
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
            nombre: true,
            apellido: true
          }
        }
      }
    });

    console.log(`\n✅ Limpieza completada:`);
    console.log(`   - Eliminados: ${eliminados}`);
    console.log(`   - Creados: ${creados}`);
    console.log(`   - Técnicos válidos finales: ${tecnicosFinales.length}`);
    if (tecnicosFinales.length > 0) {
      console.log(`   - Lista: ${tecnicosFinales.map(t => `${t.nome} ${t.cognome} (${t.usuario?.email})`).join(', ')}`);
    }

    return { eliminados, creados, total: tecnicosFinales.length };
  } catch (error) {
    console.error('❌ Error en limpieza de técnicos:', error);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

// Si se ejecuta directamente, ejecutar la limpieza
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('limpiarTecnicos.js')) {
  const prisma = new PrismaClient();
  limpiarTecnicos(prisma)
    .then(() => {
      console.log('✅ Limpieza completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error fatal:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

