export class OrdiniMaterialiService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll() {
    return this.prisma.ordine.findMany({
      include: {
        items: {
          include: {
            materiale: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id) {
    return this.prisma.ordine.findUnique({
      where: { id_ordine: id },
      include: {
        items: {
          include: {
            materiale: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });
  }

  findByMateriale(materialeId) {
    return this.prisma.ordine.findMany({
      where: {
        items: {
          some: {
            id_materiale: materialeId,
          },
        },
      },
      include: {
        items: {
          include: {
            materiale: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByStato(stato) {
    return this.prisma.ordine.findMany({
      where: { stato },
      include: {
        items: {
          include: {
            materiale: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(data) {
    // Crear una orden con un solo material (compatibilidad hacia atrás)
    const ordineData = {
      stato: data.stato || 'richiesto',
      id_usuario: data.id_usuario ? Number(data.id_usuario) : null,
    };

    if (data.data_richiesta) {
      ordineData.data_richiesta = new Date(data.data_richiesta);
    }
    if (data.data_ordine) {
      ordineData.data_ordine = new Date(data.data_ordine);
    }
    if (data.data_consegna_prevista) {
      ordineData.data_consegna_prevista = new Date(data.data_consegna_prevista);
    }
    if (data.note) {
      ordineData.note = data.note;
    }

    return this.prisma.ordine.create({
      data: {
        ...ordineData,
        items: {
          create: {
            id_materiale: Number(data.id_materiale),
            quantita: parseFloat(data.quantita),
            note: data.itemNote || null,
          },
        },
      },
      include: {
        items: {
          include: {
            materiale: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });
  }

  createBulk(items, commonData) {
    // Crear una sola orden con múltiples materiales
    const ordineData = {
      stato: commonData.stato || 'richiesto',
      id_usuario: commonData.id_usuario ? Number(commonData.id_usuario) : null,
    };

    if (commonData.data_richiesta) {
      ordineData.data_richiesta = new Date(commonData.data_richiesta);
    }
    if (commonData.data_ordine) {
      ordineData.data_ordine = new Date(commonData.data_ordine);
    }
    if (commonData.data_consegna_prevista) {
      ordineData.data_consegna_prevista = new Date(commonData.data_consegna_prevista);
    }
    if (commonData.note) {
      ordineData.note = commonData.note;
    }

    // Crear los items
    const itemsData = items.map(item => ({
      id_materiale: Number(item.id_materiale),
      quantita: parseFloat(item.quantita),
      note: item.note || null,
    }));

    return this.prisma.ordine.create({
      data: {
        ...ordineData,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: {
          include: {
            materiale: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });
  }

  async update(id, data) {
    const updateData = {};
    
    if (data.stato !== undefined) {
      updateData.stato = data.stato;
    }
    if (data.data_ordine !== undefined) {
      updateData.data_ordine = data.data_ordine ? new Date(data.data_ordine) : null;
    }
    if (data.data_consegna_prevista !== undefined) {
      updateData.data_consegna_prevista = data.data_consegna_prevista ? new Date(data.data_consegna_prevista) : null;
    }
    if (data.data_consegna !== undefined) {
      updateData.data_consegna = data.data_consegna ? new Date(data.data_consegna) : null;
    }
    if (data.note !== undefined) {
      updateData.note = data.note || null;
    }

    // Si hay items para actualizar, actualizarlos también
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      // Actualizar el orden primero
      const ordine = await this.prisma.ordine.update({
        where: { id_ordine: id },
        data: updateData,
      });

      // Actualizar cada item
      const updatePromises = data.items.map(item => {
        return this.prisma.ordineItem.update({
          where: { id_item: item.id_item },
          data: {
            quantita: parseFloat(item.quantita) || 0,
          },
        });
      });

      await Promise.all(updatePromises);

      // Retornar el orden con los items actualizados
      return this.prisma.ordine.findUnique({
        where: { id_ordine: id },
        include: {
          items: {
            include: {
              materiale: true,
            },
          },
          usuario: {
            select: {
              id_usuario: true,
              nombre: true,
              apellido: true,
              email: true,
            },
          },
        },
      });
    }

    // Si no hay items para actualizar, solo actualizar el orden
    return this.prisma.ordine.update({
      where: { id_ordine: id },
      data: updateData,
      include: {
        items: {
          include: {
            materiale: true,
          },
        },
        usuario: {
          select: {
            id_usuario: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });
  }

  delete(id) {
    if (!id || isNaN(Number(id))) {
      throw new Error('ID ordine non valido');
    }
    return this.prisma.ordine.delete({
      where: { id_ordine: Number(id) },
    });
  }

  async cancelAll(filters = {}) {
    // Cancelar todos los órdenes que no estén ya cancelados
    const whereClause = {
      stato: {
        not: 'annullato'
      }
    };

    // Si hay filtro de estado, aplicarlo (pero excluir los ya cancelados)
    if (filters.stato && filters.stato !== 'annullato') {
      whereClause.stato = filters.stato;
    }

    // Si hay filtro de fornitore, aplicarlo a través de los items
    if (filters.materiale && filters.materiale.fornitore) {
      whereClause.items = {
        some: {
          materiale: {
            fornitore: filters.materiale.fornitore
          }
        }
      };
    }

    const result = await this.prisma.ordine.updateMany({
      where: whereClause,
      data: {
        stato: 'annullato'
      }
    });
    
    return result; // Retorna { count: number }
  }

  async deleteAll(filters = {}) {
    // Eliminar todos los órdenes (no solo anularlos)
    const whereClause = {};

    // Si hay filtro de estado, aplicarlo
    if (filters.stato) {
      whereClause.stato = filters.stato;
    }

    // Si hay filtro de fornitore, aplicarlo a través de los items
    if (filters.materiale && filters.materiale.fornitore) {
      whereClause.items = {
        some: {
          materiale: {
            fornitore: filters.materiale.fornitore
          }
        }
      };
    }

    const result = await this.prisma.ordine.deleteMany({
      where: whereClause
    });
    
    return result; // Retorna { count: number }
  }
}
