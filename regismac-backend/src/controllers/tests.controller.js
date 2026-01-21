import { ApiError } from "../utils/apiError.js";
import { TestsService } from "../services/tests.service.js";
import { MaquinasService } from "../services/maquinas.service.js";
import { verificarLimitesTest } from "../config/testLimits.js";

export const getTests = async (req, res, next) => {
  try {
    const service = new TestsService(req.app.locals.prisma);
    const data = await service.findAll();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const getTestById = async (req, res, next) => {
  try {
    const service = new TestsService(req.app.locals.prisma);
    const id = Number(req.params.id);

    const test = await service.findById(id);
    if (!test) throw new ApiError("Test no encontrado", 404);

    res.json(test);
  } catch (e) {
    next(e);
  }
};

export const getTestsByMaquina = async (req, res, next) => {
  try {
    const service = new TestsService(req.app.locals.prisma);
    const maquinaId = Number(req.params.maquinaId);
    const data = await service.findByMaquina(maquinaId);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const createTest = async (req, res, next) => {
  try {
    const service = new TestsService(req.app.locals.prisma);
    const maquinasService = new MaquinasService(req.app.locals.prisma);
    
    // Intentar crear con retry en caso de error de conexión
    let retries = 3;
    let nuevo = null;
    let lastError = null;
    
    while (retries > 0) {
      try {
        nuevo = await service.create(req.body);
        break;
      } catch (createError) {
        lastError = createError;
        
        // Si es un error de columna faltante (P2022), intentar crear sin temperatura_final
        if (createError.code === 'P2022' && createError.meta?.column === 'temperatura_final') {
          console.warn('⚠️ Columna temperatura_final no existe, intentando crear sin ella...');
          try {
            // Crear una copia del body sin temperatura_final
            const bodySinTemperaturaFinal = { ...req.body };
            delete bodySinTemperaturaFinal.temperatura_final;
            nuevo = await service.create(bodySinTemperaturaFinal);
            console.log('✅ Test creado sin temperatura_final');
            break;
          } catch (retryError) {
            console.error('❌ Error al crear sin temperatura_final:', retryError.message);
            // Continuar con el error original
          }
        }
        
        // Si es un error de conexión y quedan reintentos, intentar reconectar
        if ((createError.code === 'P1001' || createError.code === 'P1002' || createError.code === 'P1017' || createError.code === 'P1000') && retries > 1) {
          try {
            await req.app.locals.prisma.$disconnect();
            await req.app.locals.prisma.$connect();
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (reconnectError) {
            console.error('❌ Error al reconectar:', reconnectError.message);
          }
          retries--;
          continue;
        }
        throw createError;
      }
    }
    
    if (!nuevo && lastError) {
      throw lastError;
    }
    
    // Lógica automática para actualizar estado de la máquina
    if (req.body.maquinaId && req.body.tiempo_0_gradi && req.body.tiempo_meno8_gradi) {
      try {
        // Obtener todas las pruebas de esta máquina
        const testsDeMaquina = await service.findByMaquina(req.body.maquinaId);
        
        // Filtrar pruebas que tengan ambos tiempos registrados
        const testsCompletos = testsDeMaquina.filter(t => 
          t.tempo_0_gradi !== null && t.tempo_meno8_gradi !== null
        );
        
        // Si hay al menos 2 pruebas completas, verificar condiciones
        if (testsCompletos.length >= 2) {
          // Ordenar pruebas por fecha (más antiguo primero)
          const testsOrdenados = [...testsCompletos].sort((a, b) => {
            const fechaA = new Date(a.hora_test || a.fecha_test || 0);
            const fechaB = new Date(b.hora_test || b.fecha_test || 0);
            return fechaA - fechaB;
          });
          
          // Tomar las últimas 2 pruebas (más recientes)
          const ultimas2Tests = testsOrdenados.slice(-2);
          const cumplenCondiciones = ultimas2Tests.every(test => {
            return verificarLimitesTest(test.tempo_0_gradi, test.tempo_meno8_gradi);
          });
          
          if (cumplenCondiciones) {
            // Obtener la máquina para verificar si ya tiene fecha_estado_ok
            const maquina = await maquinasService.findById(req.body.maquinaId);
            const updateData = { stato: 'ok' };
            
            // Actualizar fecha_estado_ok con la fecha de la prueba más reciente (la última)
            // Esto permite que se actualice cada vez que se cumplen las condiciones
            // para reflejar cuándo la máquina quedó lista
            const pruebaMasReciente = ultimas2Tests[ultimas2Tests.length - 1];
            const fechaEstadoOk = pruebaMasReciente.hora_test || pruebaMasReciente.fecha_test;
            updateData.fecha_estado_ok = fechaEstadoOk;
            
            // Actualizar estado de la máquina a "ok"
            await maquinasService.update(req.body.maquinaId, updateData);
          }
        }
        
        // Actualizar fecha_primera_prueba si no existe
        const maquina = await maquinasService.findById(req.body.maquinaId);
        if (!maquina.fecha_primera_prueba) {
          const primeraPrueba = await service.findByMaquina(req.body.maquinaId);
          if (primeraPrueba.length > 0) {
            const primeraPruebaOrdenada = primeraPrueba.sort((a, b) => 
              new Date(a.hora_test || a.fecha_test) - new Date(b.hora_test || b.fecha_test)
            );
            const fechaPrimera = primeraPruebaOrdenada[0].hora_test || primeraPruebaOrdenada[0].fecha_test;
            await maquinasService.update(req.body.maquinaId, { 
              fecha_primera_prueba: fechaPrimera 
            });
          }
        }
      } catch (updateError) {
        // Si hay un error al actualizar el estado de la máquina, loguear pero no fallar
        console.error('❌ Error al actualizar estado de máquina después de crear test:', updateError);
        // Continuar y devolver el test creado aunque falle la actualización del estado
      }
    }
    
    res.status(201).json(nuevo);
  } catch (e) {
    console.error('❌ Error al crear test:', {
      code: e.code,
      message: e.message,
      name: e.name
    });
    // Si hay un error de conexión a la base de datos, dejar que el errorHandler lo maneje
    if (e.code === 'P1001' || e.code === 'P1002' || e.code === 'P1017' || e.code === 'P1000') {
      console.error('❌ Errore di connessione al database durante la creazione del test:', e);
      return next(e); // Dejar que el errorHandler lo maneje con 503
    }
    next(e);
  }
};

export const updateTest = async (req, res, next) => {
  try {
    const service = new TestsService(req.app.locals.prisma);
    const id = Number(req.params.id);
    const updated = await service.update(id, req.body);
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

export const deleteTest = async (req, res, next) => {
  try {
    const service = new TestsService(req.app.locals.prisma);
    const id = Number(req.params.id);
    await service.delete(id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
