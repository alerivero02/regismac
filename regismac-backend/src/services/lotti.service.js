import { PrismaClient } from '@prisma/client';

export class LottiService {
  constructor(prisma) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Genera el siguiente número de lote para un año dado
   * Formato: LOTTO-YYYY-NNN (ej: LOTTO-2024-001)
   */
  async generarNumeroLotto(anno) {
    const lottoAnno = await this.prisma.lotto.findMany({
      where: { anno },
      orderBy: { numero_lotto: 'desc' },
      take: 1
    }).catch(() => []); // Si la tabla no existe aún, retornar array vacío

    let numeroSecuencial = 1;
    if (lottoAnno.length > 0) {
      const ultimoLotto = lottoAnno[0].numero_lotto;
      const match = ultimoLotto.match(/LOTTO-\d{4}-(\d+)/);
      if (match) {
        numeroSecuencial = parseInt(match[1], 10) + 1;
      }
    }

    return `LOTTO-${anno}-${numeroSecuencial.toString().padStart(3, '0')}`;
  }

  /**
   * Crea un nuevo lote
   */
  async create(data) {
    const { anno, descrizione, numero_telaio_da, numero_telaio_a, maquinaIds } = data;

    // Generar número de lote automáticamente
    const numero_lotto = await this.generarNumeroLotto(anno);

    // Crear el lote
    const lotto = await this.prisma.lotto.create({
      data: {
        numero_lotto,
        anno,
        descrizione,
        numero_telaio_da,
        numero_telaio_a
      }
    });

    // Asignar máquinas al lote si se proporcionan
    if (maquinaIds && maquinaIds.length > 0) {
      await this.prisma.maquina.updateMany({
        where: {
          id_maquina: { in: maquinaIds }
        },
        data: {
          id_lotto: lotto.id_lotto
        }
      });
    }

    // Retornar el lote con las máquinas asignadas
    return this.findById(lotto.id_lotto);
  }

  /**
   * Obtiene todos los lotes
   */
  async findAll() {
    try {
      return await this.prisma.lotto.findMany({
        include: {
          maquinas: {
            include: {
              tecnico: true
            },
            orderBy: {
              numero_telaio: 'asc'
            }
          }
        },
        orderBy: {
          data_creazione: 'desc'
        }
      });
    } catch (error) {
      // Si la tabla no existe, retornar array vacío
      if (error.code === 'P2021' || error.message?.includes("doesn't exist") || error.message?.includes("Table") && error.message?.includes("doesn't exist")) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Obtiene un lote por ID
   */
  async findById(id) {
    return this.prisma.lotto.findUnique({
      where: { id_lotto: id },
      include: {
        maquinas: {
          include: {
            tecnico: true,
            tests: {
              orderBy: {
                fecha_test: 'desc'
              },
              take: 1
            }
          },
          orderBy: {
            numero_telaio: 'asc'
          }
        }
      }
    });
  }

  /**
   * Obtiene un lote por número de lote
   */
  async findByNumeroLotto(numeroLotto) {
    return this.prisma.lotto.findUnique({
      where: { numero_lotto: numeroLotto },
      include: {
        maquinas: {
          include: {
            tecnico: true
          },
          orderBy: {
            numero_telaio: 'asc'
          }
        }
      }
    });
  }

  /**
   * Actualiza un lote
   */
  async update(id, data) {
    const { descrizione, numero_telaio_da, numero_telaio_a, maquinaIds } = data;

    const updateData = {};
    if (descrizione !== undefined) updateData.descrizione = descrizione;
    if (numero_telaio_da !== undefined) updateData.numero_telaio_da = numero_telaio_da;
    if (numero_telaio_a !== undefined) updateData.numero_telaio_a = numero_telaio_a;

    await this.prisma.lotto.update({
      where: { id_lotto: id },
      data: updateData
    });

    // Actualizar máquinas asignadas si se proporcionan
    if (maquinaIds !== undefined) {
      // Primero, remover todas las máquinas del lote
      await this.prisma.maquina.updateMany({
        where: { id_lotto: id },
        data: { id_lotto: null }
      });

      // Luego, asignar las nuevas máquinas
      if (maquinaIds.length > 0) {
        await this.prisma.maquina.updateMany({
          where: {
            id_maquina: { in: maquinaIds }
          },
          data: {
            id_lotto: id
          }
        });
      }
    }

    return this.findById(id);
  }

  /**
   * Elimina un lote (solo si no tiene máquinas asignadas)
   */
  async delete(id) {
    const lotto = await this.findById(id);
    
    if (lotto.maquinas && lotto.maquinas.length > 0) {
      throw new Error('No se puede eliminar un lote que tiene máquinas asignadas');
    }

    return this.prisma.lotto.delete({
      where: { id_lotto: id }
    });
  }

  /**
   * Asigna máquinas a un lote por rango de números de telaio
   */
  async asignarMaquinasPorRango(idLotto, numeroTelaioDesde, numeroTelaioHasta) {
    // Buscar máquinas en el rango
    const maquinas = await this.prisma.maquina.findMany({
      where: {
        numero_telaio: {
          gte: numeroTelaioDesde,
          lte: numeroTelaioHasta
        }
      }
    });

    if (maquinas.length === 0) {
      throw new Error('No se encontraron máquinas en el rango especificado');
    }

    // Asignar al lote
    await this.prisma.maquina.updateMany({
      where: {
        numero_telaio: {
          gte: numeroTelaioDesde,
          lte: numeroTelaioHasta
        }
      },
      data: {
        id_lotto: idLotto
      }
    });

    return this.findById(idLotto);
  }

  /**
   * Obtiene máquinas disponibles (sin lote asignado) en un rango
   */
  async getMaquinasDisponiblesEnRango(numeroTelaioDesde, numeroTelaioHasta) {
    return this.prisma.maquina.findMany({
      where: {
        numero_telaio: {
          gte: numeroTelaioDesde,
          lte: numeroTelaioHasta
        },
        id_lotto: null
      },
      include: {
        tecnico: true
      },
      orderBy: {
        numero_telaio: 'asc'
      }
    });
  }

  /**
   * Quita una máquina de un lote
   */
  async quitarMaquinaDelLote(idLotto, idMaquina) {
    // Verificar que el lote existe
    const lotto = await this.findById(idLotto);
    if (!lotto) {
      throw new Error('Lote no encontrado');
    }

    // Verificar que la máquina existe y pertenece al lote
    const maquina = await this.prisma.maquina.findUnique({
      where: { id_maquina: idMaquina }
    });

    if (!maquina) {
      throw new Error('Máquina no encontrada');
    }

    if (maquina.id_lotto !== idLotto) {
      throw new Error('La máquina no pertenece a este lote');
    }

    // Quitar la máquina del lote
    await this.prisma.maquina.update({
      where: { id_maquina: idMaquina },
      data: { id_lotto: null }
    });

    // Retornar el lote actualizado
    return this.findById(idLotto);
  }
}

