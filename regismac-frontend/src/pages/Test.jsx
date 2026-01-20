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
  FiWifi,
  FiX,
  FiPlay,
  FiRotateCw,
} from 'react-icons/fi';
import { maquinasAPI, testsAPI, tecnicosAPI, authAPI, lottiAPI, sensorAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import Timer from '../components/Timer';

export default function Test() {
  const webSerialServiceRef = useRef(null);
  const [maquinas, setMaquinas] = useState([]);
  const [tests, setTests] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [lotti, setLotti] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedMaquina, setSelectedMaquina] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const dataLoadedRef = useRef(false);
  
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
  const [modoManual, setModoManual] = useState(true);
  
  const [showESP32Modal, setShowESP32Modal] = useState(false);
  const [esp32Estado, setEsp32Estado] = useState(null);
  const [esp32PollingInterval, setEsp32PollingInterval] = useState(null);
  const [testESP32Activo, setTestESP32Activo] = useState(false);
  const [fechaHoraInicioTestESP32, setFechaHoraInicioTestESP32] = useState(null);
  const [temperaturaWebSerial, setTemperaturaWebSerial] = useState(null);
  const [humedadWebSerial, setHumedadWebSerial] = useState(null);
  const [isIniciandoTest, setIsIniciandoTest] = useState(false);
  const [tiempoTranscurridoDisplay, setTiempoTranscurridoDisplay] = useState('0:00');
  const autoSaveRef = useRef(false);
  const tiempoInicioTestRef = useRef(null);
  const tiempo0GradosRef = useRef(null);
  const tiempoMenos8GradosRef = useRef(null);
  const [puertosDisponibles, setPuertosDisponibles] = useState([]);
  const [conexionSerial, setConexionSerial] = useState({ connected: false, port: null });
  const [mostrarSelectorPuerto, setMostrarSelectorPuerto] = useState(false);
  const [webSerialSupported, setWebSerialSupported] = useState(false);
  const [webSerialConnected, setWebSerialConnected] = useState(false);
  
  const [showCronometroModal, setShowCronometroModal] = useState(false);

  const getWebSerialService = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !('serial' in navigator)) {
        return null;
      }
      
      if (!webSerialServiceRef.current) {
        const module = await import('../services/webSerial').catch(() => null);
        if (module) {
          const factory = module.getWebSerialInstance || module.default;
          if (typeof factory === 'function') {
            webSerialServiceRef.current = factory();
          }
        }
      }
      
      return webSerialServiceRef.current;
    } catch (error) {
      console.error('[Test] Error al obtener webSerial:', error);
      return null;
    }
  }, []);

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

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  }, []);

  const loadCurrentUser = useCallback(async () => {
    try {
      const user = await authAPI.getCurrentUser();
      setCurrentUser(user);
      if (user && tecnicos.length > 0) {
        const tecnicoAsociado = tecnicos.find(t => t.usuario?.id_usuario === user.id_usuario);
        if (tecnicoAsociado) {
          setFormData(prev => ({ ...prev, tecnicoId: tecnicoAsociado.id_tecnico.toString() }));
        }
      }
    } catch (error) {
      console.error('Error al cargar usuario actual:', error);
    }
  }, [tecnicos]);

  const loadData = useCallback(async () => {
    // Evitar múltiples cargas simultáneas
    if (dataLoadedRef.current) {
      return;
    }
    
    try {
      dataLoadedRef.current = true;
      setLoading(true);
      const [maquinasData, testsData, tecnicosData, lottiData] = await Promise.all([
        maquinasAPI.getAll(),
        testsAPI.getAll().catch(() => []),
        tecnicosAPI.getAll(),
        lottiAPI.getAll().catch(() => [])
      ]);
      setMaquinas(Array.isArray(maquinasData) ? maquinasData : []);
      setTests(Array.isArray(testsData) ? testsData : []);
      const tecnicosFiltrados = Array.isArray(tecnicosData) 
        ? tecnicosData.filter(t => t.usuario?.rol === 'tecnico' && t.usuario?.estado === 'aprobado')
        : [];
      setTecnicos(tecnicosFiltrados);
      setLotti(Array.isArray(lottiData) ? lottiData : []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showNotification(error.message || 'Errore nel caricamento dei dati', 'error');
      dataLoadedRef.current = false; // Permitir reintento en caso de error
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Cargar datos solo una vez al montar el componente
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar al montar

  // Cargar usuario actual después de que los técnicos estén disponibles
  useEffect(() => {
    if (tecnicos.length > 0 && !currentUser) {
      loadCurrentUser();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tecnicos.length, currentUser]); // Solo cuando los técnicos cambien de 0 a >0

  // Verificar soporte WebSerial solo una vez
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serial' in navigator) {
      getWebSerialService()
        .then(service => {
          if (service) {
            service.isSupported()
              .then(setWebSerialSupported)
              .catch(() => setWebSerialSupported(false));
          }
        })
        .catch(() => setWebSerialSupported(false));
    }
  }, []); // Solo una vez al montar

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
      }
      if (webSerialConnected && webSerialServiceRef.current) {
        webSerialServiceRef.current.disconnect().catch(() => {});
      }
    };
  }, [esp32PollingInterval, webSerialConnected]);

  useEffect(() => {
    if (!showESP32Modal) {
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
      return;
    }
    
    const cargarEstadoInicial = async () => {
      try {
        const estado = await sensorAPI.obtenerEstado();
        setEsp32Estado(estado);
        setConexionSerial({
          connected: estado.serialConnected || false,
          port: estado.serialPort || null,
        });
      } catch (error) {
        console.error('Error al obtener estado inicial del sensor:', error);
        const errorMsg = error.status === 401 || error.message?.includes('autenticat') || error.message?.includes('Sessione')
          ? 'Sessione scaduta. Effettua nuovamente il login.'
          : error.message || 'Errore di connessione con il sensore';
        setEsp32Estado({
          temperatura: null,
          humedad: null,
          timestamp: null,
          testActivo: false,
          temperaturaInicial: null,
          tiempoInicio: null,
          tiempoTranscurrido: 0,
          tiempo0Grados: null,
          tiempoMenos8Grados: null,
          error: errorMsg,
        });
      }
    };
    
    cargarEstadoInicial();
    
    const cargarPuertos = async () => {
      try {
        const response = await sensorAPI.listarPuertos();
        if (response.success !== false) {
          setPuertosDisponibles(response.ports || []);
        } else {
          setPuertosDisponibles([]);
        }
      } catch (error) {
        setPuertosDisponibles([]);
      }
    };
    
    cargarPuertos();
    
    getWebSerialService()
      .then(service => {
        if (service) {
          service.setDataCallback(async (data) => {
            if (data.error) return;
            if (data.temperatura !== undefined && data.temperatura !== null) {
              const temperatura = parseFloat(data.temperatura);
              
              // Actualizar estado local inmediatamente para uso USB directo
              setTemperaturaWebSerial(temperatura);
              if (data.humedad !== undefined && data.humedad !== null) {
                setHumedadWebSerial(parseFloat(data.humedad));
              }
              
              // Si hay un test activo, detectar temperaturas objetivo localmente
              if (testESP32Activo && tiempoInicioTestRef.current) {
                const tiempoTranscurrido = Math.floor((Date.now() - tiempoInicioTestRef.current) / 1000);
                
                // Detectar 0°C (con tolerancia de ±0.5°C)
                if (tiempo0GradosRef.current === null && 
                    temperatura >= -0.5 && 
                    temperatura <= 0.5) {
                  tiempo0GradosRef.current = tiempoTranscurrido;
                  const minutos0 = Math.floor(tiempoTranscurrido / 60);
                  const segundos0 = tiempoTranscurrido % 60;
                  const tiempo0Formato = `${minutos0.toString().padStart(2, '0')}:${segundos0.toString().padStart(2, '0')}`;
                  
                  setFormData(prev => ({
                    ...prev,
                    tiempo_0_manual: tiempo0Formato,
                  }));
                  
                  showNotification(`✅ Temperatura 0°C detectada en ${tiempo0Formato}`, 'success');
                }
                
                // Detectar -8°C (con tolerancia de ±0.5°C)
                if (tiempoMenos8GradosRef.current === null && 
                    temperatura >= -8.5 && 
                    temperatura <= -7.5) {
                  tiempoMenos8GradosRef.current = tiempoTranscurrido;
                  const minutosMenos8 = Math.floor(tiempoTranscurrido / 60);
                  const segundosMenos8 = tiempoTranscurrido % 60;
                  const tiempoMenos8Formato = `${minutosMenos8.toString().padStart(2, '0')}:${segundosMenos8.toString().padStart(2, '0')}`;
                  
                  setFormData(prev => ({
                    ...prev,
                    tiempo_meno8_manual: tiempoMenos8Formato,
                  }));
                  
                  showNotification(`✅ Temperatura -8°C detectada en ${tiempoMenos8Formato}`, 'success');
                }
              }
              
              // También enviar al servidor si está disponible (para sincronización)
              try {
                await sensorAPI.recibirDatosSensor({ temperatura: data.temperatura, humedad: data.humedad });
              } catch (error) {
                // Si falla el servidor, no importa - usamos datos locales
                console.warn('No se pudo enviar al servidor, usando datos locales:', error.message);
              }
            }
          });
        }
      })
      .catch(() => {});
    
    const interval = setInterval(async () => {
      try {
        const estado = await sensorAPI.obtenerEstado();
        setEsp32Estado(estado);
        setConexionSerial({
          connected: estado.serialConnected || webSerialConnected,
          port: estado.serialPort || (webSerialConnected ? 'WebSerial' : null),
        });
        
        // Actualizar temperatura inicial cuando se inicia el test
        if (estado.testActivo && estado.temperaturaInicial && !formData.temperatura_iniziale) {
          setFormData(prev => ({
            ...prev,
            temperatura_iniziale: estado.temperaturaInicial.toString(),
          }));
        }
        
        // Actualizar cuando se detecta 0°C
        if (estado.testActivo && estado.tiempo0Grados !== null && estado.tiempo0Grados !== undefined) {
          const minutos0 = Math.floor(estado.tiempo0Grados / 60);
          const segundos0 = estado.tiempo0Grados % 60;
          const tiempo0Formato = `${minutos0.toString().padStart(2, '0')}:${segundos0.toString().padStart(2, '0')}`;
          
          setFormData(prev => {
            if (prev.tiempo_0_manual !== tiempo0Formato) {
              showNotification(`✅ Temperatura 0°C detectada en ${tiempo0Formato}`, 'success');
              return {
                ...prev,
                tiempo_0_manual: tiempo0Formato,
              };
            }
            return prev;
          });
        }
        
        // Actualizar cuando se detecta -8°C
        if (estado.testActivo && estado.tiempoMenos8Grados !== null && estado.tiempoMenos8Grados !== undefined) {
          const minutosMenos8 = Math.floor(estado.tiempoMenos8Grados / 60);
          const segundosMenos8 = estado.tiempoMenos8Grados % 60;
          const tiempoMenos8Formato = `${minutosMenos8.toString().padStart(2, '0')}:${segundosMenos8.toString().padStart(2, '0')}`;
          
          setFormData(prev => {
            if (prev.tiempo_meno8_manual !== tiempoMenos8Formato) {
              showNotification(`✅ Temperatura -8°C detectada en ${tiempoMenos8Formato}`, 'success');
              return {
                ...prev,
                tiempo_meno8_manual: tiempoMenos8Formato,
              };
            }
            return prev;
          });
        }
        
        // Cuando ambas temperaturas están detectadas, guardar automáticamente
        if (estado.testActivo && 
            estado.tiempo0Grados !== null && 
            estado.tiempoMenos8Grados !== null &&
            selectedMaquina &&
            formData.tecnicoId &&
            !isSubmitting &&
            !autoSaveRef.current) {
          // Marcar que ya estamos guardando para evitar múltiples guardados
          autoSaveRef.current = true;
          
          // Esperar 3 segundos antes de guardar automáticamente para asegurar que los datos estén actualizados
          setTimeout(async () => {
            try {
              const resultado = await sensorAPI.finalizarTest();
              if (resultado.resultado.tiempo0Grados && resultado.resultado.tiempoMenos8Grados) {
                const fechaHoraTest = fechaHoraInicioTestESP32 || new Date().toISOString();
                
                const dataToSend = {
                  maquinaId: parseInt(selectedMaquina),
                  tecnicoId: parseInt(formData.tecnicoId),
                  temperatura_iniziale: resultado.resultado.temperaturaInicial || undefined,
                  tiempo_0_gradi: resultado.resultado.tiempo0Grados,
                  tiempo_meno8_gradi: resultado.resultado.tiempoMenos8Grados,
                  humedad_ambiente: resultado.resultado.humedad || undefined,
                  regolazione_vite: formData.regolazione_vite || undefined,
                  quantita_liquido: formData.quantita_liquido ? parseFloat(formData.quantita_liquido) : undefined,
                  observazioni: formData.observazioni || undefined,
                  hora_test: fechaHoraTest,
                };

                await testsAPI.create(dataToSend);
                
                const testsActualizados = await testsAPI.getAll();
                setTests(Array.isArray(testsActualizados) ? testsActualizados : []);
                
                const minutos0 = Math.floor(resultado.resultado.tiempo0Grados / 60);
                const segundos0 = resultado.resultado.tiempo0Grados % 60;
                const tiempo0Formato = `${minutos0.toString().padStart(2, '0')}:${segundos0.toString().padStart(2, '0')}`;
                
                const minutosMenos8 = Math.floor(resultado.resultado.tiempoMenos8Grados / 60);
                const segundosMenos8 = resultado.resultado.tiempoMenos8Grados % 60;
                const tiempoMenos8Formato = `${minutosMenos8.toString().padStart(2, '0')}:${segundosMenos8.toString().padStart(2, '0')}`;
                
                setFormData(prev => ({
                  ...prev,
                  temperatura_iniziale: resultado.resultado.temperaturaInicial?.toString() || prev.temperatura_iniziale,
                  tiempo_0_manual: tiempo0Formato,
                  tiempo_meno8_manual: tiempoMenos8Formato,
                  humedad_ambiente: resultado.resultado.humedad?.toString() || prev.humedad_ambiente,
                }));
                
                setTestESP32Activo(false);
                setFechaHoraInicioTestESP32(null);
                setShowESP32Modal(false);
                autoSaveRef.current = false;
                showNotification('✅ Test completado y guardado automáticamente!', 'success');
              } else {
                autoSaveRef.current = false;
              }
            } catch (error) {
              console.error('Error al guardar test automáticamente:', error);
              autoSaveRef.current = false;
              showNotification('Error al guardar test automáticamente. Puedes guardarlo manualmente.', 'error');
            }
          }, 3000);
        }
      } catch (error) {
        console.error('Error en polling:', error);
      }
    }, 1000); // Actualizar cada 1 segundo para mayor precisión
    
    setEsp32PollingInterval(interval);
    
    return () => {
      clearInterval(interval);
      setEsp32PollingInterval(null);
    };
  }, [showESP32Modal, webSerialConnected, selectedMaquina, formData.tecnicoId, isSubmitting, fechaHoraInicioTestESP32, showNotification]);

  const desconectarWebSerial = useCallback(async () => {
    try {
      const service = await getWebSerialService();
      if (service) {
        await service.disconnect();
      }
      setWebSerialConnected(false);
      setConexionSerial({ connected: false, port: null });
      showNotification('Desconectado de WebSerial', 'info');
    } catch (error) {
      console.error('Error al desconectar WebSerial:', error);
      showNotification('Error al desconectar', 'error');
      // Forzar desconexión incluso si hay error
      setWebSerialConnected(false);
      setConexionSerial({ connected: false, port: null });
    }
  }, [showNotification, getWebSerialService]);

  const conectarWebSerial = useCallback(async () => {
    try {
      const service = await getWebSerialService();
      if (!service) {
        showNotification('WebSerial no está disponible en este navegador. Usa Chrome, Edge o Opera.', 'error');
        return;
      }
      
      // Si ya está conectado, desconectar primero
      if (webSerialConnected) {
        try {
          const status = service.getConnectionStatus();
          if (status.connected) {
            await service.disconnect();
            await new Promise(resolve => setTimeout(resolve, 500)); // Esperar un poco
          }
        } catch (err) {
          // Ignorar errores al desconectar
        }
      }
      
      // Solicitar puerto (esto abrirá el selector de puertos del navegador)
      await service.requestPort();
      
      // Conectar al puerto seleccionado
      await service.connect(115200);
      
      setWebSerialConnected(true);
      setConexionSerial({ connected: true, port: 'WebSerial' });
      showNotification('✅ Conectado por WebSerial USB', 'success');
    } catch (error) {
      console.error('Error al conectar WebSerial:', error);
      
      // Mensajes de error más específicos
      let errorMsg = error.message || 'Error al conectar';
      if (error.message?.includes('No se seleccionó')) {
        errorMsg = 'No se seleccionó ningún puerto. Intenta de nuevo.';
      } else if (error.message?.includes('en uso')) {
        errorMsg = 'El puerto está en uso. Cierra Arduino IDE u otras aplicaciones que usen el puerto.';
      } else if (error.message?.includes('Access denied')) {
        errorMsg = 'Acceso denegado. Verifica los permisos del navegador para acceder a puertos USB.';
      }
      
      showNotification(errorMsg, 'error');
      setWebSerialConnected(false);
      setConexionSerial({ connected: false, port: null });
    }
  }, [showNotification, getWebSerialService, webSerialConnected]);


  const iniciarTestESP32 = useCallback(async () => {
    // Prevenir múltiples clics
    if (isIniciandoTest || testESP32Activo) {
      return;
    }
    
    setIsIniciandoTest(true);
    
    try {
      if (!selectedMaquina) {
        showNotification('Selecciona una máquina antes de iniciar el test', 'error');
        setIsIniciandoTest(false);
        return;
      }

      if (!formData.tecnicoId) {
        showNotification('Selecciona un técnico antes de iniciar el test', 'error');
        setIsIniciandoTest(false);
        return;
      }

      // Obtener temperatura: primero de WebSerial (USB directo), luego del servidor
      let temperaturaInicial = null;
      
      if (webSerialConnected && temperaturaWebSerial !== null) {
        // Usar temperatura directamente de WebSerial (USB)
        temperaturaInicial = temperaturaWebSerial;
      } else if (esp32Estado && esp32Estado.temperatura !== null) {
        // Usar temperatura del servidor
        temperaturaInicial = esp32Estado.temperatura;
      }
      
      if (temperaturaInicial === null) {
        showNotification('No se puede leer la temperatura del sensor. Verifica la conexión USB.', 'error');
        setIsIniciandoTest(false);
        return;
      }
      
      // Resetear flag de auto-guardado
      autoSaveRef.current = false;
      
      // Iniciar test en el servidor (si está disponible) o solo localmente
      try {
        await sensorAPI.iniciarTest(temperaturaInicial);
      } catch (error) {
        // Si el servidor no está disponible pero tenemos USB, continuar solo con USB
        if (webSerialConnected) {
          console.warn('Servidor no disponible, continuando solo con USB:', error.message);
        } else {
          throw error;
        }
      }
      
      setTestESP32Activo(true);
      setFechaHoraInicioTestESP32(new Date().toISOString());
      
      // Inicializar referencias para detección local de temperaturas
      tiempoInicioTestRef.current = Date.now();
      tiempo0GradosRef.current = null;
      tiempoMenos8GradosRef.current = null;
      
      // Actualizar estado local con temperatura inicial
      setEsp32Estado(prev => ({
        ...prev,
        temperatura: temperaturaInicial,
        temperaturaInicial: temperaturaInicial,
        testActivo: true,
        tiempoInicio: tiempoInicioTestRef.current,
      }));
      
      showNotification('✅ Test iniciado. Monitoreando temperatura automáticamente...', 'success');
    } catch (error) {
      showNotification(error.message || 'Error al iniciar el test', 'error');
      setIsIniciandoTest(false);
    }
  }, [selectedMaquina, formData.tecnicoId, esp32Estado, temperaturaWebSerial, webSerialConnected, showNotification, isIniciandoTest, testESP32Activo]);

  const finalizarTestESP32 = useCallback(async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      if (!selectedMaquina) {
        showNotification('Selecciona una máquina antes de finalizar el test', 'error');
        setIsSubmitting(false);
        return;
      }

      if (!formData.tecnicoId) {
        showNotification('Selecciona un técnico antes de finalizar el test', 'error');
        setIsSubmitting(false);
        return;
      }

      const resultado = await sensorAPI.finalizarTest();
      setTestESP32Activo(false);
      
      if (resultado.resultado.tiempo0Grados && resultado.resultado.tiempoMenos8Grados) {
        const fechaHoraTest = fechaHoraInicioTestESP32 || new Date().toISOString();
        
        const dataToSend = {
          maquinaId: parseInt(selectedMaquina),
          tecnicoId: parseInt(formData.tecnicoId),
          temperatura_iniziale: resultado.resultado.temperaturaInicial || undefined,
          tiempo_0_gradi: resultado.resultado.tiempo0Grados,
          tiempo_meno8_gradi: resultado.resultado.tiempoMenos8Grados,
          humedad_ambiente: resultado.resultado.humedad || undefined,
          regolazione_vite: formData.regolazione_vite || undefined,
          quantita_liquido: formData.quantita_liquido ? parseFloat(formData.quantita_liquido) : undefined,
          observazioni: formData.observazioni || undefined,
          hora_test: fechaHoraTest,
        };

        await testsAPI.create(dataToSend);
        
        const testsActualizados = await testsAPI.getAll();
        setTests(Array.isArray(testsActualizados) ? testsActualizados : []);
        
        const minutos0 = Math.floor(resultado.resultado.tiempo0Grados / 60);
        const segundos0 = resultado.resultado.tiempo0Grados % 60;
        const tiempo0Formato = `${minutos0.toString().padStart(2, '0')}:${segundos0.toString().padStart(2, '0')}`;
        
        const minutosMenos8 = Math.floor(resultado.resultado.tiempoMenos8Grados / 60);
        const segundosMenos8 = resultado.resultado.tiempoMenos8Grados % 60;
        const tiempoMenos8Formato = `${minutosMenos8.toString().padStart(2, '0')}:${segundosMenos8.toString().padStart(2, '0')}`;
        
        setFormData(prev => ({
          ...prev,
          temperatura_iniziale: resultado.resultado.temperaturaInicial?.toString() || prev.temperatura_iniziale,
          tiempo_0_manual: tiempo0Formato,
          tiempo_meno8_manual: tiempoMenos8Formato,
          humedad_ambiente: resultado.resultado.humedad?.toString() || prev.humedad_ambiente,
        }));
        
        setShowESP32Modal(false);
        setFechaHoraInicioTestESP32(null);
        showNotification('Test completado y guardado automáticamente!', 'success');
      } else {
        showNotification('Test finalizado, pero no se detectaron todas las temperaturas. El test no se ha guardado.', 'warning');
        setTestESP32Activo(false);
        setFechaHoraInicioTestESP32(null);
      }
    } catch (error) {
      console.error('Error al finalizar test ESP32:', error);
      showNotification(error.message || 'Error al finalizar el test', 'error');
      setTestESP32Activo(false);
      setFechaHoraInicioTestESP32(null);
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, selectedMaquina, formData, fechaHoraInicioTestESP32, showNotification]);

  const cancelarTestESP32 = useCallback(async () => {
    try {
      // Intentar cancelar en el servidor si está disponible
      try {
        await sensorAPI.cancelarTest();
      } catch (error) {
        // Si falla, no importa - cancelamos localmente
        console.warn('No se pudo cancelar en el servidor, cancelando localmente:', error.message);
      }
      
      setTestESP32Activo(false);
      setFechaHoraInicioTestESP32(null);
      autoSaveRef.current = false;
      
      // Resetear referencias de tiempo
      tiempoInicioTestRef.current = null;
      tiempo0GradosRef.current = null;
      tiempoMenos8GradosRef.current = null;
      setTiempoTranscurridoDisplay('0:00');
      setIsIniciandoTest(false);
      
      showNotification('Test cancelado', 'info');
    } catch (error) {
      showNotification(error.message || 'Error al cancelar el test', 'error');
    }
  }, [showNotification]);


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

  const tiempoASegundos = useCallback((tiempoStr) => {
    if (!tiempoStr) return null;
    const partes = tiempoStr.split(':');
    if (partes.length === 2) {
      const minutos = parseInt(partes[0]) || 0;
      const segundos = parseInt(partes[1]) || 0;
      if (segundos > 59) return null;
      return minutos * 60 + segundos;
    }
    if (/^\d+$/.test(tiempoStr)) {
      const num = parseInt(tiempoStr);
      if (num < 100) return num;
      const minutos = Math.floor(num / 100);
      const segundos = num % 100;
      if (segundos > 59) return null;
      return minutos * 60 + segundos;
    }
    return null;
  }, []);

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
    
    // Prevenir doble envío
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      if (!selectedMaquina) {
        showNotification('Seleziona una macchina', 'error');
        setIsSubmitting(false);
        return;
      }

      let tiempo0 = null;
      let tiempoMenos8 = null;

      if (modoManual) {
        tiempo0 = formData.tiempo_0_manual ? tiempoASegundos(formData.tiempo_0_manual) : null;
        tiempoMenos8 = formData.tiempo_meno8_manual ? tiempoASegundos(formData.tiempo_meno8_manual) : null;
        
        if (!tiempo0 || !tiempoMenos8) {
          showNotification('Inserisci entrambi i tempi (0°C e -8°C) in formato MM:SS', 'error');
          setIsSubmitting(false);
          return;
        }
        
        if (agregarSegundaPrueba) {
          const tiempo0_2 = formData.tiempo_0_manual_2 ? tiempoASegundos(formData.tiempo_0_manual_2) : null;
          const tiempoMenos8_2 = formData.tiempo_meno8_manual_2 ? tiempoASegundos(formData.tiempo_meno8_manual_2) : null;
          
          if (!tiempo0_2 || !tiempoMenos8_2) {
            showNotification('Inserisci entrambi i tempi per la seconda prova', 'error');
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        tiempo0 = time0Marked;
        tiempoMenos8 = timeMinus8Marked;
        
        if (!tiempo0 || !tiempoMenos8) {
          showNotification('Registra entrambi i tempi usando il cronometro', 'error');
          setIsSubmitting(false);
          return;
        }
      }

      if (!formData.tecnicoId) {
        showNotification('Seleziona un tecnico', 'error');
        setIsSubmitting(false);
        return;
      }
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
      setModoManual(true); // Mantener modo manual activo por defecto
      setAgregarSegundaPrueba(false);
      setShowMaquinaSelector(true);
      setSearchMaquina('');
      setFilterEstado('');
      setFilterLotto('');
    } catch (error) {
      console.error('Error al crear prueba:', error);
      showNotification(error.message || 'Errore nella registrazione del test', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedMaquina, modoManual, formData, time0Marked, timeMinus8Marked, tecnicos, currentUser, showNotification, resetTimer, agregarSegundaPrueba, isSubmitting]);


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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Informazioni Test</h3>
          </div>
          
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

            {/* Tempi - Modo manual por defecto */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Tempi</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowCronometroModal(true)}
                    className="px-3 py-1 rounded text-xs font-semibold transition-all bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
                    title="Apri cronometro"
                  >
                    <FiClock className="w-3 h-3" />
                    Cronometro
                  </button>
                  {/* Botón ESP32 - siempre visible */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowESP32Modal(true);
                    }}
                    className="px-3 py-1 rounded text-xs font-semibold transition-all bg-green-500 text-white hover:bg-green-600 flex items-center gap-1 relative z-10"
                    title="Test automático con ESP32"
                  >
                    <FiWifi className="w-3 h-3" />
                    ESP32
                  </button>
                </div>
              </div>

              {/* Modo manual siempre visible por defecto */}
              {modoManual && (
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
                        placeholder="6:26"
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
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2 px-6 py-3 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <FiSave className="w-5 h-5" />
            <span>
              {isSubmitting 
                ? 'Salvataggio...' 
                : agregarSegundaPrueba && modoManual 
                  ? 'Salva Entrambe le Prove' 
                  : 'Salva Test'}
            </span>
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

      {/* Modal Cronómetro */}
      {showCronometroModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" 
          style={{ zIndex: 9999, position: 'fixed' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              if (isRunning) {
                if (window.confirm('Il cronometro è in esecuzione. Vuoi chiudere comunque?')) {
                  stopTimer();
                  setShowCronometroModal(false);
                }
              } else {
                setShowCronometroModal(false);
              }
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-3 rounded-xl">
                  <FiClock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Cronometro</h2>
                  <p className="text-sm text-gray-600">Registra i tempi a 0°C e -8°C</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (isRunning) {
                    if (window.confirm('Il cronometro è in esecuzione. Vuoi chiudere comunque?')) {
                      stopTimer();
                      setShowCronometroModal(false);
                    }
                  } else {
                    setShowCronometroModal(false);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            {/* Cronómetro */}
            <div className="mb-6">
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
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (time0Marked !== null && timeMinus8Marked !== null) {
                    // Actualizar el formulario con los tiempos marcados
                    const minutos0 = Math.floor(time0Marked / 60);
                    const segundos0 = time0Marked % 60;
                    const tiempo0Formato = `${minutos0.toString().padStart(2, '0')}:${segundos0.toString().padStart(2, '0')}`;
                    
                    const minutosMenos8 = Math.floor(timeMinus8Marked / 60);
                    const segundosMenos8 = timeMinus8Marked % 60;
                    const tiempoMenos8Formato = `${minutosMenos8.toString().padStart(2, '0')}:${segundosMenos8.toString().padStart(2, '0')}`;
                    
                    setFormData(prev => ({
                      ...prev,
                      tiempo_0_manual: tiempo0Formato,
                      tiempo_meno8_manual: tiempoMenos8Formato,
                    }));
                    
                    setModoManual(true);
                    setShowCronometroModal(false);
                    showNotification('Tempi registrati correttamente!', 'success');
                  } else {
                    showNotification('Devi registrare entrambi i tempi (0°C e -8°C) prima di chiudere', 'warning');
                  }
                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FiCheckCircle className="w-5 h-5" />
                <span>Usa questi tempi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  resetTimer();
                  setShowCronometroModal(false);
                }}
                className="px-6 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FiX className="w-5 h-5" />
                <span>Annulla</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ESP32 */}
      {showESP32Modal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" 
          style={{ zIndex: 9999, position: 'fixed' }}
          onClick={(e) => {
            // Cerrar al hacer clic fuera del modal
            if (e.target === e.currentTarget) {
              if (testESP32Activo) {
                if (window.confirm('¿Estás seguro de que quieres cerrar? El test activo se cancelará.')) {
                  cancelarTestESP32();
                  setShowESP32Modal(false);
                }
              } else {
                setShowESP32Modal(false);
              }
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative z-[10000]"
            style={{ zIndex: 10000 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-green-50 p-3 rounded-xl">
                  <FiWifi className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Test Automatico ESP32</h2>
                  <p className="text-sm text-gray-600">Monitoreo de temperatura con sensor DHT11</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (testESP32Activo) {
                    if (window.confirm('¿Estás seguro de que quieres cerrar? El test activo se cancelará.')) {
                      cancelarTestESP32();
                      setShowESP32Modal(false);
                    }
                  } else {
                    setShowESP32Modal(false);
                  }
                }}
                className="text-gray-400 hover:text-gray-600 p-2"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4 space-y-3">
              {webSerialSupported && (
                <div className={`p-3 rounded-lg ${
                  webSerialConnected 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-gray-50 border border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        webSerialConnected ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <p className={`text-sm font-semibold ${
                        webSerialConnected ? 'text-green-800' : 'text-gray-800'
                      }`}>
                        {webSerialConnected 
                          ? '✅ Conectado por WebSerial USB (funciona en producción)'
                          : '📡 WebSerial USB disponible'}
                      </p>
                    </div>
                    {!webSerialConnected ? (
                      <button
                        onClick={conectarWebSerial}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-semibold"
                      >
                        Conectar USB
                      </button>
                    ) : (
                      <button
                        onClick={desconectarWebSerial}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-semibold"
                      >
                        Desconectar
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(puertosDisponibles.length > 0 || conexionSerial.connected) && (
                <div className={`p-3 rounded-lg ${
                  conexionSerial.connected 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${
                        conexionSerial.connected ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <p className={`text-sm font-semibold ${
                        conexionSerial.connected ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {conexionSerial.connected 
                          ? `✅ Conectado por servidor: ${conexionSerial.port || 'Puerto desconocido'}`
                          : '⚠️ No conectado por servidor'}
                      </p>
                    </div>
                    {!conexionSerial.connected && puertosDisponibles.length > 0 && (
                      <button
                        onClick={() => setMostrarSelectorPuerto(!mostrarSelectorPuerto)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs font-semibold"
                      >
                        {mostrarSelectorPuerto ? 'Ocultar' : 'Conectar'}
                      </button>
                    )}
                    {conexionSerial.connected && (
                      <button
                        onClick={async () => {
                          try {
                            await sensorAPI.desconectarESP32();
                            setConexionSerial({ connected: false, port: null });
                            showNotification('Desconectado del ESP32', 'info');
                          } catch (error) {
                            showNotification('Error al desconectar', 'error');
                          }
                        }}
                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-xs font-semibold"
                      >
                        Desconectar
                      </button>
                    )}
                  </div>
                  
                  {mostrarSelectorPuerto && !conexionSerial.connected && puertosDisponibles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <select
                        id="puerto-select"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        defaultValue=""
                      >
                        <option value="">Seleccionar puerto automáticamente</option>
                        {puertosDisponibles.map((puerto, index) => (
                          <option key={index} value={puerto.path}>
                            {puerto.path} - {puerto.manufacturer}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={async () => {
                          try {
                            const select = document.getElementById('puerto-select');
                            const portPath = select.value;
                            await sensorAPI.conectarESP32(portPath || null);
                            setConexionSerial({ connected: true, port: portPath || 'Auto' });
                            setMostrarSelectorPuerto(false);
                            showNotification('Conectado al ESP32', 'success');
                          } catch (error) {
                            showNotification(error.message || 'Error al conectar', 'error');
                          }
                        }}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-semibold"
                      >
                        Conectar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!webSerialSupported && puertosDisponibles.length === 0 && !conexionSerial.connected && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    ℹ️ Conecta el ESP32 por WiFi/HTTP o usa un navegador compatible (Chrome/Edge) para WebSerial USB.
                  </p>
                </div>
              )}
            </div>

            {/* Mensaje de advertencia si no hay conexión o hay error */}
            {(esp32Estado === null || esp32Estado?.error) && (
              <div className={`mb-4 p-3 rounded-lg ${
                esp32Estado?.error?.includes('Sessione') 
                  ? 'bg-red-50 border border-red-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <p className={`text-sm ${
                  esp32Estado?.error?.includes('Sessione') 
                    ? 'text-red-800' 
                    : 'text-yellow-800'
                }`}>
                  ⚠️ {esp32Estado?.error || 'No se puede conectar con el sensor. Verifica que el ESP32 esté enviando datos al servidor.'}
                </p>
                {esp32Estado?.error?.includes('Sessione') && (
                  <button
                    onClick={() => {
                      window.location.href = '/login';
                    }}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
                  >
                    Vai al Login
                  </button>
                )}
              </div>
            )}

            {/* Estado del sensor */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Temperatura Actual</label>
                  <div className="flex items-center gap-2">
                    <FiThermometer className="w-5 h-5 text-red-500" />
                    <span className="text-2xl font-bold text-gray-900">
                      {(webSerialConnected && temperaturaWebSerial !== null)
                        ? `${temperaturaWebSerial.toFixed(1)}°C`
                        : (esp32Estado?.temperatura !== null && esp32Estado?.temperatura !== undefined)
                        ? `${esp32Estado.temperatura.toFixed(1)}°C`
                        : '--'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Humedad</label>
                  <div className="flex items-center gap-2">
                    <FiDroplet className="w-5 h-5 text-blue-500" />
                    <span className="text-2xl font-bold text-gray-900">
                      {(webSerialConnected && humedadWebSerial !== null)
                        ? `${humedadWebSerial.toFixed(1)}%`
                        : (esp32Estado?.humedad !== null && esp32Estado?.humedad !== undefined)
                        ? `${esp32Estado.humedad.toFixed(1)}%`
                        : '--'}
                    </span>
                  </div>
                </div>
              </div>
              
              {esp32Estado?.timestamp && (
                <div className="mt-3 text-xs text-gray-500">
                  Última actualización: {new Date(esp32Estado.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Estado del test */}
            {testESP32Activo && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <FiPlay className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-blue-900">Test en Curso</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Temp. Inicial</label>
                    <span className="font-semibold text-gray-900">
                      {esp32Estado?.temperaturaInicial?.toFixed(1)}°C
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Tiempo Transcurrido</label>
                    <span className="font-semibold text-gray-900">
                      {tiempoTranscurridoDisplay}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Estado</label>
                    <span className="font-semibold text-green-600">
                      {(tiempo0GradosRef.current !== null && tiempoMenos8GradosRef.current !== null) ||
                       (esp32Estado?.tiempo0Grados && esp32Estado?.tiempoMenos8Grados)
                        ? 'Completado ✓' 
                        : 'Monitoreando...'}
                    </span>
                  </div>
                </div>
                
                {/* Indicadores de temperaturas detectadas */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg ${(tiempo0GradosRef.current !== null || esp32Estado?.tiempo0Grados) ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">0°C Detectado</span>
                      {(tiempo0GradosRef.current !== null || esp32Estado?.tiempo0Grados) ? (
                        <span className="text-sm font-bold text-green-700">
                          {tiempo0GradosRef.current !== null
                            ? `${Math.floor(tiempo0GradosRef.current / 60)}:${(tiempo0GradosRef.current % 60).toString().padStart(2, '0')}`
                            : `${Math.floor(esp32Estado.tiempo0Grados / 60)}:${(esp32Estado.tiempo0Grados % 60).toString().padStart(2, '0')}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Esperando...</span>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${(tiempoMenos8GradosRef.current !== null || esp32Estado?.tiempoMenos8Grados) ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">-8°C Detectado</span>
                      {(tiempoMenos8GradosRef.current !== null || esp32Estado?.tiempoMenos8Grados) ? (
                        <span className="text-sm font-bold text-green-700">
                          {tiempoMenos8GradosRef.current !== null
                            ? `${Math.floor(tiempoMenos8GradosRef.current / 60)}:${(tiempoMenos8GradosRef.current % 60).toString().padStart(2, '0')}`
                            : `${Math.floor(esp32Estado.tiempoMenos8Grados / 60)}:${(esp32Estado.tiempoMenos8Grados % 60).toString().padStart(2, '0')}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Esperando...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de control */}
            <div className="flex gap-3">
              {!testESP32Activo ? (
                <button
                  onClick={iniciarTestESP32}
                  disabled={
                    isIniciandoTest ||
                    ((!webSerialConnected || temperaturaWebSerial === null) && 
                    (!esp32Estado || esp32Estado.temperatura === null))
                  }
                  className={`flex-1 flex items-center justify-center gap-2 py-3 font-semibold transition-all ${
                    isIniciandoTest
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white cursor-wait'
                      : 'btn-primary disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {isIniciandoTest ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Iniciando...</span>
                    </>
                  ) : (
                    <>
                      <FiPlay className="w-5 h-5" />
                      <span>Inizio Test</span>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={finalizarTestESP32}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiCheckCircle className="w-5 h-5" />
                    <span>Finalizza Test</span>
                  </button>
                  <button
                    onClick={cancelarTestESP32}
                    className="px-6 bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <FiX className="w-5 h-5" />
                    <span>Annulla</span>
                  </button>
                </>
              )}
            </div>

            {/* Instrucciones */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-2">Istruzioni:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Assicurati che l'ESP32 sia connesso e invii dati al server</li>
                <li>Clicca su "Inizio Test" per registrare la temperatura iniziale</li>
                <li>Il sistema monitorerà automaticamente la temperatura</li>
                <li>Quando viene rilevato 0°C, il tempo viene registrato automaticamente</li>
                <li>Quando viene rilevato -8°C, il tempo viene registrato automaticamente</li>
                <li>Clicca su "Finalizza Test" per completare e caricare i dati nel formulario</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
