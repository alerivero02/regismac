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
    const isProduction = process.env.NODE_ENV === 'production';
    const log = isProduction ? () => {} : console.log;
    const logError = console.error;

    // PASO 1: Obtener TODOS los técnicos con sus usuarios
    log('📊 Paso 1: Obteniendo todos los técnicos...');
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

    log(`   Total encontrados: ${todosLosTecnicos.length}\n`);

    // PASO 2: ELIMINAR TODOS los técnicos que NO deberían existir
    log('🗑️  Paso 2: Eliminando técnicos con roles incorrectos o asociaciones incorrectas...');
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

          log(`   ❌ Eliminado: ${tecnico.nome} ${tecnico.cognome} (ID: ${tecnico.id_tecnico}) - ${razon}`);
          eliminados++;
        } catch (error) {
          logError(`   ⚠️  Error al eliminar técnico ${tecnico.id_tecnico}:`, error.message);
        }
      }
    }

    log(`\n   ✅ Eliminados: ${eliminados} técnicos\n`);

    // PASO 3: Obtener TODOS los usuarios técnicos aprobados
    log('👥 Paso 3: Obteniendo usuarios técnicos aprobados...');
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

    log(`   Usuarios técnicos encontrados: ${usuariosTecnicos.length}`);
    usuariosTecnicos.forEach(u => {
      log(`   - ${u.nombre} ${u.apellido || ''} (${u.email}) - Técnico: ${u.tecnico ? 'SÍ' : 'NO'}`);
    });
    log('');

    // PASO 4: CREAR técnicos para usuarios que no los tienen O CORREGIR asociaciones incorrectas
    log('➕ Paso 4: Creando técnicos faltantes y corrigiendo asociaciones...');
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
          log(`   ✅ Creado: ${usuario.nombre} ${usuario.apellido || ''} (${usuario.email}) - ID técnico: ${nuevoTecnico.id_tecnico}`);
          creados++;
        } catch (error) {
          if (error.code === 'P2002') {
            log(`   ℹ️  Ya existe técnico para ${usuario.email} (duplicado ignorado)`);
          } else {
            logError(`   ❌ Error al crear técnico para ${usuario.email}:`, error.message);
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
              
              log(`   🔧 Corregido: Eliminado técnico incorrecto y creado nuevo para ${usuario.nombre} ${usuario.apellido || ''} (${usuario.email})`);
              corregidos++;
            } catch (error) {
              logError(`   ❌ Error al corregir técnico para ${usuario.email}:`, error.message);
            }
          } else {
            log(`   ✓ Técnico correcto para ${usuario.email}`);
          }
        }
      }
    }

    log(`\n   ✅ Creados: ${creados} técnicos\n`);

    // PASO 5: Limpiar tests con técnicos incorrectos o eliminados
    log('🧹 Paso 5: Limpiando tests con técnicos incorrectos...');
    let testsCorregidos = 0;
    
    // Obtener todos los tests con id_tecnico
    const testsConTecnico = await prisma.test.findMany({
      where: {
        id_tecnico: { not: null }
      },
      include: {
        tecnico: {
          include: {
            usuario: {
              select: {
                id_usuario: true,
                rol: true,
                estado: true,
                email: true
              }
            }
          }
        }
      }
    });

    log(`   Tests con técnico asignado: ${testsConTecnico.length}`);

    for (const test of testsConTecnico) {
      let debeLimpiar = false;
      let razon = '';

      if (!test.tecnico) {
        // El técnico fue eliminado
        debeLimpiar = true;
        razon = 'técnico fue eliminado';
      } else if (!test.tecnico.usuario) {
        // El técnico no tiene usuario asociado
        debeLimpiar = true;
        razon = 'técnico no tiene usuario asociado';
      } else {
        const rolLower = (test.tecnico.usuario.rol || '').toLowerCase().trim();
        if (rolLower !== 'tecnico') {
          debeLimpiar = true;
          razon = `técnico tiene rol '${test.tecnico.usuario.rol}' (no es técnico)`;
        } else if (test.tecnico.usuario.estado !== 'aprobado') {
          debeLimpiar = true;
          razon = `técnico tiene estado '${test.tecnico.usuario.estado}' (no está aprobado)`;
        }
      }

      if (debeLimpiar) {
        try {
          await prisma.test.update({
            where: { id_test: test.id_test },
            data: { id_tecnico: null }
          });
          log(`   🔧 Test ${test.id_test} limpiado - ${razon}`);
          testsCorregidos++;
        } catch (error) {
          logError(`   ❌ Error al limpiar test ${test.id_test}:`, error.message);
        }
      }
    }

    log(`\n   ✅ Tests corregidos: ${testsCorregidos}\n`);

    // PASO 6: Verificación final
    log('🔍 Paso 5: Verificación final...');
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

    log(`\n📋 RESULTADO FINAL:`);
    log(`   Total de técnicos válidos: ${tecnicosFinales.length}`);
    
    if (tecnicosFinales.length > 0) {
      log(`\n   Lista de técnicos válidos:`);
      tecnicosFinales.forEach((t, index) => {
        const nombreTecnico = `${t.nome} ${t.cognome}`;
        const nombreUsuario = `${t.usuario?.nombre} ${t.usuario?.apellido || ''}`;
        const coincide = nombreTecnico.toLowerCase().trim() === nombreUsuario.toLowerCase().trim();
        const icono = coincide ? '✅' : '⚠️';
        log(`   ${index + 1}. ${icono} ${t.nome} ${t.cognome} (${t.usuario?.email})`);
        log(`      - Usuario: ${nombreUsuario}`);
        log(`      - Rol: ${t.usuario?.rol}, Estado: ${t.usuario?.estado}`);
        if (!coincide) {
          log(`      ⚠️  ADVERTENCIA: El nombre del técnico no coincide con el nombre del usuario`);
        }
      });
    } else {
      log(`\n   ⚠️  NO HAY TÉCNICOS VÁLIDOS EN LA BASE DE DATOS`);
      log(`   Verifica que existan usuarios con rol 'tecnico' y estado 'aprobado'`);
    }

    log(`\n✅ LIMPIEZA DEFINITIVA COMPLETADA`);
    log(`   - Técnicos eliminados: ${eliminados}`);
    log(`   - Técnicos creados: ${creados}`);
    log(`   - Asociaciones corregidas: ${corregidos}`);
    log(`   - Tests corregidos: ${testsCorregidos}`);
    log(`   - Total técnicos válidos: ${tecnicosFinales.length}`);

    return {
      eliminados,
      creados,
      corregidos,
      testsCorregidos,
      total: tecnicosFinales.length,
      tecnicos: tecnicosFinales
    };
  } catch (error) {
    logError('❌ ERROR FATAL en limpieza definitiva:', error);
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n✅ Script completado exitosamente');
      }
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

