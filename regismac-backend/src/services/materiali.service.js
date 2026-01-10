export class MaterialiService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  findAll() {
    return this.prisma.materiale.findMany({
      include: {
        ordiniItems: {
          include: {
            ordine: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nombre: true,
                    apellido: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5, // Últimos 5 items de órdenes
        },
      },
      orderBy: { cod_articolo: 'asc' },
    });
  }

  findById(id) {
    return this.prisma.materiale.findUnique({
      where: { id_materiale: id },
      include: {
        ordiniItems: {
          include: {
            ordine: {
              include: {
                usuario: {
                  select: {
                    id_usuario: true,
                    nombre: true,
                    apellido: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  findByCodArticolo(codArticolo) {
    return this.prisma.materiale.findUnique({
      where: { cod_articolo: codArticolo },
    });
  }

  findByCodArticoloAndFornitore(codArticolo, fornitore) {
    return this.prisma.materiale.findUnique({
      where: {
        cod_articolo_fornitore: {
          cod_articolo: codArticolo,
          fornitore: fornitore,
        },
      },
    });
  }

  create(data) {
    const stockComprado = data.stock_comprado ? parseFloat(data.stock_comprado) : 0;
    const stockUtilizado = data.stock_utilizado ? parseFloat(data.stock_utilizado) : 0;
    const stockDisponible = stockComprado - stockUtilizado;
    const stockMinimo = data.stock_minimo !== null && data.stock_minimo !== undefined 
      ? parseFloat(data.stock_minimo) 
      : null;

    return this.prisma.materiale.create({
      data: {
        cod_articolo: data.cod_articolo,
        codice: data.codice || null,
        descrizione: data.descrizione,
        fornitore: data.fornitore,
        unita_misura: data.unita_misura || null,
        prezzo_unitario: data.prezzo_unitario ? parseFloat(data.prezzo_unitario) : null,
        note: data.note || null,
        stock_comprado: stockComprado,
        stock_utilizado: stockUtilizado,
        stock_disponible: stockDisponible,
        activar_alerta: data.activar_alerta !== undefined ? Boolean(data.activar_alerta) : true,
        stock_minimo: stockMinimo,
      },
    });
  }

  update(id, data) {
    const updateData = {};
    if (data.codice !== undefined) updateData.codice = data.codice || null;
    if (data.descrizione !== undefined) updateData.descrizione = data.descrizione;
    if (data.fornitore !== undefined) updateData.fornitore = data.fornitore;
    if (data.unita_misura !== undefined) updateData.unita_misura = data.unita_misura || null;
    if (data.prezzo_unitario !== undefined) {
      updateData.prezzo_unitario = data.prezzo_unitario ? parseFloat(data.prezzo_unitario) : null;
    }
    if (data.note !== undefined) updateData.note = data.note || null;
    if (data.activar_alerta !== undefined) {
      updateData.activar_alerta = Boolean(data.activar_alerta);
    }
    if (data.stock_minimo !== undefined) {
      updateData.stock_minimo = data.stock_minimo !== null && data.stock_minimo !== undefined 
        ? parseFloat(data.stock_minimo) 
        : null;
    }

    // Actualizar stock si se proporciona
    if (data.stock_comprado !== undefined || data.stock_utilizado !== undefined) {
      // Obtener el materiale actual para calcular el nuevo stock
      return this.prisma.materiale.findUnique({
        where: { id_materiale: id },
      }).then(materiale => {
        const stockComprado = data.stock_comprado !== undefined 
          ? parseFloat(data.stock_comprado) 
          : (materiale?.stock_comprado || 0);
        const stockUtilizado = data.stock_utilizado !== undefined 
          ? parseFloat(data.stock_utilizado) 
          : (materiale?.stock_utilizado || 0);
        const stockDisponible = stockComprado - stockUtilizado;

        updateData.stock_comprado = stockComprado;
        updateData.stock_utilizado = stockUtilizado;
        updateData.stock_disponible = stockDisponible;

        return this.prisma.materiale.update({
          where: { id_materiale: id },
          data: updateData,
        });
      });
    }

    return this.prisma.materiale.update({
      where: { id_materiale: id },
      data: updateData,
    });
  }

  updateStock(id, data) {
    const stockComprado = data.stock_comprado !== undefined ? parseFloat(data.stock_comprado) : undefined;
    const stockUtilizado = data.stock_utilizado !== undefined ? parseFloat(data.stock_utilizado) : undefined;

    // Obtener el materiale actual para mantener los valores que no se actualizan
    return this.prisma.materiale.findUnique({
      where: { id_materiale: id },
    }).then(materiale => {
      if (!materiale) {
        throw new Error('Materiale non trovato');
      }

      const nuevoStockComprado = stockComprado !== undefined ? stockComprado : materiale.stock_comprado;
      const nuevoStockUtilizado = stockUtilizado !== undefined ? stockUtilizado : materiale.stock_utilizado;
      const nuevoStockDisponible = nuevoStockComprado - nuevoStockUtilizado;

      return this.prisma.materiale.update({
        where: { id_materiale: id },
        data: {
          stock_comprado: nuevoStockComprado,
          stock_utilizado: nuevoStockUtilizado,
          stock_disponible: nuevoStockDisponible,
        },
      });
    });
  }

  delete(id) {
    return this.prisma.materiale.delete({
      where: { id_materiale: id },
    });
  }
}

