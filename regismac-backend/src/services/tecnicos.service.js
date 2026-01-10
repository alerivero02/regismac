export class TecnicosService {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    async findAll() {
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
        await this.prisma.tecnico.create({
          data: {
            nome: usuario.nombre,
            cognome: usuario.apellido || '',
            id_usuario: usuario.id_usuario
          }
        });
      }

      // Retornar todos los técnicos con su usuario asociado, solo aquellos con rol "tecnico"
      return this.prisma.tecnico.findMany({
        where: {
          usuario: {
            rol: 'tecnico' // Solo usuarios con rol técnico
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
    }

    // Obtener técnicos desde usuarios aprobados (para usar en formularios)
    async getTecnicosFromUsuarios() {
      try {
        // Primero asegurar que todos los usuarios aprobados con rol "tecnico" tengan técnico
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
            console.error(`Error al crear técnico para usuario ${usuario.id_usuario}:`, createError);
            if (createError.code !== 'P2002') { // Si no es un error de duplicado, lanzar
              throw createError;
            }
          }
        }
      
        // Retornar técnicos con información del usuario, solo aquellos con rol "tecnico"
        return await this.prisma.tecnico.findMany({
        where: {
          usuario: {
              estado: 'aprobado',
              rol: 'tecnico' // Solo usuarios con rol técnico
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
      } catch (error) {
        console.error('Error en getTecnicosFromUsuarios:', error);
        // Si hay un error con las relaciones, intentar obtener solo los datos básicos
        if (error.code === 'P2025' || error.message?.includes('relation') || error.message?.includes('include')) {
          try {
            return await this.prisma.tecnico.findMany({
              select: {
                id_tecnico: true,
                nome: true,
                cognome: true,
                id_usuario: true
              },
              orderBy: {
                nome: 'asc'
              }
            });
          } catch (fallbackError) {
            console.error('Error en fallback de getTecnicosFromUsuarios:', fallbackError);
            throw error; // Lanzar el error original
          }
        }
        throw error;
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
  