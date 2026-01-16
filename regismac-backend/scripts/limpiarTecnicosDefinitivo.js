/**
 * Script DEFINITIVO para limpiar y corregir técnicos en la base de datos
 * Este script hace una limpieza completa y directa usando SQL cuando sea posible
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

async function limpiarTecnicosDefinitivo(prismaInstance = null) {
  const prisma = prismaInstance || new PrismaClient();
  let shouldDisconnect = !prismaInstance;
  
  // Si no se pasó una instancia, conectar
  if (!prismaInstance) {
    await prisma.$connect();
  }
  
  try {
    console.log('🔧 INICIANDO LIMPIEZA DEFINITIVA DE TÉCNICOS...\n');

    // PASO 1: Obtener TODOS los técnicos con sus usuarios
    console.log('📊 Paso 1: Obteniendo todos los técnicos...');
    const todosLosTecnicos = await prisma.tecnico.findMany({
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

    console.log(`   Total encontrados: ${todosLosTecnicos.length}\n`);

    // PASO 2: ELIMINAR TODOS los técnicos que NO deberían existir
    console.log('🗑️  Paso 2: Eliminando técnicos con roles incorrectos o asociaciones incorrectas...');
    let eliminados = 0;
    
    for (const tecnico of todosLosTecnicos) {
      let debeEliminar = false;
      let razon = '';

      if (!tecnico.usuario) {
        debeEliminar = true;
        razon = 'no tiene usuario asociado';
      } else {
        const rolLower = (tecnico.usuario.rol || '').toLowerCase().trim();
        
        // Verificar si el rol es correcto
        if (rolLower !== 'tecnico') {
          debeEliminar = true;
          razon = `usuario tiene rol '${tecnico.usuario.rol}' (no es técnico)`;
        } else if (tecnico.usuario.estado !== 'aprobado') {
          debeEliminar = true;
          razon = `usuario tiene estado '${tecnico.usuario.estado}' (no está aprobado)`;
        } else {
          // Verificar que el nombre del técnico coincida con el nombre del usuario
          // Esto detecta asociaciones incorrectas (ej: técnico de Anna Maria asociado al email de Marco)
          const nombreTecnico = `${tecnico.nome} ${tecnico.cognome}`.toLowerCase().trim();
          const nombreUsuario = `${tecnico.usuario.nombre} ${tecnico.usuario.apellido || ''}`.toLowerCase().trim();
          
          // Si los nombres no coinciden, es una asociación incorrecta
          if (nombreTecnico !== nombreUsuario) {
            debeEliminar = true;
            razon = `asociación incorrecta: técnico "${tecnico.nome} ${tecnico.cognome}" está asociado al usuario "${tecnico.usuario.nombre} ${tecnico.usuario.apellido || ''}" (${tecnico.usuario.email})`;
          }
        }
      }

      if (debeEliminar) {
        try {
          // Primero, desvincular máquinas y tests que puedan estar asociados
          await prisma.maquina.updateMany({
            where: { id_tecnico: tecnico.id_tecnico },
            data: { id_tecnico: null }
          });

          await prisma.test.updateMany({
            where: { id_tecnico: tecnico.id_tecnico },
            data: { id_tecnico: null }
          });

          // Luego eliminar el técnico
          await prisma.tecnico.delete({
            where: { id_tecnico: tecnico.id_tecnico }
          });

          console.log(`   ❌ Eliminado: ${tecnico.nome} ${tecnico.cognome} (ID: ${tecnico.id_tecnico}) - ${razon}`);
          eliminados++;
        } catch (error) {
          console.error(`   ⚠️  Error al eliminar técnico ${tecnico.id_tecnico}:`, error.message);
        }
      }
    }

    console.log(`\n   ✅ Eliminados: ${eliminados} técnicos\n`);

    // PASO 3: Obtener TODOS los usuarios técnicos aprobados
    console.log('👥 Paso 3: Obteniendo usuarios técnicos aprobados...');
    const usuariosTecnicos = await prisma.usuario.findMany({
      where: {
        estado: 'aprobado',
        rol: 'tecnico'
      },
      select: {
        id_usuario: true,
        nombre: true,
        apellido: true,
        email: true,
        tecnico: {
          select: {
            id_tecnico: true
          }
        }
      }
    });

    console.log(`   Usuarios técnicos encontrados: ${usuariosTecnicos.length}`);
    usuariosTecnicos.forEach(u => {
      console.log(`   - ${u.nombre} ${u.apellido || ''} (${u.email}) - Técnico: ${u.tecnico ? 'SÍ' : 'NO'}`);
    });
    console.log('');

    // PASO 4: CREAR técnicos para usuarios que no los tienen O CORREGIR asociaciones incorrectas
    console.log('➕ Paso 4: Creando técnicos faltantes y corrigiendo asociaciones...');
    let creados = 0;
    let corregidos = 0;

    for (const usuario of usuariosTecnicos) {
      if (!usuario.tecnico) {
        // No tiene técnico, crearlo
        try {
          const nuevoTecnico = await prisma.tecnico.create({
            data: {
              nome: usuario.nombre,
              cognome: usuario.apellido || '',
              id_usuario: usuario.id_usuario
            }
          });
          console.log(`   ✅ Creado: ${usuario.nombre} ${usuario.apellido || ''} (${usuario.email}) - ID técnico: ${nuevoTecnico.id_tecnico}`);
          creados++;
        } catch (error) {
          if (error.code === 'P2002') {
            console.log(`   ℹ️  Ya existe técnico para ${usuario.email} (duplicado ignorado)`);
          } else {
            console.error(`   ❌ Error al crear técnico para ${usuario.email}:`, error.message);
          }
        }
      } else {
        // Ya tiene técnico, verificar que la asociación sea correcta
        const tecnicoExistente = await prisma.tecnico.findUnique({
          where: { id_tecnico: usuario.tecnico.id_tecnico },
          include: {
            usuario: {
              select: {
                nombre: true,
                apellido: true,
                email: true
              }
            }
          }
        });

        if (tecnicoExistente) {
          const nombreTecnico = `${tecnicoExistente.nome} ${tecnicoExistente.cognome}`.toLowerCase().trim();
          const nombreUsuario = `${usuario.nombre} ${usuario.apellido || ''}`.toLowerCase().trim();
          
          if (nombreTecnico !== nombreUsuario || tecnicoExistente.usuario?.email !== usuario.email) {
            // Asociación incorrecta, corregirla
            try {
              // Desvincular máquinas y tests del técnico incorrecto
              await prisma.maquina.updateMany({
                where: { id_tecnico: tecnicoExistente.id_tecnico },
                data: { id_tecnico: null }
              });
              await prisma.test.updateMany({
                where: { id_tecnico: tecnicoExistente.id_tecnico },
                data: { id_tecnico: null }
              });
              
              // Eliminar el técnico con asociación incorrecta
              await prisma.tecnico.delete({
                where: { id_tecnico: tecnicoExistente.id_tecnico }
              });
              
              // Crear el técnico correcto
              const nuevoTecnico = await prisma.tecnico.create({
                data: {
                  nome: usuario.nombre,
                  cognome: usuario.apellido || '',
                  id_usuario: usuario.id_usuario
                }
              });
              
              console.log(`   🔧 Corregido: Eliminado técnico incorrecto y creado nuevo para ${usuario.nombre} ${usuario.apellido || ''} (${usuario.email})`);
              corregidos++;
            } catch (error) {
              console.error(`   ❌ Error al corregir técnico para ${usuario.email}:`, error.message);
            }
          } else {
            console.log(`   ✓ Técnico correcto para ${usuario.email}`);
          }
        }
      }
    }

    console.log(`\n   ✅ Creados: ${creados} técnicos\n`);

    // PASO 5: Verificación final
    console.log('🔍 Paso 5: Verificación final...');
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

    console.log(`\n📋 RESULTADO FINAL:`);
    console.log(`   Total de técnicos válidos: ${tecnicosFinales.length}`);
    
    if (tecnicosFinales.length > 0) {
      console.log(`\n   Lista de técnicos válidos:`);
      tecnicosFinales.forEach((t, index) => {
        const nombreTecnico = `${t.nome} ${t.cognome}`;
        const nombreUsuario = `${t.usuario?.nombre} ${t.usuario?.apellido || ''}`;
        const coincide = nombreTecnico.toLowerCase().trim() === nombreUsuario.toLowerCase().trim();
        const icono = coincide ? '✅' : '⚠️';
        console.log(`   ${index + 1}. ${icono} ${t.nome} ${t.cognome} (${t.usuario?.email})`);
        console.log(`      - Usuario: ${nombreUsuario}`);
        console.log(`      - Rol: ${t.usuario?.rol}, Estado: ${t.usuario?.estado}`);
        if (!coincide) {
          console.log(`      ⚠️  ADVERTENCIA: El nombre del técnico no coincide con el nombre del usuario`);
        }
      });
    } else {
      console.log(`\n   ⚠️  NO HAY TÉCNICOS VÁLIDOS EN LA BASE DE DATOS`);
      console.log(`   Verifica que existan usuarios con rol 'tecnico' y estado 'aprobado'`);
    }

    console.log(`\n✅ LIMPIEZA DEFINITIVA COMPLETADA`);
    console.log(`   - Eliminados: ${eliminados}`);
    console.log(`   - Creados: ${creados}`);
    console.log(`   - Corregidos: ${corregidos}`);
    console.log(`   - Total válidos: ${tecnicosFinales.length}`);

    return {
      eliminados,
      creados,
      corregidos,
      total: tecnicosFinales.length,
      tecnicos: tecnicosFinales
    };
  } catch (error) {
    console.error('❌ ERROR FATAL en limpieza definitiva:', error);
    throw error;
  } finally {
    if (shouldDisconnect) {
      await prisma.$disconnect();
    }
  }
}

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('limpiarTecnicosDefinitivo.js')) {
  const prisma = new PrismaClient();
  limpiarTecnicosDefinitivo(prisma)
    .then(() => {
      console.log('\n✅ Script completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Error fatal:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { limpiarTecnicosDefinitivo };

