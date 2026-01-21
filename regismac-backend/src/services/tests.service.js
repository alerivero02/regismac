export class TestsService {
    constructor(prisma) {
      this.prisma = prisma;
    }
  
    findAll() {
      return this.prisma.test.findMany({
        select: {
          id_test: true,
          id_maquina: true,
          id_tecnico: true,
          temperatura_iniziale: true,
          regolazione_vite: true,
          tempo_0_gradi: true,
          tempo_meno8_gradi: true,
          quantita_liquido: true,
          humedad_ambiente: true,
          fecha_test: true,
          hora_test: true,
          observazioni: true,
          maquina: {
            select: {
              id_maquina: true,
              numero_telaio: true,
              stato: true
            }
          },
          tecnico: {
            select: {
              id_tecnico: true,
              nome: true,
              cognome: true
            }
          }
        },
        orderBy: {
          fecha_test: 'desc'
        }
      });
    }
  
    findById(id) {
      return this.prisma.test.findUnique({
        where: { id_test: id },
        include: { 
          maquina: true,
          tecnico: {
            include: {
              usuario: true
            }
          }
        }
      });
    }
  
    findByMaquina(maquinaId) {
      return this.prisma.test.findMany({
        where: { id_maquina: maquinaId },
        include: {
          tecnico: {
            include: {
              usuario: true
            }
          }
        },
        orderBy: [
          { hora_test: "asc" },
          { fecha_test: "asc" },
          { id_test: "asc" }
        ]
      });
    }
  
    create(data) {
      // Mapear los campos del frontend a los nombres del schema de Prisma
      const prismaData = {
        id_maquina: data.maquinaId,
        temperatura_iniziale: data.temperatura_iniziale,
        regolazione_vite: data.regolazione_vite,
        tempo_0_gradi: data.tiempo_0_gradi,
        tempo_meno8_gradi: data.tiempo_meno8_gradi,
        quantita_liquido: data.quantita_liquido,
        humedad_ambiente: data.humedad_ambiente,
        observazioni: data.observazioni,
        id_tecnico: data.tecnicoId,
      };
      
      // Agregar temperatura_final solo si está definido (para compatibilidad con bases de datos sin esta columna)
      if (data.temperatura_final !== undefined && data.temperatura_final !== null) {
        prismaData.temperatura_final = data.temperatura_final;
      }
      
      // Si se proporciona hora_test, convertirla a DateTime
      if (data.hora_test) {
        prismaData.hora_test = new Date(data.hora_test);
      }
      
      // Eliminar campos undefined
      Object.keys(prismaData).forEach(key => 
        prismaData[key] === undefined && delete prismaData[key]
      );
      
      return this.prisma.test.create({ 
        data: prismaData,
        include: {
          tecnico: {
            include: {
              usuario: true
            }
          }
        }
      });
    }
  
    update(id, data) {
      // Mapear los campos del frontend a los nombres del schema de Prisma
      const prismaData = {};
      
      if (data.maquinaId !== undefined) prismaData.id_maquina = data.maquinaId;
      if (data.temperatura_iniziale !== undefined) prismaData.temperatura_iniziale = data.temperatura_iniziale;
      if (data.tiempo_0_gradi !== undefined) prismaData.tempo_0_gradi = data.tiempo_0_gradi;
      if (data.tiempo_meno8_gradi !== undefined) prismaData.tempo_meno8_gradi = data.tiempo_meno8_gradi;
      if (data.quantita_liquido !== undefined) prismaData.quantita_liquido = data.quantita_liquido;
      if (data.humedad_ambiente !== undefined) prismaData.humedad_ambiente = data.humedad_ambiente;
      if (data.observazioni !== undefined) prismaData.observazioni = data.observazioni;
      
      return this.prisma.test.update({
        where: { id_test: id },
        data: prismaData
      });
    }
  
    delete(id) {
      return this.prisma.test.delete({
        where: { id_test: id }
      });
    }
  }
  