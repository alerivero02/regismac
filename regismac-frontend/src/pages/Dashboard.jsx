import { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  FiPackage, 
  FiCheckCircle, 
  FiUsers, 
  FiTrendingUp,
  FiCalendar,
  FiBarChart2,
  FiClock,
  FiRefreshCw,
  FiAlertCircle,
  FiXCircle,
  FiActivity,
  FiTarget,
  FiZap,
  FiPlay,
  FiCheck,
  FiTruck,
  FiBox,
  FiAlertTriangle,
  FiX,
  FiShoppingCart,
  FiSearch,
  FiUser,
  FiThermometer,
  FiSettings,
  FiRotateCw,
  FiDroplet,
  FiEdit2,
  FiSave
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { maquinasAPI, testsAPI, tecnicosAPI, materialiAPI, authAPI, ordiniMaterialiAPI } from '../services/api';
import StatCard from '../components/StatCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMaquinas: 0,
    totalTests: 0,
    totalTecnicos: 0,
    maquinasRecientes: [],
    maquinasPorEstado: {},
    maquinasListas: 0,
    maquinasPendientes: 0,
    testsListos: 0,
    testsPendientes: 0,
    maquinasDaProvare: 0,
    porcentajeExito: 0,
    promedioTestsPorMaquina: 0,
    maquinasConTests: 0,
    maquinasConsegnate: 0,
    maquinasConsegnateEsteMes: 0,
    maquinasCompletateNonConsegnate: 0,
    maquinasConsegnatePorMes: [],
    maquinasPronteQuestoMese: 0,
    maquinasConProblemi: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allMaquinas, setAllMaquinas] = useState([]);
  const [allTests, setAllTests] = useState([]);
  const [allTecnicos, setAllTecnicos] = useState([]);
  const [materiali, setMateriali] = useState([]);
  const [activeTab, setActiveTab] = useState('listas');
  const [currentUser, setCurrentUser] = useState(null);
  const [showModalOrdini, setShowModalOrdini] = useState(false);
  const [creandoOrdine, setCreandoOrdine] = useState(false);
  const [quantitaMateriali, setQuantitaMateriali] = useState({}); // { id_materiale: quantità }
  const [alertaStockNascosta, setAlertaStockNascosta] = useState(true);
  const [searchVistaDettagliata, setSearchVistaDettagliata] = useState('');
  const [debouncedSearchVistaDettagliata, setDebouncedSearchVistaDettagliata] = useState('');
  const [editingStockId, setEditingStockId] = useState(null); // ID del materiale en edición de stock
  const [stockTemp, setStockTemp] = useState({}); // { id_materiale: stock_comprado_temp }
  const [editingStockMinimoId, setEditingStockMinimoId] = useState(null); // ID del materiale en edición de stock_minimo
  const [stockMinimoTemp, setStockMinimoTemp] = useState({}); // { id_materiale: stock_minimo_temp }

  /**
   * Normaliza el estado de una máquina a minúsculas y sin espacios
   * @param {string} stato - Estado a normalizar
   * @returns {string|null} - Estado normalizado o null si no existe
   */
  const normalizarEstado = (stato) => {
    if (!stato) return null;
    return stato.toString().trim().toLowerCase();
  };

  /**
   * Obtiene el orden (paso) de un estado en el proceso de producción
   * @param {string} stato - Estado de la máquina
   * @returns {number} - Orden numérico del estado (1-6) o 999 si es desconocido
   */
  const obtenerOrdenEstado = (stato) => {
    const statoNormalizado = normalizarEstado(stato);
    // Mapear "completata" a "ok" ya que son equivalentes
    const statoMapeado = statoNormalizado === 'completata' ? 'ok' : statoNormalizado;
    const ordenEstados = {
      'pendente': 1,
      'in_produzione': 2,
      'in_test': 3,
      'ok': 4,
      'consegnata': 5,
      'rientrate': 6,
      'senza_stato': 0, // Sin estado va al principio
    };
    return ordenEstados[statoMapeado] ?? 999; // Estados desconocidos al final
  };

  /**
   * Obtiene las máquinas que tienen al menos 2 pruebas válidas consecutivas
   * @param {Array} tests - Array de todas las pruebas
   * @returns {Set} - Set con los IDs de las máquinas que cumplen la condición
   */
  // Límites de tiempo para las pruebas (en segundos)
  // Estos valores deben coincidir con los del backend en testLimits.js
  const TEST_LIMITS = {
    TEMPO_0_GRADI_MAX: 540,        // 9 minutos
    TEMPO_MENO8_GRADI_MIN: 540,    // 9 minutos
    TEMPO_MENO8_GRADI_MAX: 1200,    // 20 minutos
  };

  const obtenerMaquinasConPruebasValidas = (tests) => {
    const testsCompletos = tests.filter(t => 
      (t.tempo_0_gradi !== null && t.tempo_0_gradi !== undefined) && 
      (t.tempo_meno8_gradi !== null && t.tempo_meno8_gradi !== undefined)
    );
    const testsPorMaquina = {};
    testsCompletos.forEach(test => {
      if (!testsPorMaquina[test.id_maquina]) {
        testsPorMaquina[test.id_maquina] = [];
      }
      testsPorMaquina[test.id_maquina].push(test);
    });
    
    const maquinasIds = new Set();
    Object.entries(testsPorMaquina).forEach(([id, testsMaquina]) => {
      if (testsMaquina.length >= 2) {
        // Ordenar los tests por fecha (más antiguo primero) para tomar las últimas 2 cronológicamente
        const testsOrdenados = [...testsMaquina].sort((a, b) => {
          const fechaA = new Date(a.hora_test || a.fecha_test || 0);
          const fechaB = new Date(b.hora_test || b.fecha_test || 0);
          return fechaA - fechaB; // Más antiguo primero
        });
        
        // Tomar las últimas 2 pruebas (más recientes)
        const ultimas2Tests = testsOrdenados.slice(-2);
        const cumplenCondiciones = ultimas2Tests.every(test => {
          const tiempo0 = test.tempo_0_gradi;
          const tiempoMenos8 = test.tempo_meno8_gradi;
          const cumple0Grados = tiempo0 <= TEST_LIMITS.TEMPO_0_GRADI_MAX;
          const cumpleMenos8Grados = tiempoMenos8 >= TEST_LIMITS.TEMPO_MENO8_GRADI_MIN && 
                                     tiempoMenos8 <= TEST_LIMITS.TEMPO_MENO8_GRADI_MAX;
          return cumple0Grados && cumpleMenos8Grados;
        });
        if (cumplenCondiciones) {
          maquinasIds.add(parseInt(id));
        }
      }
    });
    
    return maquinasIds;
  };

  /**
   * Calcula los contadores de cada tab de forma optimizada
   * @returns {Object} - Objeto con los contadores por tab
   */
  const tabCounts = useMemo(() => {
    if (!allMaquinas || !allTests || allMaquinas.length === 0) {
      return {
        listas: 0,
        da_provare: 0,
        in_produzione: 0,
        in_test: 0,
        consegnata: 0,
        rientrate: 0,
        tutte: allMaquinas?.length || 0
      };
    }

    // Obtener máquinas con 2 pruebas válidas consecutivas
    const maquinasConPruebasValidasIds = obtenerMaquinasConPruebasValidas(allTests);
    const maquinasConTests = new Set(allTests.map(t => t.id_maquina));
    
    return {
      // Pronte: stato "ok" o "completata" + 2 pruebas válidas + sin data_consegna
      listas: allMaquinas.filter(m => {
        const estado = normalizarEstado(m.stato);
        const statoMapeado = estado === 'completata' ? 'ok' : estado;
        return statoMapeado === 'ok' && 
               maquinasConPruebasValidasIds.has(m.id_maquina) && 
               (m.data_consegna === null || m.data_consegna === undefined);
      }).length,
      da_provare: allMaquinas.filter(m => {
        const testsDeMaquina = allTests.filter(t => t.id_maquina === m.id_maquina);
        return testsDeMaquina.length < 2;
      }).length,
      in_produzione: allMaquinas.filter(m => normalizarEstado(m.stato) === 'in_produzione').length,
      in_test: allMaquinas.filter(m => normalizarEstado(m.stato) === 'in_test').length,
      consegnata: allMaquinas.filter(m => {
        const estado = normalizarEstado(m.stato);
        return estado === 'consegnata' || (m.data_consegna !== null && m.data_consegna !== undefined);
      }).length,
      rientrate: allMaquinas.filter(m => normalizarEstado(m.stato) === 'rientrate').length,
      tutte: allMaquinas.length
    };
  }, [allMaquinas, allTests]);

  /**
   * Convierte segundos a formato MM:SS
   * @param {number} segundos - Segundos a convertir
   * @returns {string} - Formato MM:SS o '-' si no hay valor
   */
  const segundosAMinutosSegundos = (segundos) => {
    if (!segundos && segundos !== 0) return '-';
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos.toString().padStart(2, '0')}:${segs.toString().padStart(2, '0')}`;
  };

  /**
   * Obtiene la última prueba realizada de una máquina
   * @param {Object} maquina - Objeto máquina
   * @returns {Object|null} - Última prueba o null si no hay pruebas
   */
  const obtenerUltimaPrueba = (maquina) => {
    // Buscar tests de esta máquina en allTests
    const testsMaquina = allTests.filter(t => t.id_maquina === maquina.id_maquina);
    if (testsMaquina.length === 0) return null;
    
    // Ordenar por fecha (más reciente primero)
    const testsOrdenados = [...testsMaquina].sort((a, b) => {
      const fechaA = new Date(a.hora_test || a.fecha_test);
      const fechaB = new Date(b.hora_test || b.fecha_test);
      return fechaB - fechaA; // Más reciente primero
    });
    
    return testsOrdenados[0];
  };

  const loadCurrentUser = async () => {
    try {
      const user = await authAPI.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const crearOrdineDaMateriali = async (materialiDaOrdinare) => {
    try {
      // Validar que todas las cantidades sean válidas
      const materialiConQuantita = materialiDaOrdinare.filter(m => {
        const quantità = quantitaMateriali[m.id_materiale] || 0;
        return quantità > 0;
      });

      if (materialiConQuantita.length === 0) {
        alert('Inserisci almeno una quantità valida per creare un ordine');
        return;
      }

      setCreandoOrdine(true);
      const dataRichiesta = new Date().toISOString().split('T')[0];
      
      // Crear un orden por cada materiale con la cantidad especificada
      const promises = materialiConQuantita.map(materiale => {
        const quantità = parseFloat(quantitaMateriali[materiale.id_materiale]) || 1;
        return ordiniMaterialiAPI.create({
          id_materiale: materiale.id_materiale,
          quantita: quantità,
          stato: 'richiesto',
          data_richiesta: dataRichiesta,
          data_ordine: null,
          data_consegna_prevista: null,
          note: `Ordine creato automaticamente da alerta stock - ${materiale.cod_articolo}`,
        });
      });

      await Promise.all(promises);
      setShowModalOrdini(false);
      setQuantitaMateriali({});
      navigate('/ordini-materiali');
    } catch (error) {
      console.error('Error al crear orden:', error);
      alert('Errore nella creazione dell\'ordine: ' + (error.message || 'Errore sconosciuto'));
    } finally {
      setCreandoOrdine(false);
    }
  };

  const handleQuantitaChange = (idMateriale, quantità) => {
    const numQuantità = parseFloat(quantità) || 0;
    setQuantitaMateriali(prev => ({
      ...prev,
      [idMateriale]: numQuantità > 0 ? numQuantità : ''
    }));
  };

  /**
   * Actualiza el stock_minimo de un materiale (solo para administradores)
   * @param {number} idMateriale - ID del materiale
   * @param {number} nuevoStockMinimo - Nuevo valor de stock_minimo
   */
  const handleUpdateStockMinimo = async (idMateriale, nuevoStockMinimo) => {
    // Solo administradores pueden modificar stock_minimo
    if (currentUser?.rol !== 'admin') {
      alert('Solo gli amministratori possono modificare lo stock minimo');
      return;
    }

    try {
      const materiale = materiali.find(m => m.id_materiale === idMateriale);
      if (!materiale) {
        alert('Materiale non trovato');
        return;
      }

      // Si el valor está vacío o es null, establecer como null (sin límite mínimo)
      let numStockMinimo = null;
      if (nuevoStockMinimo !== '' && nuevoStockMinimo !== null && nuevoStockMinimo !== undefined) {
        numStockMinimo = parseFloat(nuevoStockMinimo);
        if (isNaN(numStockMinimo) || numStockMinimo < 0) {
          alert('Il valore dello stock minimo deve essere un numero positivo o vuoto');
          return;
        }
      }

      // Actualizar el materiale usando la API de actualización normal
      await materialiAPI.update(idMateriale, {
        stock_minimo: numStockMinimo,
      });

      // Actualizar el materiale en el estado local
      setMateriali(prev => prev.map(m => 
        m.id_materiale === idMateriale 
          ? { ...m, stock_minimo: numStockMinimo }
          : m
      ));

      setEditingStockMinimoId(null);
      setStockMinimoTemp(prev => {
        const newTemp = { ...prev };
        delete newTemp[idMateriale];
        return newTemp;
      });
    } catch (error) {
      console.error('Error al actualizar stock_minimo:', error);
      alert('Errore nell\'aggiornamento dello stock minimo: ' + (error.message || 'Errore sconosciuto'));
    }
  };

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cargar todas las APIs en paralelo para mejorar rendimiento
      const [maquinasResult, testsResult, tecnicosResult, materialiResult] = await Promise.allSettled([
        maquinasAPI.getAll(),
        testsAPI.getAll(),
        tecnicosAPI.getAll(),
        materialiAPI.getAll()
      ]);
      
      // Extraer resultados o usar arrays vacíos si falló
      const maquinas = maquinasResult.status === 'fulfilled' ? maquinasResult.value : [];
      const tests = testsResult.status === 'fulfilled' ? testsResult.value : [];
      const tecnicos = tecnicosResult.status === 'fulfilled' ? tecnicosResult.value : [];
      const materialiData = materialiResult.status === 'fulfilled' ? materialiResult.value : [];
      
      // Log errores si los hay
      if (maquinasResult.status === 'rejected') {
        console.error('Error al cargar máquinas:', maquinasResult.reason);
      }
      if (testsResult.status === 'rejected') {
        console.error('Error al cargar pruebas:', testsResult.reason);
      }
      if (tecnicosResult.status === 'rejected') {
        console.error('Error al cargar técnicos:', tecnicosResult.reason);
      }
      if (materialiResult.status === 'rejected') {
        console.error('Error al cargar materiales:', materialiResult.reason);
      }

      const maquinasArray = Array.isArray(maquinas) ? maquinas : [];
      const testsArray = Array.isArray(tests) ? tests : [];
      // Filtrar técnicos: solo aquellos con rol 'tecnico' y estado 'aprobado'
      // Doble verificación para asegurar que solo se muestren técnicos válidos
      const tecnicosArray = Array.isArray(tecnicos) 
        ? tecnicos.filter(t => {
            // Si tiene usuario asociado, verificar rol y estado
            if (t.usuario) {
              return t.usuario.rol === 'tecnico' && t.usuario.estado === 'aprobado';
            }
            // Sin usuario asociado, no mostrar
            return false;
          })
        : [];
      const materialiArray = Array.isArray(materialiData) ? materialiData : [];
      
      // Guardar todas las máquinas, pruebas, técnicos y materiales para filtrar después
      setAllMaquinas(maquinasArray);
      setAllTests(testsArray);
      setAllTecnicos(tecnicosArray);
      setMateriali(materialiArray);

      const maquinasRecientes = maquinasArray.slice(-5).reverse();

      const maquinasPorEstado = {};
      maquinasArray.forEach((m) => {
        const stato = normalizarEstado(m.stato) || 'senza_stato';
        maquinasPorEstado[stato] = (maquinasPorEstado[stato] || 0) + 1;
      });

      const ora = new Date();
      // Crear fecha de inicio del mes en hora local (sin zona horaria)
      const inizioMese = new Date(ora.getFullYear(), ora.getMonth(), 1, 0, 0, 0, 0);
      
      const testsEsteMes = testsArray.filter((t) => {
        const dataTest = new Date(t.fecha_test);
        return dataTest >= inizioMese;
      }).length;

      const maquinasEsteMes = maquinasArray.filter((m) => {
        if (!m.data_consegna) return false;
        const dataConsegna = new Date(m.data_consegna);
        return dataConsegna >= inizioMese;
      }).length;

      const maquinasConTests = new Set(testsArray.map((t) => t.id_maquina)).size;
      const promedioTestsPorMaquina = maquinasConTests > 0 
        ? (testsArray.length / maquinasConTests).toFixed(1) 
        : 0;

      // Calcular máquinas con 2 pruebas válidas consecutivas (una sola vez para reutilizar)
      const maquinasConPruebasValidasIds = obtenerMaquinasConPruebasValidas(testsArray);
      
      // Calcular máquinas listas: estado "ok" o "completata" + 2 pruebas válidas + sin data_consegna
      const maquinasListas = maquinasArray.filter(m => {
        const estado = normalizarEstado(m.stato);
        const statoMapeado = estado === 'completata' ? 'ok' : estado;
        return statoMapeado === 'ok' && 
               maquinasConPruebasValidasIds.has(m.id_maquina) && 
               (m.data_consegna === null || m.data_consegna === undefined);
      }).length;
      
      // Calcular máquinas entregadas: 
      // 1. Con estado "consegnata" normalizado, O
      // 2. Con data_consegna (aunque no tengan el estado)
      const maquinasConsegnateArray = maquinasArray.filter(m => {
        const estado = normalizarEstado(m.stato);
        // Considerar entregada si tiene estado "consegnata" O si tiene data_consegna
        return estado === 'consegnata' || (m.data_consegna !== null && m.data_consegna !== undefined);
      });
      const maquinasConsegnate = maquinasConsegnateArray.length;
      
      // Calcular máquinas entregadas por mes (usando data_consegna)
      const maquinasConsegnatePorMes = {};
      
      maquinasConsegnateArray.forEach(m => {
        if (m.data_consegna) {
          const fecha = new Date(m.data_consegna);
          const mesAno = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
          const mesLabel = fecha.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
          
          if (!maquinasConsegnatePorMes[mesAno]) {
            maquinasConsegnatePorMes[mesAno] = {
              label: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
              count: 0,
              fecha: fecha
            };
          }
          maquinasConsegnatePorMes[mesAno].count++;
        }
      });
      
      // Ordenar por fecha (más reciente primero)
      const maquinasConsegnatePorMesOrdenadas = Object.entries(maquinasConsegnatePorMes)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 12); // Últimos 12 meses
      
      // Calcular máquinas entregadas en el mes actual
      const fechaActual = new Date();
      const mesAnoActual = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}`;
      const maquinasConsegnateEsteMes = maquinasConsegnatePorMes[mesAnoActual]?.count || 0;
      
      // Calcular máquinas terminadas pero no entregadas (completata mapeado a ok)
      const maquinasCompletateNonConsegnate = maquinasArray.filter(m => {
        const estado = normalizarEstado(m.stato);
        return estado === 'ok' || estado === 'completata';
      }).length;
      
      // Máquinas pendientes: todas excepto ok, completata y consegnata
      const maquinasPendientes = maquinasArray.filter(m => {
        const estado = normalizarEstado(m.stato);
        return estado !== 'ok' && estado !== 'completata' && estado !== 'consegnata';
      }).length;

      // Calcular pruebas listas (máquinas con al menos 2 pruebas completas que cumplan condiciones)
      const testsCompletos = testsArray.filter(t => 
        (t.tempo_0_gradi !== null && t.tempo_0_gradi !== undefined) && 
        (t.tempo_meno8_gradi !== null && t.tempo_meno8_gradi !== undefined)
      );
      
      // Agrupar pruebas por máquina
      const testsPorMaquina = {};
      testsCompletos.forEach(test => {
        if (!testsPorMaquina[test.id_maquina]) {
          testsPorMaquina[test.id_maquina] = [];
        }
        testsPorMaquina[test.id_maquina].push(test);
      });

      // Contar máquinas con al menos 2 pruebas que cumplan condiciones
      let testsListos = 0;
      Object.values(testsPorMaquina).forEach(tests => {
        if (tests.length >= 2) {
          const ultimas2Tests = tests.slice(-2);
          const cumplenCondiciones = ultimas2Tests.every(test => {
            const tiempo0 = test.tempo_0_gradi;
            const tiempoMenos8 = test.tempo_meno8_gradi;
            const cumple0Grados = tiempo0 <= TEST_LIMITS.TEMPO_0_GRADI_MAX;
            const cumpleMenos8Grados = tiempoMenos8 >= TEST_LIMITS.TEMPO_MENO8_GRADI_MIN && 
                                       tiempoMenos8 <= TEST_LIMITS.TEMPO_MENO8_GRADI_MAX;
            return cumple0Grados && cumpleMenos8Grados;
          });
          if (cumplenCondiciones) {
            testsListos++;
          }
        }
      });

      const testsPendientes = maquinasConTests - testsListos;
      // Máquinas que necesitan ser probadas: máquinas con menos de 2 pruebas
      const maquinasDaProvare = maquinasArray.filter(m => {
        const testsDeMaquina = testsArray.filter(t => t.id_maquina === m.id_maquina);
        return testsDeMaquina.length < 2;
      }).length;
      const porcentajeExito = maquinasConTests > 0 
        ? ((testsListos / maquinasConTests) * 100).toFixed(1)
        : 0;

      // Calcular máquinas pronte: estado "ok" o "completata" + 2 pruebas válidas + sin data_consegna
      // Reutilizar maquinasConPruebasValidasIds ya calculado arriba
      const maquinasPronteQuestoMese = maquinasArray.filter(m => {
        const estado = normalizarEstado(m.stato);
        const statoMapeado = estado === 'completata' ? 'ok' : estado;
        if (statoMapeado !== 'ok') return false;
        if (!maquinasConPruebasValidasIds.has(m.id_maquina)) return false;
        if (m.data_consegna !== null && m.data_consegna !== undefined) return false; // Ya entregadas
        return true; // Ya no filtramos por fecha_estado_ok del mes
      }).length;

      // Calcular máquinas con problemas: solo aquellas que NO cumplen con las condiciones de las pruebas
      // Una máquina tiene problemas si:
      // 1. Tiene estado "pendente" (siempre indica problemas) Y no está entregada
      // 2. Tiene 2 o más pruebas completas pero las últimas 2 NO cumplen las condiciones
      // EXCLUIR: máquinas entregadas (consegnata) y máquinas con estado "ok" que cumplen condiciones
      const maquinasConProblemi = maquinasArray.filter(m => {
        const estado = normalizarEstado(m.stato);
        
        // EXCLUIR: Máquinas entregadas no tienen problemas (ya fueron entregadas)
        if (estado === 'consegnata' || m.data_consegna !== null && m.data_consegna !== undefined) {
          return false;
        }
        
        // EXCLUIR: Máquinas con estado "ok" que cumplen condiciones (ya están listas)
        if (estado === 'ok') {
          // Verificar si realmente cumple las condiciones
          const testsCompletosMaquina = testsArray.filter(t => 
            t.id_maquina === m.id_maquina &&
            (t.tempo_0_gradi !== null && t.tempo_0_gradi !== undefined) &&
            (t.tempo_meno8_gradi !== null && t.tempo_meno8_gradi !== undefined)
          );
          
          if (testsCompletosMaquina.length >= 2) {
            const testsOrdenados = [...testsCompletosMaquina].sort((a, b) => {
              const fechaA = new Date(a.hora_test || a.fecha_test || 0);
              const fechaB = new Date(b.hora_test || b.fecha_test || 0);
              return fechaA - fechaB;
            });
            
            const ultimas2Tests = testsOrdenados.slice(-2);
            const cumplenCondiciones = ultimas2Tests.every(test => {
              const tiempo0 = test.tempo_0_gradi;
              const tiempoMenos8 = test.tempo_meno8_gradi;
              const cumple0Grados = tiempo0 <= TEST_LIMITS.TEMPO_0_GRADI_MAX;
              const cumpleMenos8Grados = tiempoMenos8 >= TEST_LIMITS.TEMPO_MENO8_GRADI_MIN && 
                                         tiempoMenos8 <= TEST_LIMITS.TEMPO_MENO8_GRADI_MAX;
              return cumple0Grados && cumpleMenos8Grados;
            });
            
            // Si cumple condiciones, NO tiene problemas
            if (cumplenCondiciones) {
              return false;
            }
          }
        }
        
        // Estado "pendente" siempre indica problemas (si no está entregada)
        if (estado === 'pendente') {
          return true;
        }
        
        // Obtener todas las pruebas completas de esta máquina
        const testsCompletosMaquina = testsArray.filter(t => 
          t.id_maquina === m.id_maquina &&
          (t.tempo_0_gradi !== null && t.tempo_0_gradi !== undefined) &&
          (t.tempo_meno8_gradi !== null && t.tempo_meno8_gradi !== undefined)
        );
        
        // Si tiene 2 o más pruebas completas, verificar si cumplen las condiciones
        if (testsCompletosMaquina.length >= 2) {
          // Ordenar los tests por fecha (más antiguo primero) para tomar las últimas 2 cronológicamente
          const testsOrdenados = [...testsCompletosMaquina].sort((a, b) => {
            const fechaA = new Date(a.hora_test || a.fecha_test || 0);
            const fechaB = new Date(b.hora_test || b.fecha_test || 0);
            return fechaA - fechaB; // Más antiguo primero
          });
          
          // Tomar las últimas 2 pruebas (más recientes)
          const ultimas2Tests = testsOrdenados.slice(-2);
          
          // Verificar si las últimas 2 pruebas cumplen las condiciones
          const cumplenCondiciones = ultimas2Tests.every(test => {
            const tiempo0 = test.tempo_0_gradi;
            const tiempoMenos8 = test.tempo_meno8_gradi;
            const cumple0Grados = tiempo0 <= TEST_LIMITS.TEMPO_0_GRADI_MAX;
            const cumpleMenos8Grados = tiempoMenos8 >= TEST_LIMITS.TEMPO_MENO8_GRADI_MIN && 
                                       tiempoMenos8 <= TEST_LIMITS.TEMPO_MENO8_GRADI_MAX;
            return cumple0Grados && cumpleMenos8Grados;
          });
          
          // Si NO cumplen las condiciones, tiene problemas
          if (!cumplenCondiciones) {
            return true;
          }
        }
        
        return false;
      }).length;

      setStats({
        totalMaquinas: maquinasArray.length,
        totalTests: testsArray.length,
        totalTecnicos: tecnicosArray.length,
        maquinasRecientes,
        maquinasPorEstado,
        maquinasListas,
        maquinasPendientes,
        testsListos,
        testsPendientes,
        maquinasDaProvare,
        porcentajeExito: parseFloat(porcentajeExito),
        promedioTestsPorMaquina: parseFloat(promedioTestsPorMaquina),
        maquinasConTests,
        maquinasConsegnate,
        maquinasConsegnateEsteMes,
        maquinasCompletateNonConsegnate,
        maquinasConsegnatePorMes: maquinasConsegnatePorMesOrdenadas,
        maquinasPronteQuestoMese,
        maquinasConProblemi,
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []); // Sin dependencias ya que solo se llama manualmente o al montar

  // useEffect para cargar datos al montar el componente
  useEffect(() => {
    loadStats();
    loadCurrentUser();
  }, [loadStats]);

  // Debounce del término de búsqueda para mejorar rendimiento
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchVistaDettagliata(searchVistaDettagliata);
    }, 300); // Esperar 300ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchVistaDettagliata]);

  /**
   * Mapeo de estados con iconos y colores
   * IMPORTANTE: Estos deben coincidir exactamente con los estados en Registros.jsx
   * "completata" se mapea a "ok" ya que son equivalentes
   */
  const estadoConfig = {
    'ok': { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'OK' },
    'in_produzione': { icon: FiPlay, color: 'text-blue-600', bg: 'bg-blue-100', label: 'In Produzione' },
    'consegnata': { icon: FiTruck, color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Consegnata' },
    'rientrate': { icon: FiRotateCw, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Rientrate' },
    'in_test': { icon: FiClock, color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'In Test' },
    'pendente': { icon: FiAlertCircle, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Pendente' },
    'completata': { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-100', label: 'OK' }, // Mapeado a OK
    'senza_stato': { icon: FiPackage, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Senza Stato' },
  };

  /**
   * Recalcula las tarjetas de estadísticas cada vez que stats cambie (usando useMemo para optimización)
   * IMPORTANTE: useMemo debe estar ANTES de los returns condicionales (reglas de Hooks)
   */
  // Función para manejar el click en las cards
  const handleCardClick = (tabId) => {
    setActiveTab(tabId);
    // Hacer scroll suave hacia las tabs después de un pequeño delay
    setTimeout(() => {
      const tabsElement = document.querySelector('[data-tabs-container]');
      if (tabsElement) {
        tabsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const statCards = useMemo(() => [
    {
      title: 'Pronte',
      value: stats.maquinasPronteQuestoMese || 0,
      subtitle: `Stato: OK`,
      icon: FiCheckCircle,
      gradient: 'from-green-500 to-emerald-600',
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      trend: stats.totalMaquinas > 0 ? ((stats.maquinasPronteQuestoMese / stats.totalMaquinas) * 100).toFixed(0) : 0,
      tabId: 'listas',
    },
    {
      title: 'Macchine Totali',
      value: stats.totalMaquinas || 0,
      subtitle: `Tutte le macchine fabbricate`,
      icon: FiPackage,
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: null,
      tabId: 'tutte',
    },
    {
      title: 'Da Provare',
      value: stats.maquinasDaProvare || 0,
      subtitle: `Senza 2 prove valide consecutive`,
      icon: FiAlertCircle,
      gradient: 'from-amber-500 to-amber-600',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      trend: stats.totalMaquinas > 0 ? ((stats.maquinasDaProvare / stats.totalMaquinas) * 100).toFixed(0) : 0,
      tabId: 'da_provare',
    },
    {
      title: 'Con Problemi',
      value: stats.maquinasConProblemi || 0,
      subtitle: `Non rispettano condizioni prove`,
      icon: FiAlertTriangle,
      gradient: 'from-red-500 to-red-600',
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      trend: stats.totalMaquinas > 0 ? ((stats.maquinasConProblemi / stats.totalMaquinas) * 100).toFixed(0) : 0,
      tabId: 'in_test', // Muestra máquinas que no cumplen las condiciones de las pruebas
    },
    {
      title: 'Rientrate',
      value: tabCounts.rientrate || 0,
      subtitle: `Stato: Rientrate`,
      icon: FiRotateCw,
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trend: stats.totalMaquinas > 0 ? ((tabCounts.rientrate / stats.totalMaquinas) * 100).toFixed(0) : 0,
      tabId: 'rientrate',
    },
  ], [stats.maquinasPronteQuestoMese, stats.totalMaquinas, stats.maquinasDaProvare, stats.maquinasConProblemi, tabCounts.rientrate]);

  if (loading) {
    return <LoadingSpinner message="Caricamento statistiche..." />;
  }

  if (error) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <p className="text-red-600 font-semibold mb-2">Errore di Connessione</p>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={loadStats} className="btn-primary">
            <FiRefreshCw className="inline w-4 h-4 mr-2" />
            Riprova
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="w-full max-w-full overflow-x-hidden" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="space-y-4 sm:space-y-4 lg:space-y-6 w-full max-w-full" style={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-2 sm:p-2 lg:p-3 rounded-lg shadow-md flex-shrink-0">
              <FiActivity className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                Dashboard
              </h2>
            </div>
          </div>
        </div>
        <button
          onClick={loadStats}
          className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all font-semibold text-gray-700 group w-full sm:w-auto justify-center text-sm sm:text-sm min-h-[44px]"
        >
          <FiRefreshCw className={`w-4 h-4 sm:w-4 sm:h-4 transition-transform group-hover:rotate-180 duration-500`} />
          <span>Aggiorna</span>
        </button>
      </div>

      {/* Avvisi di Stock di Materiali */}
      {materiali.length > 0 && !alertaStockNascosta && (() => {
        const materialiAgotados = materiali.filter(m => {
          const stockDisponible = (m.stock_comprado || 0) - (m.stock_utilizado || 0);
          return stockDisponible <= 0;
        });
        
        const materialiBajoStock = materiali.filter(m => {
          // Solo mostrar alerta si está activada para este material
          if (!m.activar_alerta) return false;
          
          const stockDisponible = (m.stock_comprado || 0) - (m.stock_utilizado || 0);
          
          // Si tiene stock_minimo configurado, usarlo; sino usar cálculo automático
          const stockMinimo = m.stock_minimo !== null && m.stock_minimo !== undefined
            ? m.stock_minimo
            : Math.max((m.stock_comprado || 0) * 0.2, 10);
          
          return stockDisponible > 0 && stockDisponible < stockMinimo;
        });

        const totalAlertas = materialiAgotados.length + materialiBajoStock.length;
        const esComercial = currentUser?.rol === 'comercial';

        if (totalAlertas > 0) {
          const tuttiMaterialiDaOrdinare = [...materialiAgotados, ...materialiBajoStock];
          
          return (
            <>
              <div 
                className={`${esComercial ? 'ring-2 ring-red-500' : ''} bg-white rounded-lg sm:rounded-xl shadow-lg border-2 hover:shadow-xl transition-all w-full ${
                  materialiAgotados.length > 0 ? 'border-red-500' : 'border-amber-500'
                }`}
                style={{ width: '100%', maxWidth: '100%' }}
              >
                <div className="p-3 sm:p-3 lg:p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1.5 sm:mb-2 gap-1.5">
                    <div 
                      onClick={() => setShowModalOrdini(true)}
                      className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0"
                    >
                      <div className={`${materialiAgotados.length > 0 ? 'bg-red-600' : 'bg-amber-600'} p-1.5 rounded-md flex-shrink-0`}>
                        <FiAlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-xs sm:text-sm lg:text-base font-bold ${materialiAgotados.length > 0 ? 'text-red-700' : 'text-amber-700'} truncate`}>
                          Avvisi di Stock
                        </h3>
                        <p className="text-xs sm:text-sm md:text-base text-gray-600 truncate">
                          {totalAlertas} material{totalAlertas !== 1 ? 'i' : 'e'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className={`${materialiAgotados.length > 0 ? 'bg-red-600' : 'bg-amber-600'} text-white px-1.5 sm:px-2 md:px-2.5 py-0.5 sm:py-1 md:py-1.5 rounded-md font-bold text-xs sm:text-sm md:text-base`}>
                        {totalAlertas}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAlertaStockNascosta(true);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Nascondi avviso"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Lista de Materiali */}
                  <div className="space-y-2 sm:space-y-3">
                    {materialiAgotados.length > 0 && (
                      <div>
                        <div className="text-xs sm:text-sm md:text-base font-semibold text-red-700 mb-1.5 sm:mb-2">
                          Esauriti ({materialiAgotados.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {materialiAgotados.slice(0, 5).map((m) => (
                            <span
                              key={m.id_materiale}
                              className="px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 lg:py-2 bg-red-100 text-red-800 font-semibold rounded-lg text-xs sm:text-sm md:text-base"
                            >
                              {m.cod_articolo}
                            </span>
                          ))}
                          {materialiAgotados.length > 5 && (
                            <span className="px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 lg:py-2 bg-red-100 text-red-800 font-semibold rounded-lg text-xs sm:text-sm md:text-base">
                              +{materialiAgotados.length - 5} altri
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {materialiBajoStock.length > 0 && (
                      <div>
                        <div className="text-xs sm:text-sm md:text-base font-semibold text-amber-700 mb-1.5 sm:mb-2">
                          Basso Stock ({materialiBajoStock.length})
                        </div>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {materialiBajoStock.slice(0, 5).map((m) => {
                            const stockDisponible = (m.stock_comprado || 0) - (m.stock_utilizado || 0);
                            return (
                              <span
                                key={m.id_materiale}
                                className="px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 lg:py-2 bg-amber-100 text-amber-800 font-semibold rounded-lg text-xs sm:text-sm md:text-base"
                              >
                                {m.cod_articolo} ({stockDisponible.toFixed(1)})
                              </span>
                            );
                          })}
                          {materialiBajoStock.length > 5 && (
                            <span className="px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 lg:py-2 bg-amber-100 text-amber-800 font-semibold rounded-lg text-xs sm:text-sm md:text-base">
                              +{materialiBajoStock.length - 5} altri
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botón de acción */}
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                    <div 
                      onClick={() => setShowModalOrdini(true)}
                      className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 ${materialiAgotados.length > 0 ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'} text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs sm:text-sm md:text-base w-full sm:w-auto justify-center`}
                    >
                      <FiShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-center">Clicca per vedere la lista completa e creare un ordine</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Lista Materiali da Ordinare */}
              {showModalOrdini && (
                <div 
                  className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    animation: 'backdropFadeIn 0.2s ease-out'
                  }}
                >
                  <div 
                    className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
                    style={{ 
                      animation: 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                      willChange: 'transform, opacity'
                    }}
                  >
                    {/* Header Modal */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        <div className={`${materialiAgotados.length > 0 ? 'bg-red-600' : 'bg-amber-600'} p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                          <FiShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                            Materiali da Riordinare
                          </h3>
                          <p className="text-xs sm:text-sm md:text-base text-gray-600 truncate">
                            {totalAlertas} materiale{totalAlertas !== 1 ? 'i' : ''} richiedono un nuovo ordine
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowModalOrdini(false);
                          setEditingStockId(null);
                          setStockTemp({});
                          setEditingStockMinimoId(null);
                          setStockMinimoTemp({});
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                      >
                        <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    </div>

                    {/* Lista Materiali */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 rounded-b-xl">
                      <div className="space-y-4">
                        {materialiAgotados.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <FiXCircle className="w-5 h-5 text-red-600" />
                              <h4 className="text-lg font-bold text-red-700">
                                Materiali Esauriti ({materialiAgotados.length})
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {materialiAgotados.map((m) => {
                                const isEditing = editingStockId === m.id_materiale;
                                const isAdmin = currentUser?.rol === 'admin';
                                return (
                                <div
                                  key={m.id_materiale}
                                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg gap-3 sm:gap-4"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold text-gray-900 text-sm sm:text-base truncate">{m.cod_articolo}</div>
                                    <div className="text-xs sm:text-sm md:text-base text-gray-600 line-clamp-2">{m.descrizione}</div>
                                    <div className="text-xs sm:text-sm md:text-base text-gray-500 mt-1">
                                      Fornitore: {m.fornitore || 'N/A'} | Unità: {m.unita_misura || 'pz'}
                                    </div>
                                  </div>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:flex-shrink-0">
                                      {/* Stock editable para admin */}
                                      <div className="flex items-center gap-2 w-full sm:w-auto">
                                        {isAdmin && (
                                          <>
                                            {isEditing ? (
                                              <>
                                                <label className="text-xs sm:text-sm md:text-base font-semibold text-gray-700 whitespace-nowrap">
                                                  Stock:
                                                </label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  step="0.01"
                                                  value={stockTemp[m.id_materiale] ?? (m.stock_comprado || 0)}
                                                  onChange={(e) => setStockTemp(prev => ({
                                                    ...prev,
                                                    [m.id_materiale]: e.target.value
                                                  }))}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                      handleUpdateStock(m.id_materiale, stockTemp[m.id_materiale] ?? m.stock_comprado);
                                                    } else if (e.key === 'Escape') {
                                                      setEditingStockId(null);
                                                      setStockTemp(prev => {
                                                        const newTemp = { ...prev };
                                                        delete newTemp[m.id_materiale];
                                                        return newTemp;
                                                      });
                                                    }
                                                  }}
                                                  className="w-24 px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                  autoFocus
                                                />
                                                <span className="text-xs sm:text-sm md:text-base text-gray-500">{m.unita_misura || 'pz'}</span>
                                                <button
                                                  onClick={() => handleUpdateStock(m.id_materiale, stockTemp[m.id_materiale] ?? m.stock_comprado)}
                                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                  title="Salva stock"
                                                >
                                                  <FiSave className="w-4 h-4" />
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingStockId(null);
                                                    setStockTemp(prev => {
                                                      const newTemp = { ...prev };
                                                      delete newTemp[m.id_materiale];
                                                      return newTemp;
                                                    });
                                                  }}
                                                  className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                                                  title="Annulla"
                                                >
                                                  <FiX className="w-4 h-4" />
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <div className="text-right sm:text-left">
                                                  <div className="text-xs sm:text-sm md:text-base font-bold text-red-700">
                                                    Stock: {(m.stock_comprado || 0).toFixed(2)} {m.unita_misura || 'pz'}
                                                  </div>
                                                  <div className="text-xs sm:text-sm md:text-base text-gray-500">Esaurito</div>
                                                </div>
                                                <button
                                                  onClick={() => {
                                                    setEditingStockId(m.id_materiale);
                                                    setStockTemp(prev => ({
                                                      ...prev,
                                                      [m.id_materiale]: m.stock_comprado || 0
                                                    }));
                                                  }}
                                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                  title="Modifica stock"
                                                >
                                                  <FiEdit2 className="w-4 h-4" />
                                                </button>
                                              </>
                                            )}
                                          </>
                                        )}
                                        {!isAdmin && (
                                    <div className="text-right sm:text-left">
                                      <div className="text-xs sm:text-sm md:text-base font-bold text-red-700">Stock: 0</div>
                                      <div className="text-xs sm:text-sm md:text-base text-gray-500">Esaurito</div>
                                    </div>
                                        )}
                                      </div>
                                      {/* Campo quantità per ordine */}
                                      <div className="flex items-center gap-2 w-full sm:w-auto">
                                      <label className="text-xs sm:text-sm md:text-base font-semibold text-gray-700 whitespace-nowrap hidden sm:block">
                                        Quantità:
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={quantitaMateriali[m.id_materiale] || ''}
                                        onChange={(e) => handleQuantitaChange(m.id_materiale, e.target.value)}
                                        placeholder="0"
                                        className="w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                      />
                                      <span className="text-xs sm:text-sm md:text-base text-gray-500 hidden sm:inline">{m.unita_misura || 'pz'}</span>
                                    </div>
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {materialiBajoStock.length > 0 && (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <FiAlertCircle className="w-5 h-5 text-amber-600" />
                              <h4 className="text-lg font-bold text-amber-700">
                                Materiali in Esaurimento ({materialiBajoStock.length})
                              </h4>
                            </div>
                            <div className="space-y-2">
                              {materialiBajoStock.map((m) => {
                                const stockDisponible = (m.stock_comprado || 0) - (m.stock_utilizado || 0);
                                const stockMinimo = m.stock_minimo !== null && m.stock_minimo !== undefined 
                                  ? m.stock_minimo 
                                  : Math.max((m.stock_comprado || 0) * 0.2, 10);
                                const isEditingMinimo = editingStockMinimoId === m.id_materiale;
                                const isAdmin = currentUser?.rol === 'admin';
                                return (
                                  <div
                                    key={m.id_materiale}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg gap-3 sm:gap-4"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-bold text-gray-900 text-sm sm:text-base truncate">{m.cod_articolo}</div>
                                      <div className="text-xs sm:text-sm md:text-base text-gray-600 line-clamp-2">{m.descrizione}</div>
                                      <div className="text-xs sm:text-sm md:text-base text-gray-500 mt-1">
                                        Fornitore: {m.fornitore || 'N/A'} | Unità: {m.unita_misura || 'pz'}
                                      </div>
                                    </div>
                                    <div className="flex flex-col gap-3 w-full sm:w-auto">
                                      {/* Stock disponible */}
                                      <div className="text-right sm:text-left">
                                        <div className="text-xs sm:text-sm md:text-base font-bold text-amber-700">
                                          Stock: {stockDisponible.toFixed(1)} {m.unita_misura || 'pz'}
                                        </div>
                                        <div className="text-xs sm:text-sm md:text-base text-gray-500">
                                          Minimo: {stockMinimo.toFixed(1)} | Basso stock
                                        </div>
                                      </div>
                                      
                                      {/* Stock minimo editable para admin */}
                                      {isAdmin && (
                                      <div className="flex items-center gap-2">
                                          {isEditingMinimo ? (
                                            <>
                                              <label className="text-xs sm:text-sm md:text-base font-semibold text-gray-700 whitespace-nowrap">
                                                Stock Minimo:
                                              </label>
                                              <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={stockMinimoTemp[m.id_materiale] ?? (m.stock_minimo ?? '')}
                                                onChange={(e) => setStockMinimoTemp(prev => ({
                                                  ...prev,
                                                  [m.id_materiale]: e.target.value
                                                }))}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    handleUpdateStockMinimo(m.id_materiale, stockMinimoTemp[m.id_materiale] ?? m.stock_minimo);
                                                  } else if (e.key === 'Escape') {
                                                    setEditingStockMinimoId(null);
                                                    setStockMinimoTemp(prev => {
                                                      const newTemp = { ...prev };
                                                      delete newTemp[m.id_materiale];
                                                      return newTemp;
                                                    });
                                                  }
                                                }}
                                                placeholder="Auto"
                                                className="w-24 px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                autoFocus
                                              />
                                              <span className="text-xs sm:text-sm md:text-base text-gray-500">{m.unita_misura || 'pz'}</span>
                                              <button
                                                onClick={() => handleUpdateStockMinimo(m.id_materiale, stockMinimoTemp[m.id_materiale] ?? m.stock_minimo)}
                                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                                title="Salva stock minimo"
                                              >
                                                <FiSave className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setEditingStockMinimoId(null);
                                                  setStockMinimoTemp(prev => {
                                                    const newTemp = { ...prev };
                                                    delete newTemp[m.id_materiale];
                                                    return newTemp;
                                                  });
                                                }}
                                                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"
                                                title="Annulla"
                                              >
                                                <FiX className="w-4 h-4" />
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <div className="text-xs sm:text-sm md:text-base text-gray-600">
                                                Minimo: {stockMinimo.toFixed(1)} {m.unita_misura || 'pz'}
                                              </div>
                                              <button
                                                onClick={() => {
                                                  setEditingStockMinimoId(m.id_materiale);
                                                  setStockMinimoTemp(prev => ({
                                                    ...prev,
                                                    [m.id_materiale]: m.stock_minimo ?? ''
                                                  }));
                                                }}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Modifica stock minimo"
                                              >
                                                <FiEdit2 className="w-4 h-4" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Campo quantità per ordine */}
                                      <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <label className="text-xs font-semibold text-gray-700 whitespace-nowrap hidden sm:block">
                                          Quantità:
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          value={quantitaMateriali[m.id_materiale] || ''}
                                          onChange={(e) => handleQuantitaChange(m.id_materiale, e.target.value)}
                                          placeholder="0"
                                          className="w-20 sm:w-24 px-2 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        />
                                        <span className="text-xs sm:text-sm md:text-base text-gray-500 hidden sm:inline">{m.unita_misura || 'pz'}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Modal */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
                      <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                        <span className="font-semibold">Totale:</span> {totalAlertas} materiale{totalAlertas !== 1 ? 'i' : ''}
                        {Object.values(quantitaMateriali).filter(q => q > 0).length > 0 && (
                          <span className="ml-2 text-primary-600 font-semibold">
                            • {Object.values(quantitaMateriali).filter(q => q > 0).length} con quantità
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <button
                          onClick={() => {
                            setShowModalOrdini(false);
                            setQuantitaMateriali({});
                            setEditingStockId(null);
                            setStockTemp({});
                            setEditingStockMinimoId(null);
                            setStockMinimoTemp({});
                          }}
                          className="flex-1 sm:flex-none px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-colors text-sm sm:text-base"
                        >
                          Chiudi
                        </button>
                        <button
                          onClick={() => crearOrdineDaMateriali(tuttiMaterialiDaOrdinare)}
                          disabled={creandoOrdine || Object.values(quantitaMateriali).filter(q => q > 0).length === 0}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                          <FiShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="hidden sm:inline">
                            {creandoOrdine 
                              ? 'Creazione in corso...' 
                              : `Crea Ordine (${Object.values(quantitaMateriali).filter(q => q > 0).length || 0} materiali)`
                            }
                          </span>
                          <span className="sm:hidden">
                            {creandoOrdine ? 'Creazione...' : 'Crea Ordine'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          );
        }
        return null;
      })()}

      {/* Botón para mostrar alerta oculta */}
      {materiali.length > 0 && alertaStockNascosta && (() => {
        const materialiAgotados = materiali.filter(m => {
          const stockDisponible = (m.stock_comprado || 0) - (m.stock_utilizado || 0);
          return stockDisponible <= 0;
        });
        
        const materialiBajoStock = materiali.filter(m => {
          // Solo mostrar alerta si está activada para este material
          if (!m.activar_alerta) return false;
          
          const stockDisponible = (m.stock_comprado || 0) - (m.stock_utilizado || 0);
          
          // Si tiene stock_minimo configurado, usarlo; sino usar cálculo automático
          const stockMinimo = m.stock_minimo !== null && m.stock_minimo !== undefined
            ? m.stock_minimo
            : Math.max((m.stock_comprado || 0) * 0.2, 10);
          
          return stockDisponible > 0 && stockDisponible < stockMinimo;
        });

        const totalAlertas = materialiAgotados.length + materialiBajoStock.length;

        if (totalAlertas > 0) {
          return (
            <button
              onClick={() => setAlertaStockNascosta(false)}
              className="w-full p-3 sm:p-4 bg-gray-100 hover:bg-gray-200 rounded-xl border-2 border-dashed border-gray-300 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-gray-700 font-semibold text-xs sm:text-sm md:text-base"
            >
              <FiAlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 flex-shrink-0" />
              <span className="text-center">Mostra Avvisi di Stock ({totalAlertas} material{totalAlertas !== 1 ? 'i' : 'e'})</span>
            </button>
          );
        }
        return null;
      })()}

      {/* Stat Cards */}
      <div className="w-full max-w-full overflow-hidden">
        {/* Primera fila: 3 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 mb-3 sm:mb-4 lg:mb-5">
          {statCards.slice(0, 3).map((card, index) => (
            <StatCard
              key={`${card.title}-${stats.maquinasConsegnate}-${index}`}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              gradient={card.gradient}
              iconBg={card.iconBg}
              iconColor={card.iconColor}
              trend={card.trend}
              onClick={() => handleCardClick(card.tabId)}
            />
          ))}
        </div>
        {/* Segunda fila: 2 cards centradas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 lg:gap-5 max-w-5xl mx-auto">
          {/* Las 2 cards centradas - ocupan columnas 2-3 y 4-5 en pantallas grandes */}
          {statCards.slice(3).map((card, index) => (
            <div 
              key={`${card.title}-${stats.maquinasConsegnate}-${index + 3}`}
              className={index === 0 ? 'md:col-start-2 md:col-span-2' : 'md:col-span-2'}
            >
              <StatCard
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                gradient={card.gradient}
                iconBg={card.iconBg}
                iconColor={card.iconColor}
                trend={card.trend}
                onClick={() => handleCardClick(card.tabId)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Macchine Consegnate per Mese */}
      {stats.maquinasConsegnatePorMes && stats.maquinasConsegnatePorMes.length > 0 && (
        <div className="card w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 sm:mb-3 lg:mb-4 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="bg-indigo-50/50 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
                <FiTruck className="w-5 h-5 sm:w-5 sm:h-6 text-indigo-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-base lg:text-xl font-semibold text-gray-900 truncate">Consegnate per Mese</h3>
                <p className="text-xs sm:text-xs text-gray-500 hidden sm:block">Distribuzione mensile delle consegne</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3 w-full max-w-full">
            {stats.maquinasConsegnatePorMes.map(([mesAno, data]) => {
              const porcentaje = stats.maquinasConsegnate > 0 
                ? (data.count / stats.maquinasConsegnate) * 100 
                : 0;
              
              return (
                <div key={mesAno} className="w-full max-w-full p-3 sm:p-3 rounded-lg bg-gray-50/30 border border-gray-100">
                  <div className="flex items-center justify-between gap-2 mb-1.5 w-full max-w-full">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <div className="bg-indigo-100/70 p-1 sm:p-1.5 rounded flex-shrink-0">
                        <FiCalendar className="w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4 text-indigo-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs sm:text-sm md:text-base font-medium text-gray-900 truncate">
                            {data.label}
                          </span>
                          <span className="text-[10px] sm:text-xs md:text-sm text-gray-500 font-medium flex-shrink-0">
                            {porcentaje.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs sm:text-sm md:text-base font-semibold text-indigo-700">{data.count}</span>
                      <span className="text-[9px] sm:text-xs md:text-sm text-gray-400 block">macchine</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-1.5 sm:h-2 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 w-full max-w-full overflow-hidden">
        {/* Distribuzione per Stato */}
        <div className="card w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 sm:mb-3 lg:mb-4 gap-2">
            <h3 className="text-base sm:text-base lg:text-lg font-semibold text-gray-900 truncate flex-1 min-w-0">Distribuzione per Stato</h3>
            <div className="bg-primary-50/50 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <FiBarChart2 className="w-3.5 h-3.5 sm:w-4 sm:h-5 text-primary-600" />
            </div>
          </div>
          {Object.keys(stats.maquinasPorEstado).length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <FiPackage className="w-10 h-10 sm:w-12 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-3" />
              <p className="text-gray-500 font-normal text-xs sm:text-sm md:text-base">Nessun dato disponibile</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-2.5 w-full max-w-full">
              {Object.entries(stats.maquinasPorEstado)
                .sort(([, a], [, b]) => b - a)
                .map(([stato, count]) => {
                  const percentuale = stats.totalMaquinas > 0 
                    ? (count / stats.totalMaquinas) * 100 
                    : 0;
                  const statoNormalizado = normalizarEstado(stato);
                  const config = estadoConfig[statoNormalizado] || { 
                    icon: FiPackage, 
                    color: 'text-gray-600', 
                    bg: 'bg-gray-100',
                    label: stato || 'Senza stato'
                  };
                  const Icon = config.icon;
                  
                  // Colores específicos para las barras de progreso según la imagen
                  let barColorClass = 'bg-gray-500';
                  if (statoNormalizado === 'consegnata') {
                    barColorClass = 'bg-blue-500';
                  } else if (statoNormalizado === 'in_test') {
                    barColorClass = 'bg-yellow-500'; // Mismo color que el icono amarillo
                  } else if (statoNormalizado === 'ok' || statoNormalizado === 'completata') {
                    barColorClass = 'bg-green-500';
                  } else {
                    // Para otros estados, usar el color del config
                    barColorClass = config.bg.replace('100', '500');
                  }
                  
                  return (
                    <div key={stato} className="w-full max-w-full p-3 sm:p-3 rounded-lg bg-white border border-gray-100">
                      <div className="flex items-center justify-between gap-2 mb-2 w-full max-w-full">
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-1 min-w-0">
                          <div className={`${config.bg} p-1.5 sm:p-2 rounded-lg flex-shrink-0`}>
                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                {config.label}
                              </span>
                              <span className="text-xs sm:text-sm text-gray-500 font-medium flex-shrink-0">
                                {percentuale.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <span className="text-sm sm:text-base font-semibold text-gray-900">{count}</span>
                          <span className="text-xs text-gray-400 block">macchine</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`${barColorClass} h-2 rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${percentuale}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Macchine Recenti */}
        <div className="card w-full max-w-full overflow-hidden">
          <div className="flex items-center justify-between mb-4 sm:mb-3 lg:mb-4 gap-2">
            <h3 className="text-base sm:text-base lg:text-lg font-semibold text-gray-900 truncate flex-1 min-w-0">Macchine Recenti</h3>
            <Link 
              to="/registros"
              className="text-xs sm:text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors flex-shrink-0"
            >
              <span className="hidden sm:inline">Vedi tutte</span>
              <span className="sm:hidden">Tutte</span>
              <FiTrendingUp className="w-3.5 h-3.5" />
            </Link>
          </div>
          {stats.maquinasRecientes.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <FiPackage className="w-10 h-10 sm:w-12 sm:h-16 text-gray-300 mx-auto mb-2 sm:mb-3" />
              <p className="text-gray-500 font-normal mb-2 text-xs sm:text-sm">Nessuna macchina registrata</p>
              <Link 
                to="/registros"
                className="text-[10px] sm:text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Registra →
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-2.5 w-full max-w-full">
              {stats.maquinasRecientes.map((maquina) => {
                const statoNormalizado = normalizarEstado(maquina.stato);
                const estado = estadoConfig[statoNormalizado] || { 
                  icon: FiPackage, 
                  color: 'text-gray-600', 
                  bg: 'bg-gray-100',
                  label: maquina.stato || 'Senza stato'
                };
                const EstadoIcon = estado.icon;
                const numTests = allTests.filter(t => t.id_maquina === maquina.id_maquina).length;
                
                // Determinar el color del badge según el estado
                let badgeBg = 'bg-purple-200';
                let badgeTextColor = 'text-white';
                
                // Para otros estados usar los colores del config
                if (statoNormalizado !== 'consegnata') {
                  badgeBg = estado.bg;
                  badgeTextColor = estado.color;
                }
                
                return (
                  <Link
                    key={maquina.id_maquina}
                    to="/registros"
                    className="block w-full max-w-full p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 w-full max-w-full">
                      {/* Icono de camión a la izquierda */}
                      <div className="bg-blue-100 p-2 rounded-lg flex-shrink-0">
                        <FiTruck className="w-5 h-5 text-blue-500" />
                      </div>
                      
                      {/* Contenido principal */}
                      <div className="flex-1 min-w-0">
                        {/* Fila superior: ID y Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h4 className="text-base font-bold text-gray-900">
                            {maquina.numero_telaio}
                          </h4>
                          {estado && (
                            <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${badgeBg} ${badgeTextColor} flex-shrink-0`}>
                              <span className="text-xs font-medium">{estado.label}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Fila inferior: Detalles */}
                        <div className="flex items-center gap-4">
                          {maquina.tipo_gas && (
                            <div className="flex items-center gap-1.5">
                              <FiDroplet className="w-4 h-4 text-blue-400 flex-shrink-0" />
                              <span className="text-sm font-normal text-gray-700">{maquina.tipo_gas}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <FiCheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm font-normal text-gray-700">
                              {numTests} test
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Icono de tendencia a la derecha */}
                      <div className="text-gray-300 flex-shrink-0">
                        <FiTrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>


      {/* Vista de Máquinas por Estado */}
      <div className="card p-4 sm:p-4 lg:p-6 w-full max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 lg:mb-6 gap-2 sm:gap-3 lg:gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Vista Dettagliata Macchine</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">
              Filtra e visualizza le macchine per stato o categoria
            </p>
          </div>
          <Link 
            to="/registros"
            className="text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors flex-shrink-0"
          >
            <span className="hidden sm:inline">Vedi tutte</span>
            <span className="sm:hidden">Tutte</span>
            <FiTrendingUp className="w-4 h-4 sm:w-4 sm:h-4" />
          </Link>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-4 sm:mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Cerca per numero telaio, tipo gas o seriale..."
              value={searchVistaDettagliata}
              onChange={(e) => setSearchVistaDettagliata(e.target.value)}
              className="w-full pl-10 sm:pl-10 pr-10 sm:pr-4 py-2.5 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm sm:text-base"
            />
            {searchVistaDettagliata && (
              <button
                onClick={() => setSearchVistaDettagliata('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX className="w-4 h-4 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div data-tabs-container className="overflow-x-auto mb-3 sm:mb-4 lg:mb-6 border-b border-gray-200 pb-2 scrollbar-hide -mx-3 sm:-mx-0 px-3 sm:px-0 max-w-full">
          <div className="flex gap-1.5 sm:gap-2 min-w-max sm:flex-wrap sm:min-w-0">
          {[
            { id: 'listas', label: 'Pronte', icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', borderColor: 'border-green-600' },
            { id: 'consegnata', label: 'Consegnate', icon: FiTruck, color: 'text-indigo-600', bg: 'bg-indigo-50', borderColor: 'border-indigo-600' },
            { id: 'da_provare', label: 'Da Provare', icon: FiAlertCircle, color: 'text-red-600', bg: 'bg-red-50', borderColor: 'border-red-600' },
            { id: 'in_produzione', label: 'In Produzione', icon: FiPlay, color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-600' },
            { id: 'in_test', label: 'In Test', icon: FiClock, color: 'text-yellow-600', bg: 'bg-yellow-50', borderColor: 'border-yellow-600' },
            { id: 'rientrate', label: 'Rientrate', icon: FiRotateCw, color: 'text-purple-600', bg: 'bg-purple-50', borderColor: 'border-purple-600' },
            { id: 'tutte', label: 'Tutte', icon: FiPackage, color: 'text-gray-600', bg: 'bg-gray-50', borderColor: 'border-gray-600' },
          ].map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            const tabCount = tabCounts[tab.id] || 0;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-4 py-1.5 sm:py-2 md:py-2.5 font-semibold rounded-lg transition-all relative whitespace-nowrap text-xs sm:text-sm md:text-base min-h-[44px] ${
                  isActive
                    ? `${tab.bg} ${tab.color} border-2 ${tab.borderColor} shadow-sm`
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-4 md:h-4 flex-shrink-0" />
                <span className="hidden min-[375px]:inline">{tab.label}</span>
                <span className="min-[375px]:hidden text-xs">{tab.label.length > 8 ? tab.label.substring(0, 6) + '...' : tab.label}</span>
                <span className={`ml-0.5 sm:ml-1 px-1 sm:px-1.5 md:px-2 py-0.5 rounded-full text-xs sm:text-sm md:text-base font-bold flex-shrink-0 ${
                  isActive 
                    ? 'bg-white/80 text-gray-700' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {tabCount}
                </span>
              </button>
            );
          })}
          </div>
        </div>

        {/* Contenido de las tabs */}
        <div className="mt-4">
          {(() => {
            let maquinasFiltradas = [];
            
            if (activeTab === 'listas') {
              // Máquinas pronte: stato "ok" o "completata" + 2 pruebas válidas consecutivas + sin data_consegna
              const maquinasConPruebasValidasIds = obtenerMaquinasConPruebasValidas(allTests);
              maquinasFiltradas = allMaquinas.filter(m => {
                const estado = normalizarEstado(m.stato);
                const statoMapeado = estado === 'completata' ? 'ok' : estado;
                return statoMapeado === 'ok' && 
                       maquinasConPruebasValidasIds.has(m.id_maquina) && 
                       (m.data_consegna === null || m.data_consegna === undefined);
              });
            } else if (activeTab === 'consegnata') {
              // Máquinas entregadas: stato "consegnata" o con data_consegna
              maquinasFiltradas = allMaquinas.filter(m => {
                const estado = normalizarEstado(m.stato);
                return estado === 'consegnata' || (m.data_consegna !== null && m.data_consegna !== undefined);
              });
            } else if (activeTab === 'da_provare') {
              // Máquinas con menos de 2 pruebas
              maquinasFiltradas = allMaquinas.filter(m => {
                const testsDeMaquina = allTests.filter(t => t.id_maquina === m.id_maquina);
                return testsDeMaquina.length < 2;
              });
            } else if (activeTab === 'in_produzione') {
              // Máquinas en producción
              maquinasFiltradas = allMaquinas.filter(m => normalizarEstado(m.stato) === 'in_produzione');
            } else if (activeTab === 'in_test') {
              // Máquinas con problemas: solo aquellas que NO cumplen con las condiciones de las pruebas
              // (Este tab se activa desde la card "Con Problemi")
              maquinasFiltradas = allMaquinas.filter(m => {
                const estado = normalizarEstado(m.stato);
                
                // EXCLUIR: Máquinas entregadas no tienen problemas (ya fueron entregadas)
                if (estado === 'consegnata' || m.data_consegna !== null && m.data_consegna !== undefined) {
                  return false;
                }
                
                // EXCLUIR: Máquinas con estado "ok" que cumplen condiciones (ya están listas)
                if (estado === 'ok') {
                  // Verificar si realmente cumple las condiciones
                  const testsCompletosMaquina = allTests.filter(t => 
                    t.id_maquina === m.id_maquina &&
                    (t.tempo_0_gradi !== null && t.tempo_0_gradi !== undefined) &&
                    (t.tempo_meno8_gradi !== null && t.tempo_meno8_gradi !== undefined)
                  );
                  
                  if (testsCompletosMaquina.length >= 2) {
                    const testsOrdenados = [...testsCompletosMaquina].sort((a, b) => {
                      const fechaA = new Date(a.hora_test || a.fecha_test || 0);
                      const fechaB = new Date(b.hora_test || b.fecha_test || 0);
                      return fechaA - fechaB;
                    });
                    
                    const ultimas2Tests = testsOrdenados.slice(-2);
                    const cumplenCondiciones = ultimas2Tests.every(test => {
                      const tiempo0 = test.tempo_0_gradi;
                      const tiempoMenos8 = test.tempo_meno8_gradi;
                      const cumple0Grados = tiempo0 <= TEST_LIMITS.TEMPO_0_GRADI_MAX;
                      const cumpleMenos8Grados = tiempoMenos8 >= TEST_LIMITS.TEMPO_MENO8_GRADI_MIN && 
                                                 tiempoMenos8 <= TEST_LIMITS.TEMPO_MENO8_GRADI_MAX;
                      return cumple0Grados && cumpleMenos8Grados;
                    });
                    
                    // Si cumple condiciones, NO tiene problemas
                    if (cumplenCondiciones) {
                      return false;
                    }
                  }
                }
                
                // Estado "pendente" siempre indica problemas (si no está entregada)
                if (estado === 'pendente') {
                  return true;
                }
                
                // Obtener todas las pruebas completas de esta máquina
                const testsCompletosMaquina = allTests.filter(t => 
                  t.id_maquina === m.id_maquina &&
                  (t.tempo_0_gradi !== null && t.tempo_0_gradi !== undefined) &&
                  (t.tempo_meno8_gradi !== null && t.tempo_meno8_gradi !== undefined)
                );
                
                // Si tiene 2 o más pruebas completas, verificar si cumplen las condiciones
                if (testsCompletosMaquina.length >= 2) {
                  // Ordenar los tests por fecha (más antiguo primero) para tomar las últimas 2 cronológicamente
                  const testsOrdenados = [...testsCompletosMaquina].sort((a, b) => {
                    const fechaA = new Date(a.hora_test || a.fecha_test || 0);
                    const fechaB = new Date(b.hora_test || b.fecha_test || 0);
                    return fechaA - fechaB; // Más antiguo primero
                  });
                  
                  // Tomar las últimas 2 pruebas (más recientes)
                  const ultimas2Tests = testsOrdenados.slice(-2);
                  
                  // Verificar si las últimas 2 pruebas cumplen las condiciones
                  const cumplenCondiciones = ultimas2Tests.every(test => {
                    const tiempo0 = test.tempo_0_gradi;
                    const tiempoMenos8 = test.tempo_meno8_gradi;
                    const cumple0Grados = tiempo0 <= TEST_LIMITS.TEMPO_0_GRADI_MAX;
                    const cumpleMenos8Grados = tiempoMenos8 >= TEST_LIMITS.TEMPO_MENO8_GRADI_MIN && 
                                               tiempoMenos8 <= TEST_LIMITS.TEMPO_MENO8_GRADI_MAX;
                    return cumple0Grados && cumpleMenos8Grados;
                  });
                  
                  // Si NO cumplen las condiciones, tiene problemas
                  if (!cumplenCondiciones) {
                    return true;
                  }
                }
                
                return false;
              });
            } else if (activeTab === 'rientrate') {
              // Máquinas rientrate
              maquinasFiltradas = allMaquinas.filter(m => normalizarEstado(m.stato) === 'rientrate');
            } else if (activeTab === 'tutte') {
              maquinasFiltradas = allMaquinas;
            } else {
              // Filtrar por estado específico
              maquinasFiltradas = allMaquinas.filter(m => normalizarEstado(m.stato) === activeTab);
            }

            // Aplicar búsqueda si hay texto (usa debouncedSearchVistaDettagliata para mejor rendimiento)
            if (debouncedSearchVistaDettagliata) {
              const searchLower = debouncedSearchVistaDettagliata.toLowerCase();
              maquinasFiltradas = maquinasFiltradas.filter(m => 
                m.numero_telaio?.toLowerCase().includes(searchLower) ||
                m.tipo_gas?.toLowerCase().includes(searchLower) ||
                m.seriale_compressore?.toLowerCase().includes(searchLower)
              );
            }

            // Ordenar por paso (estado) y luego por numero_telaio (crear copia antes de ordenar)
            maquinasFiltradas = [...maquinasFiltradas].sort((a, b) => {
              const ordenA = obtenerOrdenEstado(a.stato);
              const ordenB = obtenerOrdenEstado(b.stato);
              
              // Primero por orden de estado (paso del proceso)
              if (ordenA !== ordenB) {
                return ordenA - ordenB;
              }
              
              // Si tienen el mismo estado, ordenar por numero_telaio
              const numA = parseInt(a.numero_telaio) || 0;
              const numB = parseInt(b.numero_telaio) || 0;
              
              if (numA !== 0 && numB !== 0) {
                return numA - numB;
              } else if (numA !== 0) {
                return -1;
              } else if (numB !== 0) {
                return 1;
              } else {
                return a.numero_telaio.localeCompare(b.numero_telaio);
              }
            });

            if (maquinasFiltradas.length === 0) {
              return (
                <div className="text-center py-12">
                  <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium mb-2">
                    {debouncedSearchVistaDettagliata 
                      ? 'Nessuna macchina trovata con la ricerca' 
                      : 'Nessuna macchina in questa categoria'}
                  </p>
                  {debouncedSearchVistaDettagliata && (
                    <button
                      onClick={() => setSearchVistaDettagliata('')}
                      className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
                    >
                      Cancella ricerca
                    </button>
                  )}
                </div>
              );
            }

            return (
              <>
                {/* Contador de resultados */}
                <div className="mb-3 sm:mb-4 flex items-center justify-between">
                  <p className="text-xs sm:text-sm md:text-base text-gray-600">
                    <span className="font-semibold text-gray-900">{maquinasFiltradas.length}</span> macchina{maquinasFiltradas.length !== 1 ? 'e' : ''} trovata{maquinasFiltradas.length !== 1 ? 'e' : ''}
                    {debouncedSearchVistaDettagliata && (
                      <span className="ml-1 sm:ml-2 text-gray-500 hidden sm:inline">per "{debouncedSearchVistaDettagliata}"</span>
                    )}
                  </p>
                </div>
                
                {/* Grid responsive que funciona en móvil y desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 w-full max-w-full overflow-hidden">
                  {maquinasFiltradas.map((maquina) => {
                    const statoNormalizado = normalizarEstado(maquina.stato);
                    const estado = estadoConfig[statoNormalizado] || { 
                      icon: FiPackage, 
                      color: 'text-gray-600', 
                      bg: 'bg-gray-100',
                      label: maquina.stato || 'Senza stato'
                    };
                    const EstadoIcon = estado.icon;
                    const numTests = allTests.filter(t => t.id_maquina === maquina.id_maquina).length;
                    const ultimaPrueba = obtenerUltimaPrueba(maquina);
                    const tecnico = maquina.tecnico;
                    // Obtener técnico del test: primero intentar desde la relación, luego buscar en la lista usando id_tecnico
                    let tecnicoTest = null;
                    if (ultimaPrueba) {
                      // Si viene el objeto técnico completo, usarlo
                      if (ultimaPrueba.tecnico && ultimaPrueba.tecnico.nome && ultimaPrueba.tecnico.cognome) {
                        tecnicoTest = ultimaPrueba.tecnico;
                      } 
                      // Si no, buscar por id_tecnico en la lista de técnicos
                      else if (ultimaPrueba.id_tecnico) {
                        tecnicoTest = allTecnicos.find(t => t.id_tecnico === ultimaPrueba.id_tecnico) || null;
                      }
                    }
                    
                    return (
                      <Link
                        key={maquina.id_maquina}
                        to="/registros"
                        className="block p-4 lg:p-5 rounded-xl border-2 border-gray-300 hover:border-primary-500 hover:shadow-2xl transition-all duration-300 group bg-white shadow-md hover:shadow-xl w-full max-w-full min-w-0"
                      >
                        {/* Header con número de telaio */}
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`${estado.bg} p-2.5 lg:p-3 rounded-xl group-hover:scale-110 transition-transform shadow-md flex-shrink-0 border border-gray-200`}>
                              <EstadoIcon className={`w-5 h-5 ${estado.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 text-lg lg:text-xl mb-1 truncate">
                                {maquina.numero_telaio}
                              </h4>
                              {maquina.tipo_gas && (
                                <p className="text-sm text-gray-600 font-semibold truncate">{maquina.tipo_gas}</p>
                              )}
                              {maquina.seriale_compressore && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate font-medium">
                                  {maquina.seriale_compressore}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-400 group-hover:text-primary-600 transition-colors flex-shrink-0">
                            <FiTrendingUp className="w-5 h-5" />
                          </div>
                        </div>
                        
                        {/* Badge de Estado */}
                        <div className="mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg ${estado.bg} ${estado.color} shadow-sm`}>
                            <EstadoIcon className="w-3.5 h-3.5" />
                            {estado.label}
                          </span>
                        </div>
                        
                        {/* Información detallada */}
                        <div className="space-y-2.5 pt-2.5 border-t-2 border-gray-300">
                          {tecnico && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                                <FiUser className="w-4 h-4" />
                                Tecnico:
                              </span>
                              <span className="text-xs font-semibold text-gray-700 truncate text-right min-w-0 flex-1">
                                {tecnico.nome} {tecnico.cognome}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                              <FiActivity className="w-4 h-4" />
                              Test:
                            </span>
                            <span className="text-sm font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded flex-shrink-0">
                              {numTests}
                            </span>
                          </div>
                          
                          {maquina.fecha_primera_prueba && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                                <FiCalendar className="w-4 h-4" />
                                Prima prova:
                              </span>
                              <span className="text-xs font-semibold text-gray-700 truncate text-right">
                                {new Date(maquina.fecha_primera_prueba).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                          )}
                          
                          {maquina.fecha_estado_ok && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                                <FiCheckCircle className="w-4 h-4" />
                                Data OK:
                              </span>
                              <span className="text-xs font-semibold text-green-700 truncate text-right">
                                {new Date(maquina.fecha_estado_ok).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                          )}
                          
                          {ultimaPrueba && (ultimaPrueba.tempo_0_gradi || ultimaPrueba.tempo_meno8_gradi) && (
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                                  <FiClock className="w-4 h-4" />
                                  Ultima prova:
                                </span>
                                <div className="flex flex-col items-end min-w-0 flex-1">
                                  <span className="text-xs font-mono font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded whitespace-nowrap">
                                    {segundosAMinutosSegundos(ultimaPrueba.tempo_0_gradi)} / {segundosAMinutosSegundos(ultimaPrueba.tempo_meno8_gradi)}
                                  </span>
                                  <span className="text-xs text-gray-400 mt-0.5">0°C / -8°C</span>
                                </div>
                              </div>
                              {ultimaPrueba.fecha_test && (
                                <div className="text-xs text-gray-400 text-right mt-0.5">
                                  {new Date(ultimaPrueba.fecha_test).toLocaleDateString('it-IT')}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {ultimaPrueba && (
                            <>
                              {/* Tecnico test - siempre mostrar si hay última prueba */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                                <FiUser className="w-4 h-4" />
                                Tecnico test:
                              </span>
                              <span className="text-xs font-semibold text-gray-700 truncate text-right min-w-0 flex-1">
                                  {tecnicoTest 
                                    ? `${tecnicoTest.nome} ${tecnicoTest.cognome}`
                                    : '-'}
                              </span>
                            </div>
                          
                              {/* Temp. iniziale - siempre mostrar si hay última prueba */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                                <FiThermometer className="w-4 h-4" />
                                Temp. iniziale:
                              </span>
                              <span className="text-xs font-semibold text-gray-700">
                                  {ultimaPrueba.temperatura_iniziale !== null && ultimaPrueba.temperatura_iniziale !== undefined
                                    ? `${ultimaPrueba.temperatura_iniziale}°C`
                                    : '-'}
                              </span>
                            </div>
                          
                              {/* Regolazione - siempre mostrar si hay última prueba */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                                <FiSettings className="w-4 h-4" />
                                Regolazione:
                              </span>
                              <span className="text-xs font-semibold text-gray-700 truncate text-right">
                                  {ultimaPrueba.regolazione_vite && ultimaPrueba.regolazione_vite.trim() !== ''
                                    ? ultimaPrueba.regolazione_vite
                                    : '-'}
                              </span>
                            </div>
                            </>
                          )}
                          
                          {maquina.quantita_gas && (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                              <span className="text-xs font-medium text-gray-600 flex-shrink-0">
                                Gas refrigerante:
                              </span>
                              <span className="text-sm font-semibold text-gray-900">{maquina.quantita_gas} g</span>
                            </div>
                          )}

                          {maquina.data_consegna && (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                              <span className="text-xs font-medium text-gray-600 flex items-center gap-1 flex-shrink-0">
                                <FiTruck className="w-4 h-4" />
                                Consegna:
                              </span>
                              {(() => {
                                const dataConsegna = new Date(maquina.data_consegna);
                                const oggi = new Date();
                                oggi.setHours(0, 0, 0, 0);
                                dataConsegna.setHours(0, 0, 0, 0);
                                const isPassato = dataConsegna < oggi;
                                const isFuturo = dataConsegna > oggi;
                                const colorClass = isPassato ? 'text-green-700' : isFuturo ? 'text-orange-600' : 'text-indigo-700';
                                return (
                                  <span className={`text-xs font-semibold ${colorClass} truncate text-right`}>
                                    {dataConsegna.toLocaleDateString('it-IT')}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>
      </div>
    </div>
  );
}
