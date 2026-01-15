export class TecnicosService {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    async findAll() {
      // CORRECCIÓN: Asegurar que usuarios técnicos específicos tengan rol y estado correctos
      const emailsTecnicosEspecificos = [
        'Mahmudlhasan429@gmail.com',
        'marcocarinci.ecosun@gmail.com'
      ];
      
      // Buscar y corregir estos usuarios específicos
      for (const email of emailsTecnicosEspecificos) {
        try {
          // Buscar usuario (intentar con diferentes formatos de email)
          let usuario = await this.prisma.usuario.findUnique({
            where: { email: email.toLowerCase() }
          });
          
          if (!usuario) {
            usuario = await this.prisma.usuario.findUnique({
              where: { email: email }
            });
          }
          
          // Si aún no se encuentra, buscar todos y filtrar
          if (!usuario) {
            const usuarios = await this.prisma.usuario.findMany();
            usuario = usuarios.find(u => 
              u.email && u.email.toLowerCase() === email.toLowerCase()
            );
          }
          
          if (usuario) {
            const updates = {};
            if (usuario.rol !== 'tecnico') {
              updates.rol = 'tecnico';
            }
            if (usuario.estado !== 'aprobado') {
              updates.estado = 'aprobado';
              updates.fecha_aprobacion = usuario.fecha_aprobacion || new Date();
            }
            
            if (Object.keys(updates).length > 0) {
              await this.prisma.usuario.update({
                where: { id_usuario: usuario.id_usuario },
                data: updates
              });
            }
            
            // Asegurar que tenga técnico asociado
            const tecnicoExistente = await this.prisma.tecnico.findUnique({
              where: { id_usuario: usuario.id_usuario }
            });
            
            if (!tecnicoExistente) {
              try {
                await this.prisma.tecnico.create({
                  data: {
                    nome: usuario.nombre,
                    cognome: usuario.apellido || '',
                    id_usuario: usuario.id_usuario
                  }
                });
              } catch (createError) {
                // Ignorar errores de duplicado
                if (createError.code !== 'P2002') {
                  console.error(`Error al crear técnico para ${email}:`, createError);
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error al corregir usuario ${email}:`, error);
        }
      }
      
      // Obtener todos los usuarios aprobados con rol "tecnico" que no tienen técnico asociado
      const usuariosAprobados = await this.prisma.usuario.findMany({
        where: { 
          estado: 'aprobado',
          rol: 'tecnico', // Solo usuarios con rol técnico
          tecnico: null
        }
      });

      // Crear técnicos para usuarios aprobados que no tienen uno
      for (const usuario of usuariosAprobados) {
        try {
          await this.prisma.tecnico.create({
            data: {
              nome: usuario.nombre,
              cognome: usuario.apellido || '',
              id_usuario: usuario.id_usuario
            }
          });
        } catch (createError) {
          // Si falla la creación (por ejemplo, duplicado), continuar con el siguiente
          if (createError.code !== 'P2002') {
            console.error(`Error al crear técnico para usuario ${usuario.id_usuario}:`, createError);
          }
        }
      }

      // Retornar todos los técnicos con su usuario asociado, SOLO aquellos con rol "tecnico" y estado "aprobado"
      const tecnicos = await this.prisma.tecnico.findMany({
        where: {
          usuario: {
            estado: 'aprobado',
            rol: 'tecnico' // Solo usuarios con rol técnico
          },
          id_usuario: {
            not: null // Asegurar que tenga usuario asociado
          }
        },
        include: { 
          maquinas: true,
          usuario: true
        },
        orderBy: {
          nome: 'asc'
        }
      });

      // Filtrar adicionalmente por si acaso algún técnico no tiene usuario válido
      return tecnicos.filter(tecnico => 
        tecnico.usuario && 
        tecnico.usuario.rol === 'tecnico' && 
        tecnico.usuario.estado === 'aprobado'
      );
    }

    // Obtener técnicos desde usuarios aprobados (para usar en formularios)
    async getTecnicosFromUsuarios() {
      try {
        // PASO 0: Primero normalizar roles en la base de datos (por si hay inconsistencias)
        // Buscar usuarios que deberían ser técnicos pero tienen rol en diferente formato
        const usuariosConRolInconsistente = await this.prisma.usuario.findMany({
          where: {
            OR: [
              { rol: { contains: 'tecnic', mode: 'insensitive' } },
              { tecnico: { isNot: null } }
            ]
          },
          select: {
            id_usuario: true,
            rol: true
          }
        });

        // Normalizar roles a 'tecnico' (minúsculas)
        for (const usuario of usuariosConRolInconsistente) {
          const rolLower = (usuario.rol || '').toLowerCase();
          if (rolLower.includes('tecnic') && rolLower !== 'tecnico') {
            try {
              await this.prisma.usuario.update({
                where: { id_usuario: usuario.id_usuario },
                data: { rol: 'tecnico' }
              });
              console.log(`Rol normalizado para usuario ${usuario.id_usuario}: '${usuario.rol}' → 'tecnico'`);
            } catch (updateError) {
              console.error(`Error al normalizar rol para usuario ${usuario.id_usuario}:`, updateError);
            }
          }
        }

        // PASO 1: Obtener SOLO usuarios con rol 'tecnico' y estado 'aprobado'
        const usuariosTecnicos = await this.prisma.usuario.findMany({
          where: {
            estado: 'aprobado',
            rol: 'tecnico' // CRÍTICO: Solo rol 'tecnico'
          },
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            email: true,
            estado: true,
            rol: true
          }
        });

        // Si no hay usuarios técnicos, retornar array vacío
        if (!usuariosTecnicos || usuariosTecnicos.length === 0) {
          return [];
        }

        const idsUsuariosTecnicos = usuariosTecnicos.map(u => u.id_usuario);

        // PASO 2: Asegurar que todos estos usuarios tengan técnico creado
        for (const usuario of usuariosTecnicos) {
          try {
            // Verificar si ya existe técnico para este usuario
            const tecnicoExistente = await this.prisma.tecnico.findUnique({
              where: { id_usuario: usuario.id_usuario }
            });

            // Si no existe, crearlo
            if (!tecnicoExistente) {
              await this.prisma.tecnico.create({
                data: {
                  nome: usuario.nombre,
                  cognome: usuario.apellido || '',
                  id_usuario: usuario.id_usuario
                }
              });
            }
          } catch (createError) {
            // Si falla la creación (por ejemplo, duplicado), continuar con el siguiente
            if (createError.code !== 'P2002') {
              console.error(`Error al crear técnico para usuario ${usuario.id_usuario}:`, createError);
            }
          }
        }

        // PASO 3: Obtener SOLO técnicos que pertenezcan a usuarios con rol 'tecnico' y estado 'aprobado'
        const tecnicos = await this.prisma.tecnico.findMany({
          where: {
            id_usuario: {
              in: idsUsuariosTecnicos // SOLO IDs de usuarios técnicos aprobados
            }
          },
          include: {
            usuario: {
              select: {
                id_usuario: true,
                nombre: true,
                apellido: true,
                email: true,
                estado: true,
                rol: true
              }
            }
          },
          orderBy: {
            nome: 'asc'
          }
        });

        // PASO 4: Filtrar una vez más para garantizar que solo sean técnicos válidos
        // CRÍTICO: Verificar que el usuario existe, tiene rol 'tecnico' y estado 'aprobado'
        const tecnicosFiltrados = tecnicos.filter(tecnico => {
          if (!tecnico.usuario) {
            console.warn(`Técnico ${tecnico.id_tecnico} no tiene usuario asociado`);
            return false;
          }
          // Verificar explícitamente rol y estado (case-insensitive para el rol)
          const rolLower = (tecnico.usuario.rol || '').toLowerCase();
          const esValido = rolLower === 'tecnico' && tecnico.usuario.estado === 'aprobado';
          if (!esValido) {
            console.warn(`Técnico ${tecnico.id_tecnico} tiene usuario con rol '${tecnico.usuario.rol}' y estado '${tecnico.usuario.estado}' - NO incluido`);
            // Intentar corregir el rol si es técnico pero con formato diferente
            if (rolLower.includes('tecnic') && rolLower !== 'tecnico') {
              this.prisma.usuario.update({
                where: { id_usuario: tecnico.usuario.id_usuario },
                data: { rol: 'tecnico' }
              }).catch(err => console.error(`Error al corregir rol:`, err));
            }
          }
          return esValido;
        });

        return tecnicosFiltrados;
      } catch (error) {
        console.error('Error en getTecnicosFromUsuarios:', error);
        // Fallback: obtener usuarios técnicos y luego técnicos
        try {
          const usuariosTecnicos = await this.prisma.usuario.findMany({
            where: {
              estado: 'aprobado',
              rol: 'tecnico'
            },
            select: {
              id_usuario: true
            }
          });

          if (!usuariosTecnicos || usuariosTecnicos.length === 0) {
            return [];
          }

          const idsUsuarios = usuariosTecnicos.map(u => u.id_usuario);

          const tecnicosFallback = await this.prisma.tecnico.findMany({
            where: {
              id_usuario: {
                in: idsUsuarios
              }
            },
            include: {
              usuario: {
                select: {
                  id_usuario: true,
                  nombre: true,
                  apellido: true,
                  email: true,
                  estado: true,
                  rol: true
                }
              }
            },
            orderBy: {
              nome: 'asc'
            }
          });

          // Filtrar para asegurar que solo sean técnicos válidos (case-insensitive para el rol)
          return tecnicosFallback.filter(tecnico => {
            if (!tecnico.usuario) return false;
            const rolLower = (tecnico.usuario.rol || '').toLowerCase();
            return rolLower === 'tecnico' && tecnico.usuario.estado === 'aprobado';
          });
        } catch (fallbackError) {
          console.error('Error en fallback de getTecnicosFromUsuarios:', fallbackError);
          throw error;
        }
      }
    }
  
    findById(id) {
      return this.prisma.tecnico.findUnique({
        where: { id_tecnico: id },
        include: { maquinas: true }
      });
    }
  
    create(data) {
      return this.prisma.tecnico.create({ data });
    }
  
    update(id, data) {
      return this.prisma.tecnico.update({
        where: { id_tecnico: id },
        data
      });
    }
  
    delete(id) {
      return this.prisma.tecnico.delete({
        where: { id_tecnico: id }
      });
    }
  }
  