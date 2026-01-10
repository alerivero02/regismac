import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { 
  FiSave,
  FiDroplet,
  FiCloud,
  FiClock,
  FiThermometer,
  FiSearch,
  FiPackage,
  FiCheckCircle,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { maquinasAPI, testsAPI, tecnicosAPI, authAPI, lottiAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import Timer from '../components/Timer';

export default function Test() {
  const [maquinas, setMaquinas] = useState([]);
  const [tests, setTests] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [lotti, setLotti] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedMaquina, setSelectedMaquina] = useState('');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  
  const [showMaquinaSelector, setShowMaquinaSelector] = useState(true);
  const [searchMaquina, setSearchMaquina] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterLotto, setFilterLotto] = useState('');
  const [agregarSegundaPrueba, setAgregarSegundaPrueba] = useState(false);
  
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [time0Marked, setTime0Marked] = useState(null);
  const [timeMinus8Marked, setTimeMinus8Marked] = useState(null);
  const [intervalId, setIntervalId] = useState(null);
  const [modoManual, setModoManual] = useState(false);

  const [formData, setFormData] = useState({
    temperatura_iniziale: '',
    regolazione_vite: '',
    tiempo_0_manual: '',
    tiempo_meno8_manual: '',
    tiempo_0_manual_2: '',
    tiempo_meno8_manual_2: '',
    temperatura_iniziale_2: '',
    regolazione_vite_2: '',
    quantita_liquido: '',
    quantita_liquido_2: '',
    humedad_ambiente: '',
    observazioni: '',
    tecnicoId: '',
    fecha_test: new Date().toISOString().split('T')[0],
    hora_test: new Date().toTimeString().slice(0, 5),
  });

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await authAPI.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        const tecnicoAsociado = tecnicos.find(t => t.usuario?.id_usuario === user.id_usuario);
        if (tecnicoAsociado) {
          setFormData(prev => ({ ...prev, tecnicoId: tecnicoAsociado.id_tecnico.toString() }));
        }
      }
    } catch (error) {
      console.error('Error al cargar usuario actual:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [maquinasData, testsData, tecnicosData, lottiData] = await Promise.all([
        maquinasAPI.getAll(),
        testsAPI.getAll().catch(() => []),
        tecnicosAPI.getAll(),
        lottiAPI.getAll().catch(() => [])
      ]);
      setMaquinas(Array.isArray(maquinasData) ? maquinasData : []);
      setTests(Array.isArray(testsData) ? testsData : []);
      setTecnicos(Array.isArray(tecnicosData) ? tecnicosData : []);
      setLotti(Array.isArray(lottiData) ? lottiData : []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showNotification(error.message || 'Errore nel caricamento dei dati', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  }, []);

  const startTimer = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      const id = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
      setIntervalId(id);
    }
  }, [isRunning]);

  const stopTimer = useCallback(() => {
    if (isRunning) {
      setIsRunning(false);
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    }
  }, [isRunning, intervalId]);

  const markTime = useCallback(() => {
    if (!isRunning) return;
    
    if (time0Marked === null) {
      setTime0Marked(time);
      showNotification('Tiempo a 0°C marcado', 'success');
    } else if (timeMinus8Marked === null) {
      setTimeMinus8Marked(time);
      stopTimer();
      showNotification('Tiempo a -8°C marcado - Cronómetro detenido', 'success');
    }
  }, [isRunning, time, time0Marked, timeMinus8Marked, showNotification, stopTimer]);

  const resetTimer = useCallback(() => {
    stopTimer();
    setTime(0);
    setTime0Marked(null);
    setTimeMinus8Marked(null);
  }, [stopTimer]);

  const fieldRefs = useRef({
    temperatura_iniziale: null,
    regolazione_vite: null,
    quantita_liquido: null,
    humedad_ambiente: null,
    tiempo_0_manual: null,
    tiempo_meno8_manual: null,
    tiempo_0_manual_2: null,
    tiempo_meno8_manual_2: null,
    observazioni: null,
  });

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    if (name === 'tiempo_0_manual') {
      let numeros = value.replace(/\D/g, '');
      
      if (numeros.length > 4) {
        numeros = numeros.slice(0, 4);
      }
      
      let formateado = numeros;
      if (numeros.length === 4) {
        const minutos = numeros.slice(0, 2);
        const segundos = numeros.slice(2);
        formateado = minutos + ':' + segundos;
      } else if (numeros.length === 3) {
        const minutos = numeros.slice(0, 1);
        const segundos = numeros.slice(1);
        formateado = '0' + minutos + ':' + segundos;
      }
      
      setFormData((prev) => ({
        ...prev,
        [name]: formateado,
      }));
      
      if (formateado.length === 5 && fieldRefs.current.tiempo_meno8_manual) {
        setTimeout(() => {
          fieldRefs.current.tiempo_meno8_manual?.focus();
        }, 100);
      }
    } else if (name === 'tiempo_meno8_manual') {
      let numeros = value.replace(/\D/g, '');
      
      if (numeros.length > 4) {
        numeros = numeros.slice(0, 4);
      }
      
      let formateado = numeros;
      if (numeros.length > 2) {
        formateado = numeros.slice(0, 2) + ':' + numeros.slice(2);
      }
      
      setFormData((prev) => ({
        ...prev,
        [name]: formateado,
      }));
      
      if (formateado.length === 5 && agregarSegundaPrueba && fieldRefs.current.tiempo_0_manual_2) {
        setTimeout(() => {
          fieldRefs.current.tiempo_0_manual_2?.focus();
        }, 50);
      } else if (formateado.length === 5 && fieldRefs.current.observazioni) {
        setTimeout(() => {
          fieldRefs.current.observazioni?.focus();
        }, 50);
      }
    } else if (name === 'tiempo_0_manual_2') {
      let numeros = value.replace(/\D/g, '');
      
      if (numeros.length > 4) {
        numeros = numeros.slice(0, 4);
      }
      
      let formateado = numeros;
      if (numeros.length === 4) {
        const minutos = numeros.slice(0, 2);
        const segundos = numeros.slice(2);
        formateado = minutos + ':' + segundos;
      } else if (numeros.length === 3) {
        const minutos = numeros.slice(0, 1);
        const segundos = numeros.slice(1);
        formateado = '0' + minutos + ':' + segundos;
      }
      
      setFormData((prev) => ({
        ...prev,
        [name]: formateado,
      }));
      
      if (formateado.length === 5 && fieldRefs.current.tiempo_meno8_manual_2) {
        setTimeout(() => {
          fieldRefs.current.tiempo_meno8_manual_2?.focus();
        }, 100);
      }
    } else if (name === 'tiempo_meno8_manual_2') {
      let numeros = value.replace(/\D/g, '');
      
      if (numeros.length > 4) {
        numeros = numeros.slice(0, 4);
      }
      
      let formateado = numeros;
      if (numeros.length > 2) {
        formateado = numeros.slice(0, 2) + ':' + numeros.slice(2);
      }
      
      setFormData((prev) => ({
        ...prev,
        [name]: formateado,
      }));
      
      if (formateado.length === 5 && fieldRefs.current.observazioni) {
        setTimeout(() => {
          fieldRefs.current.observazioni?.focus();
        }, 50);
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  }, [agregarSegundaPrueba]);

  const tiempoASegundos = (tiempoStr) => {
    if (!tiempoStr) return null;
    const partes = tiempoStr.split(':');
    if (partes.length === 2) {
      const minutos = parseInt(partes[0]) || 0;
      const segundos = parseInt(partes[1]) || 0;
      if (segundos > 59) {
        return null;
      }
      return minutos * 60 + segundos;
    }
    if (/^\d+$/.test(tiempoStr)) {
      const num = parseInt(tiempoStr);
      if (num < 100) {
        return num;
      } else {
        const minutos = Math.floor(num / 100);
        const segundos = num % 100;
        if (segundos > 59) return null;
        return minutos * 60 + segundos;
      }
    }
    return null;
  };

  const handleKeyDown = useCallback((e, currentField, nextField) => {
    if (e.key === 'Enter' && nextField) {
      e.preventDefault();
      setTimeout(() => {
        fieldRefs.current[nextField]?.focus();
      }, 50);
    }
  }, []);

  const handleNumericKeyDown = useCallback((e, currentField) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fieldOrder = [
        'temperatura_iniziale',
        'regolazione_vite',
        'quantita_liquido',
        'humedad_ambiente',
      ];
      const currentIndex = fieldOrder.indexOf(currentField);
      if (currentIndex !== -1 && currentIndex < fieldOrder.length - 1) {
        const nextField = fieldOrder[currentIndex + 1];
        setTimeout(() => {
          fieldRefs.current[nextField]?.focus();
        }, 50);
      }
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!selectedMaquina) {
      showNotification('Seleziona una macchina', 'error');
      return;
    }

    let tiempo0 = null;
    let tiempoMenos8 = null;

    if (modoManual) {
      tiempo0 = formData.tiempo_0_manual ? tiempoASegundos(formData.tiempo_0_manual) : null;
      tiempoMenos8 = formData.tiempo_meno8_manual ? tiempoASegundos(formData.tiempo_meno8_manual) : null;
      
      if (!tiempo0 || !tiempoMenos8) {
        showNotification('Inserisci entrambi i tempi (0°C e -8°C) in formato MM:SS', 'error');
        return;
      }
      
      if (agregarSegundaPrueba) {
        const tiempo0_2 = formData.tiempo_0_manual_2 ? tiempoASegundos(formData.tiempo_0_manual_2) : null;
        const tiempoMenos8_2 = formData.tiempo_meno8_manual_2 ? tiempoASegundos(formData.tiempo_meno8_manual_2) : null;
        
        if (!tiempo0_2 || !tiempoMenos8_2) {
          showNotification('Inserisci entrambi i tempi per la seconda prova', 'error');
          return;
        }
      }
    } else {
      tiempo0 = time0Marked;
      tiempoMenos8 = timeMinus8Marked;
      
      if (!tiempo0 || !tiempoMenos8) {
        showNotification('Registra entrambi i tempi usando il cronometro', 'error');
        return;
      }
    }

    if (!formData.tecnicoId) {
      showNotification('Seleziona un tecnico', 'error');
      return;
    }

    try {
      const fechaHoraTest = formData.fecha_test && formData.hora_test
        ? new Date(`${formData.fecha_test}T${formData.hora_test}:00`).toISOString()
        : new Date().toISOString();

      const dataToSend = {
        maquinaId: parseInt(selectedMaquina),
        temperatura_iniziale: formData.temperatura_iniziale
          ? parseFloat(formData.temperatura_iniziale)
          : undefined,
        regolazione_vite: formData.regolazione_vite || undefined,
        tiempo_0_gradi: tiempo0,
        tiempo_meno8_gradi: tiempoMenos8,
        quantita_liquido: formData.quantita_liquido
          ? parseFloat(formData.quantita_liquido)
          : undefined,
        humedad_ambiente: formData.humedad_ambiente
          ? parseFloat(formData.humedad_ambiente)
          : undefined,
        observazioni: formData.observazioni || undefined,
        tecnicoId: parseInt(formData.tecnicoId),
        hora_test: fechaHoraTest,
      };

      await testsAPI.create(dataToSend);
      
      if (modoManual && agregarSegundaPrueba) {
        const tiempo0_2 = tiempoASegundos(formData.tiempo_0_manual_2);
        const tiempoMenos8_2 = tiempoASegundos(formData.tiempo_meno8_manual_2);
        
        const fechaHoraTest2 = new Date(fechaHoraTest);
        fechaHoraTest2.setMinutes(fechaHoraTest2.getMinutes() + 1);
        
        const dataToSend2 = {
          maquinaId: parseInt(selectedMaquina),
          temperatura_iniziale: formData.temperatura_iniziale_2
            ? parseFloat(formData.temperatura_iniziale_2)
            : undefined,
          regolazione_vite: formData.regolazione_vite_2 || undefined,
          tiempo_0_gradi: tiempo0_2,
          tiempo_meno8_gradi: tiempoMenos8_2,
          quantita_liquido: formData.quantita_liquido_2
            ? parseFloat(formData.quantita_liquido_2)
            : undefined,
          humedad_ambiente: formData.humedad_ambiente
            ? parseFloat(formData.humedad_ambiente)
            : undefined,
          observazioni: formData.observazioni || undefined,
          tecnicoId: parseInt(formData.tecnicoId),
          hora_test: fechaHoraTest2.toISOString(),
        };
        
        await testsAPI.create(dataToSend2);
        showNotification('Entrambe le prove registrate con successo!', 'success');
      } else {
        showNotification('Test registrato con successo!', 'success');
      }
      
      const testsActualizados = await testsAPI.getAll();
      setTests(Array.isArray(testsActualizados) ? testsActualizados : []);
      
      const tecnicoAsociado = currentUser 
        ? tecnicos.find(t => t.usuario?.id_usuario === currentUser.id_usuario)
        : null;

      setFormData({
        temperatura_iniziale: '',
        regolazione_vite: '',
        tiempo_0_manual: '',
        tiempo_meno8_manual: '',
        tiempo_0_manual_2: '',
        tiempo_meno8_manual_2: '',
        temperatura_iniziale_2: '',
        regolazione_vite_2: '',
        quantita_liquido: '',
        quantita_liquido_2: '',
        humedad_ambiente: '',
        observazioni: '',
        tecnicoId: tecnicoAsociado ? tecnicoAsociado.id_tecnico.toString() : '',
        fecha_test: new Date().toISOString().split('T')[0],
        hora_test: new Date().toTimeString().slice(0, 5),
      });
      resetTimer();
      setSelectedMaquina('');
      setModoManual(false);
      setAgregarSegundaPrueba(false);
      setShowMaquinaSelector(true);
      setSearchMaquina('');
      setFilterEstado('');
      setFilterLotto('');
    } catch (error) {
      console.error('Error al crear prueba:', error);
      showNotification(error.message || 'Errore nella registrazione del test', 'error');
    }
  }, [selectedMaquina, modoManual, formData, time0Marked, timeMinus8Marked, tecnicos, currentUser, showNotification, resetTimer, agregarSegundaPrueba]);


  const maquinasOrdenadas = useMemo(() => {
    return [...maquinas].sort((a, b) => {
      const numA = parseInt(a.numero_telaio) || 0;
      const numB = parseInt(b.numero_telaio) || 0;
      
      if (numA !== 0 && numB !== 0) {
        return numB - numA;
      } else if (numA !== 0) {
        return -1;
      } else if (numB !== 0) {
        return 1;
      } else {
        return b.numero_telaio.localeCompare(a.numero_telaio);
      }
    });
  }, [maquinas]);

  const estadosUnicos = useMemo(() => {
    return [...new Set(maquinas.map(m => m.stato).filter(Boolean))].sort();
  }, [maquinas]);

  const maquinasFiltradas = useMemo(() => {
    let filtradas = maquinasOrdenadas;
    
    if (searchMaquina) {
      const searchLower = searchMaquina.toLowerCase();
      filtradas = filtradas.filter(m => 
        m.numero_telaio?.toLowerCase().includes(searchLower) ||
        m.seriale_compressore?.toLowerCase().includes(searchLower) ||
        m.tipo_gas?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filterEstado) {
      filtradas = filtradas.filter(m => m.stato === filterEstado);
    }
    
    if (filterLotto) {
      const lottoId = parseInt(filterLotto);
      filtradas = filtradas.filter(m => m.id_lotto === lottoId);
    }
    
    return filtradas;
  }, [maquinasOrdenadas, searchMaquina, filterEstado, filterLotto]);

  const maquinasToShow = useMemo(() => {
    return maquinasFiltradas.slice(0, 10);
  }, [maquinasFiltradas]);

  const pruebasPorMaquina = useMemo(() => {
    const conteo = {};
    tests.forEach(test => {
      if (test.id_maquina) {
        conteo[test.id_maquina] = (conteo[test.id_maquina] || 0) + 1;
      }
    });
    return conteo;
  }, [tests]);

  const selectedMaquinaData = useMemo(() => {
    if (!selectedMaquina) return null;
    const selectedId = parseInt(selectedMaquina);
    const found = maquinasOrdenadas.find(m => 
      m.id_maquina === selectedId || m.id_maquina.toString() === selectedMaquina
    );
    return found || null;
  }, [maquinasOrdenadas, selectedMaquina]);

  const handleToggleSelector = useCallback(() => {
    setShowMaquinaSelector(prev => !prev);
  }, []);

  const handleSelectMaquina = useCallback((maquinaId) => {
    setSelectedMaquina(maquinaId);
    setSearchMaquina('');
    setFilterLotto('');
    setFilterEstado('');
    setTimeout(() => {
      setShowMaquinaSelector(false);
    }, 150);
  }, []);


  if (loading) {
    return <LoadingSpinner message="Caricamento macchine..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div>
        <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 leading-tight">
          Registro di Prove
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Informazioni Test - Primera sección */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Informazioni Test</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Tecnico <span className="text-red-500">*</span>
              </label>
              <select
                name="tecnicoId"
                value={formData.tecnicoId}
                onChange={handleInputChange}
                required
                className="input-field"
              >
                <option value="">Seleziona tecnico</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id_tecnico} value={tecnico.id_tecnico}>
                    {tecnico.nome} {tecnico.cognome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Data <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="fecha_test"
                value={formData.fecha_test}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Ora <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="hora_test"
                value={formData.hora_test}
                onChange={handleInputChange}
                required
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Selezione Macchina y Cronometro - Sección única combinada */}
        <div className="card">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Selezione Macchina */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Selezione Macchina</h3>
                {selectedMaquinaData && (
                  <button
                    type="button"
                    onClick={handleToggleSelector}
                    className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-lg text-sm font-semibold hover:bg-primary-200 transition-all duration-200 flex items-center gap-1 shadow-sm hover:shadow-md animate-fadeIn"
                  >
                    <FiPackage className="w-4 h-4" />
                    <span>{selectedMaquinaData.numero_telaio}</span>
                    {pruebasPorMaquina[selectedMaquinaData.id_maquina] !== undefined && (
                      <span className="text-xs bg-white bg-opacity-50 px-1.5 py-0.5 rounded font-medium">
                        {pruebasPorMaquina[selectedMaquinaData.id_maquina]} {pruebasPorMaquina[selectedMaquinaData.id_maquina] === 1 ? 'prova' : 'prove'}
                      </span>
                    )}
                    {showMaquinaSelector ? (
                      <FiChevronUp className="w-3 h-3 ml-1" />
                    ) : (
                      <FiChevronDown className="w-3 h-3 ml-1" />
                    )}
                  </button>
                )}
              </div>

              {/* Barra de búsqueda y filtros - solo visible cuando está expandido */}
              {showMaquinaSelector && (
                <div className="mb-3 space-y-2">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cerca..."
                    value={searchMaquina}
                    onChange={(e) => setSearchMaquina(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={filterEstado}
                    onChange={(e) => setFilterEstado(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Tutti Stati</option>
                    {estadosUnicos.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                  <select
                    value={filterLotto}
                    onChange={(e) => setFilterLotto(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Tutti i Lotti</option>
                    {lotti.map(lotto => (
                      <option key={lotto.id_lotto} value={lotto.id_lotto}>
                        {lotto.numero_lotto} {lotto.descrizione ? `- ${lotto.descrizione}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              )}

              {/* Lista de máquinas - colapsable pero siempre muestra la seleccionada */}
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4 shadow-sm">
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  showMaquinaSelector ? 'max-h-[300px] opacity-100' : 'max-h-[60px] opacity-100'
                }`}>
                  <div className={`overflow-y-auto transition-all duration-300 ${showMaquinaSelector ? 'max-h-[300px]' : 'max-h-[60px]'}`}>
                    {maquinasFiltradas.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        <FiPackage className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        Nessuna macchina trovata
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {/* Máquina seleccionada - siempre visible */}
                        {selectedMaquinaData && !showMaquinaSelector && (
                          <button
                            type="button"
                            onClick={handleToggleSelector}
                            className="w-full px-3 py-2 text-left bg-primary-50 border-l-4 border-primary-500 shadow-sm cursor-pointer border-0 animate-fadeIn hover:bg-primary-100 transition-all duration-200"
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 text-sm">
                                  {selectedMaquinaData.numero_telaio}
                                </div>
                                {selectedMaquinaData.tipo_gas && (
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                      {selectedMaquinaData.tipo_gas}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {pruebasPorMaquina[selectedMaquinaData.id_maquina] !== undefined && (
                                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                                    {pruebasPorMaquina[selectedMaquinaData.id_maquina]} {pruebasPorMaquina[selectedMaquinaData.id_maquina] === 1 ? 'prova' : 'prove'}
                                  </span>
                                )}
                                <FiCheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                              </div>
                            </div>
                          </button>
                        )}
                        
                        {/* Lista completa cuando está expandido */}
                        {showMaquinaSelector && maquinasToShow.map((maquina) => {
                          const maquinaId = maquina.id_maquina.toString();
                          const isSelected = selectedMaquina === maquinaId;
                          
                          return (
                            <button
                              key={maquina.id_maquina}
                              type="button"
                              onClick={() => handleSelectMaquina(maquinaId)}
                              className={`w-full px-3 py-2 text-left cursor-pointer border-0 transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-primary-50 border-l-4 border-primary-500 shadow-sm animate-pulse'
                                  : 'bg-transparent hover:bg-primary-50 hover:shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-900 text-sm">
                                    {maquina.numero_telaio}
                                  </div>
                                  {maquina.tipo_gas && (
                                    <div className="text-xs text-gray-600 mt-0.5">
                                      <span className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                                        {maquina.tipo_gas}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {pruebasPorMaquina[maquina.id_maquina] !== undefined && (
                                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded font-medium whitespace-nowrap">
                                      {pruebasPorMaquina[maquina.id_maquina]} {pruebasPorMaquina[maquina.id_maquina] === 1 ? 'prova' : 'prove'}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <FiCheckCircle className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Campi aggiuntivi dentro del div macchina */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Temperatura Iniziale (°C)
                  </label>
                  <input
                    ref={(el) => fieldRefs.current.temperatura_iniziale = el}
                    type="number"
                    step="0.1"
                    name="temperatura_iniziale"
                    value={formData.temperatura_iniziale}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleNumericKeyDown(e, 'temperatura_iniziale')}
                    className="input-field transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Regolazione Vite
                  </label>
                  <input
                    ref={(el) => fieldRefs.current.regolazione_vite = el}
                    type="text"
                    name="regolazione_vite"
                    value={formData.regolazione_vite}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleNumericKeyDown(e, 'regolazione_vite')}
                    className="input-field transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Inserisci regolazione vite"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Quantità Liquido (ml)
                  </label>
                  <input
                    ref={(el) => fieldRefs.current.quantita_liquido = el}
                    type="number"
                    step="1"
                    name="quantita_liquido"
                    value={formData.quantita_liquido}
                    onChange={handleInputChange}
                    onKeyDown={(e) => handleNumericKeyDown(e, 'quantita_liquido')}
                    className="input-field transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Umidità Ambiente (%)
                  </label>
                  <input
                    ref={(el) => fieldRefs.current.humedad_ambiente = el}
                    type="number"
                    step="0.01"
                    name="humedad_ambiente"
                    value={formData.humedad_ambiente}
                    onChange={handleInputChange}
                    className="input-field transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Cronometro con modo manual integrado */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Tempi</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModoManual(false)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                      !modoManual
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Cronometro
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoManual(true)}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                      modoManual
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Manuale
                  </button>
                </div>
              </div>

              {!modoManual ? (
                <Timer
                  time={time}
                  isRunning={isRunning}
                  time0Marked={time0Marked}
                  timeMinus8Marked={timeMinus8Marked}
                  onStart={startTimer}
                  onStop={stopTimer}
                  onReset={resetTimer}
                  onMarkTime={markTime}
                />
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Tempo a 0°C <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 ml-2 font-normal">(626 = 06:26)</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={(el) => fieldRefs.current.tiempo_0_manual = el}
                        type="text"
                        name="tiempo_0_manual"
                        value={formData.tiempo_0_manual}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
                              e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            return;
                          }
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        maxLength={5}
                        className={`input-field font-mono text-lg w-full transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          formData.tiempo_0_manual && formData.tiempo_0_manual.length === 5 
                            ? 'border-green-500 bg-green-50' 
                            : ''
                        }`}
                        placeholder="626"
                        required={modoManual}
                      />
                      {formData.tiempo_0_manual && formData.tiempo_0_manual.length === 5 && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <FiCheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                    </div>
                    {formData.tiempo_0_manual && formData.tiempo_0_manual.length === 5 && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <FiCheckCircle className="w-3 h-3" />
                        <span>Formato corretto: {formData.tiempo_0_manual}</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Tempo a -8°C (MM:SS) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        ref={(el) => fieldRefs.current.tiempo_meno8_manual = el}
                        type="text"
                        name="tiempo_meno8_manual"
                        value={formData.tiempo_meno8_manual}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
                              e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            return;
                          }
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        maxLength={5}
                        className={`input-field font-mono text-lg w-full transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                          formData.tiempo_meno8_manual && formData.tiempo_meno8_manual.length === 5 
                            ? 'border-green-500 bg-green-50' 
                            : ''
                        }`}
                        placeholder="15:45"
                        required={modoManual}
                      />
                      {formData.tiempo_meno8_manual && formData.tiempo_meno8_manual.length === 5 && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <FiCheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      )}
                    </div>
                    {formData.tiempo_meno8_manual && formData.tiempo_meno8_manual.length === 5 && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <FiCheckCircle className="w-3 h-3" />
                        <span>Formato corretto: {formData.tiempo_meno8_manual}</span>
                      </p>
                    )}
                  </div>
                  
                  {/* Opción para agregar segunda prueba */}
                  {modoManual && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={agregarSegundaPrueba}
                          onChange={(e) => {
                            setAgregarSegundaPrueba(e.target.checked);
                            if (!e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                tiempo_0_manual_2: '',
                                tiempo_meno8_manual_2: '',
                                temperatura_iniziale_2: '',
                                regolazione_vite_2: '',
                                quantita_liquido_2: '',
                              }));
                            }
                          }}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">Agregar segunda prueba</span>
                      </label>
                      
                      {agregarSegundaPrueba && (
                        <div className="space-y-4 mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
                          <div className="text-sm font-semibold text-gray-700 mb-3">Segunda Prueba</div>
                          
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Tempo a 0°C (2ª prueba) <span className="text-red-500">*</span>
                              <span className="text-xs text-gray-500 ml-2 font-normal">(626 = 06:26)</span>
                            </label>
                            <div className="relative">
                              <input
                                ref={(el) => fieldRefs.current.tiempo_0_manual_2 = el}
                                type="text"
                                name="tiempo_0_manual_2"
                                value={formData.tiempo_0_manual_2}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
                                      e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                    return;
                                  }
                                  if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                maxLength={5}
                                className={`input-field font-mono text-lg w-full transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                                  formData.tiempo_0_manual_2 && formData.tiempo_0_manual_2.length === 5 
                                    ? 'border-green-500 bg-green-50' 
                                    : ''
                                }`}
                                placeholder="626"
                                required={agregarSegundaPrueba}
                              />
                              {formData.tiempo_0_manual_2 && formData.tiempo_0_manual_2.length === 5 && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <FiCheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                              )}
                            </div>
                            {formData.tiempo_0_manual_2 && formData.tiempo_0_manual_2.length === 5 && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <FiCheckCircle className="w-3 h-3" />
                                <span>Formato corretto: {formData.tiempo_0_manual_2}</span>
                              </p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              Tempo a -8°C (2ª prueba) (MM:SS) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                ref={(el) => fieldRefs.current.tiempo_meno8_manual_2 = el}
                                type="text"
                                name="tiempo_meno8_manual_2"
                                value={formData.tiempo_meno8_manual_2}
                                onChange={handleInputChange}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' || e.key === 'Delete' || e.key === 'Tab' || 
                                      e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                                    return;
                                  }
                                  if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                maxLength={5}
                                className={`input-field font-mono text-lg w-full transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                                  formData.tiempo_meno8_manual_2 && formData.tiempo_meno8_manual_2.length === 5 
                                    ? 'border-green-500 bg-green-50' 
                                    : ''
                                }`}
                                placeholder="15:45"
                                required={agregarSegundaPrueba}
                              />
                              {formData.tiempo_meno8_manual_2 && formData.tiempo_meno8_manual_2.length === 5 && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                  <FiCheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                              )}
                            </div>
                            {formData.tiempo_meno8_manual_2 && formData.tiempo_meno8_manual_2.length === 5 && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <FiCheckCircle className="w-3 h-3" />
                                <span>Formato corretto: {formData.tiempo_meno8_manual_2}</span>
                              </p>
                            )}
                          </div>

                          {/* Campos adicionales para la segunda prueba */}
                          <div className="space-y-3 mt-4 pt-4 border-t border-gray-300">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Temperatura Iniziale (°C) (2ª prova)
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                name="temperatura_iniziale_2"
                                value={formData.temperatura_iniziale_2}
                                onChange={handleInputChange}
                                className="input-field transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="0.0"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Regolazione Vite (2ª prova)
                              </label>
                              <input
                                type="text"
                                name="regolazione_vite_2"
                                value={formData.regolazione_vite_2}
                                onChange={handleInputChange}
                                className="input-field transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Inserisci regolazione vite"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-1">
                                Quantità Liquido (ml) (2ª prova)
                              </label>
                              <input
                                type="number"
                                step="1"
                                name="quantita_liquido_2"
                                value={formData.quantita_liquido_2}
                                onChange={handleInputChange}
                                className="input-field transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dati Opzionali - Solo Osservazioni */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Dati Opzionali</h3>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Osservazioni
            </label>
            <textarea
              ref={(el) => fieldRefs.current.observazioni = el}
              name="observazioni"
              value={formData.observazioni}
              onChange={handleInputChange}
              rows={3}
              className="input-field resize-none transition-all focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Note aggiuntive..."
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            className="btn-primary flex items-center gap-2 px-6 py-3 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
          >
            <FiSave className="w-5 h-5" />
            <span>{agregarSegundaPrueba && modoManual ? 'Salva Entrambe le Prove' : 'Salva Test'}</span>
          </button>
        </div>
      </form>

      {/* Notification */}
      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </div>
  );
}
