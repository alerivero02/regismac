export class MaquinasService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findAll() {
    try {
      // Verificar que prisma esté disponible
      if (!this.prisma) {
        throw new Error('Prisma client no está disponible');
      }
      
      const maquinas = await this.prisma.maquina.findMany({
      include: { 
        tecnico: {
          select: {
            id_tecnico: true,
            nome: true,
            cognome: true
          }
        },
        lotto: {
          select: {
            id_lotto: true,
            numero_lotto: true,
            anno: true,
            descrizione: true
          }
        },
        tests: {
          select: {
            id_test: true,
            id_maquina: true,
            id_tecnico: true,
            temperatura_iniziale: true,
            tempo_0_gradi: true,
            tempo_meno8_gradi: true,
            fecha_test: true,
            hora_test: true
          },
          orderBy: {
            fecha_test: 'desc'
          },
          take: 5 // Solo los últimos 5 tests por máquina para mejorar rendimiento
        }
      }
    });
    
    // Actualizar automáticamente el estado a "consegnata" si tiene data_consegna pero el estado no es "consegnata"
    const maquinasToUpdate = maquinas.filter(m => 
      m.data_consegna !== null && 
      m.data_consegna !== undefined && 
      m.stato !== 'consegnata'
    );
    
    if (maquinasToUpdate.length > 0) {
        try {
      const idsToUpdate = maquinasToUpdate.map(m => m.id_maquina);
      await this.prisma.maquina.updateMany({
        where: {
          id_maquina: { in: idsToUpdate }
        },
        data: {
          stato: 'consegnata'
        }
      });
      
      // Actualizar el estado en los objetos devueltos
      maquinas.forEach(m => {
        if (m.data_consegna !== null && m.data_consegna !== undefined) {
          m.stato = 'consegnata';
        }
      });
        } catch (updateError) {
          // Si falla la actualización, continuar sin actualizar pero loguear el error
          console.error('Error al actualizar estados automáticamente:', updateError);
        }
    }
    
    return maquinas;
    } catch (error) {
      console.error('Error en findAll de máquinas:', error);
      // Si hay un error con las relaciones, intentar obtener solo los datos básicos
      if (error.code === 'P2025' || error.message?.includes('relation') || error.message?.includes('include')) {
        try {
          return await this.prisma.maquina.findMany({
            select: {
              id_maquina: true,
              numero_telaio: true,
              seriale_compressore: true,
              tipo_gas: true,
              quantita_gas: true,
              tipo_valvola: true,
              regolazione_valvola: true,
              annotazioni: true,
              stato: true,
              foto1: true,
              foto2: true,
              data_consegna: true,
              fecha_primera_prueba: true,
              fecha_estado_ok: true,
              id_tecnico: true,
              id_lotto: true
            }
          });
        } catch (fallbackError) {
          console.error('Error en fallback de findAll:', fallbackError);
          throw error; // Lanzar el error original
        }
      }
      throw error;
    }
  }

  async findById(id) {
    try {
      // Verificar que prisma esté disponible
      if (!this.prisma) {
        throw new Error('Prisma client no está disponible');
      }
      
      const maquina = await this.prisma.maquina.findUnique({
      where: { id_maquina: id },
      include: { 
        tecnico: {
          select: {
            id_tecnico: true,
            nome: true,
            cognome: true
          }
        },
        tests: {
          include: {
            tecnico: true
          },
          orderBy: {
            fecha_test: 'desc'
          }
        }
      },
    });
    
      // Actualizar automáticamente el estado a "consegnata" si tiene data_consegna pero el estado no es "consegnata"
      if (maquina && maquina.data_consegna !== null && maquina.data_consegna !== undefined && maquina.stato !== 'consegnata') {
        await this.prisma.maquina.update({
          where: { id_maquina: Number(id) },
          data: {
            stato: 'consegnata'
          }
        });
        maquina.stato = 'consegnata';
      }
      
      return maquina;
    } catch (error) {
      console.error('❌ Error en findById de MaquinasService:', {
        message: error.message,
        code: error.code,
        name: error.name,
        id: id
      });
      throw error;
    }
  }

  async create(data) {
    try {
      // Verificar que prisma esté disponible
      if (!this.prisma) {
        throw new Error('Prisma client no está disponible');
      }

      // Transformar tecnicoId a id_tecnico para Prisma
      const prismaData = { ...data };
      if (prismaData.tecnicoId !== undefined) {
        prismaData.id_tecnico = prismaData.tecnicoId ? Number(prismaData.tecnicoId) : null;
        delete prismaData.tecnicoId;
      }
      
      // Convertir campos numéricos de string a número
      if (prismaData.quantita_gas !== undefined && prismaData.quantita_gas !== null && prismaData.quantita_gas !== '') {
        prismaData.quantita_gas = parseFloat(prismaData.quantita_gas);
      } else if (prismaData.quantita_gas === '' || prismaData.quantita_gas === null) {
        prismaData.quantita_gas = null;
      }
      
      // Convertir id_tecnico si viene como string
      if (prismaData.id_tecnico !== undefined && prismaData.id_tecnico !== null && prismaData.id_tecnico !== '') {
        prismaData.id_tecnico = Number(prismaData.id_tecnico);
      } else if (prismaData.id_tecnico === '' || prismaData.id_tecnico === null) {
        prismaData.id_tecnico = null;
      }
      
      // Convertir data_consegna si viene como string
      if (prismaData.data_consegna && typeof prismaData.data_consegna === 'string') {
        prismaData.data_consegna = new Date(prismaData.data_consegna);
      }
      
      // Si se establece data_consegna, cambiar automáticamente el estado a "consegnata"
      if (prismaData.data_consegna !== undefined && prismaData.data_consegna !== null) {
        prismaData.stato = 'consegnata';
      }
      
      return await this.prisma.maquina.create({ data: prismaData });
    } catch (error) {
      console.error('❌ Error en create de MaquinasService:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      throw error;
    }
  }

  async update(id, data) {
    try {
      // Verificar que prisma esté disponible
      if (!this.prisma) {
        throw new Error('Prisma client no está disponible');
      }

      // Transformar tecnicoId a id_tecnico para Prisma
      const prismaData = { ...data };
      if (prismaData.tecnicoId !== undefined) {
        prismaData.id_tecnico = prismaData.tecnicoId ? Number(prismaData.tecnicoId) : null;
        delete prismaData.tecnicoId;
      }
      
      // Convertir campos numéricos de string a número
      if (prismaData.quantita_gas !== undefined && prismaData.quantita_gas !== null && prismaData.quantita_gas !== '') {
        prismaData.quantita_gas = parseFloat(prismaData.quantita_gas);
      } else if (prismaData.quantita_gas === '' || prismaData.quantita_gas === null) {
        prismaData.quantita_gas = null;
      }
      
      // Convertir id_tecnico si viene como string
      if (prismaData.id_tecnico !== undefined && prismaData.id_tecnico !== null && prismaData.id_tecnico !== '') {
        prismaData.id_tecnico = Number(prismaData.id_tecnico);
      } else if (prismaData.id_tecnico === '' || prismaData.id_tecnico === null) {
        prismaData.id_tecnico = null;
      }
      
      // Convertir data_consegna si viene como string
      if (prismaData.data_consegna && typeof prismaData.data_consegna === 'string') {
        prismaData.data_consegna = new Date(prismaData.data_consegna);
      }
      
      // Si se establece data_consegna, cambiar automáticamente el estado a "consegnata"
      if (prismaData.data_consegna !== undefined && prismaData.data_consegna !== null) {
        prismaData.stato = 'consegnata';
      }
      
      // Si se elimina data_consegna (se establece como null), no cambiar el estado automáticamente
      // (el usuario puede querer mantener el estado aunque se elimine la fecha)
      
      return await this.prisma.maquina.update({
        where: { id_maquina: Number(id) },
        data: prismaData,
      });
    } catch (error) {
      console.error('❌ Error en update de MaquinasService:', {
        message: error.message,
        code: error.code,
        name: error.name,
        id: id
      });
      throw error;
    }
  }

  // Actualizar múltiples máquinas en lote
  async updateBatch(ids, data) {
    try {
      // Verificar que prisma esté disponible
      if (!this.prisma) {
        throw new Error('Prisma client no está disponible');
      }
    // Transformar tecnicoId a id_tecnico para Prisma
    const prismaData = { ...data };
    if (prismaData.tecnicoId !== undefined) {
      prismaData.id_tecnico = prismaData.tecnicoId ? Number(prismaData.tecnicoId) : null;
      delete prismaData.tecnicoId;
    }
    
    // Convertir campos numéricos de string a número
    if (prismaData.quantita_gas !== undefined && prismaData.quantita_gas !== null && prismaData.quantita_gas !== '') {
      prismaData.quantita_gas = parseFloat(prismaData.quantita_gas);
    } else if (prismaData.quantita_gas === '' || prismaData.quantita_gas === null) {
      prismaData.quantita_gas = null;
    }
    
    // Convertir id_tecnico si viene como string
    if (prismaData.id_tecnico !== undefined && prismaData.id_tecnico !== null && prismaData.id_tecnico !== '') {
      prismaData.id_tecnico = Number(prismaData.id_tecnico);
    } else if (prismaData.id_tecnico === '' || prismaData.id_tecnico === null) {
      prismaData.id_tecnico = null;
    }
    
    // Convertir data_consegna si viene como string
    if (prismaData.data_consegna && typeof prismaData.data_consegna === 'string') {
      prismaData.data_consegna = new Date(prismaData.data_consegna);
    }
    
    // Si se establece data_consegna, cambiar automáticamente el estado a "consegnata"
    if (prismaData.data_consegna !== undefined && prismaData.data_consegna !== null) {
      prismaData.stato = 'consegnata';
    }
    
      // Convertir IDs a números
      const numericIds = ids.map(id => Number(id));
      
      return await this.prisma.maquina.updateMany({
        where: {
          id_maquina: {
            in: numericIds
          }
        },
        data: prismaData,
      });
    } catch (error) {
      console.error('❌ Error en updateBatch de MaquinasService:', {
        message: error.message,
        code: error.code,
        name: error.name,
        ids: ids
      });
      throw error;
    }
  }
}
