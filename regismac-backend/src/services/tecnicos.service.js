export class TecnicosService {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    async findAll() {
      const tecnicos = await this.prisma.tecnico.findMany({
        where: {
          usuario: {
            estado: 'aprobado',
            rol: 'tecnico'
          },
          id_usuario: {
            not: null
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

      return tecnicos.filter(tecnico => 
        tecnico.usuario && 
        tecnico.usuario.rol === 'tecnico' && 
        tecnico.usuario.estado === 'aprobado'
      );
    }

    async getTecnicosFromUsuarios() {
      try {
        const tecnicos = await this.prisma.tecnico.findMany({
          where: {
            usuario: {
              estado: 'aprobado',
              rol: 'tecnico'
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

        return tecnicos.filter(t => t.usuario && t.usuario.rol === 'tecnico' && t.usuario.estado === 'aprobado');
      } catch (error) {
        console.error('Error en getTecnicosFromUsuarios:', error);
        return [];
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
  