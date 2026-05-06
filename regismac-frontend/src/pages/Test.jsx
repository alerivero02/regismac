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
  FiSliders,
} from 'react-icons/fi';
import { maquinasAPI, testsAPI, tecnicosAPI, authAPI, lottiAPI, sensorAPI } from '../services/api';
import { connectSocket, disconnectSocket, onSensorUpdate, offSensorUpdate } from '../services/socket.js';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [testLimits, setTestLimits] = useState(null);
  const [testLimitsForm, setTestLimitsForm] = useState({
    tempo0Max: '',
    tempoMeno8Min: '',
    tempoMeno8Max: '',
  });
  const [limitsLoading, setLimitsLoading] = useState(false);
  const [limitsSaving, setLimitsSaving] = useState(false);
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
  const showESP32ModalRef = useRef(showESP32Modal);
  const [esp32Estado, setEsp32Estado] = useState(null);
  const [esp32PollingInterval, setEsp32PollingInterval] = useState(null);
  const [testESP32Activo, setTestESP32Activo] = useState(false);
  const [fechaHoraInicioTestESP32, setFechaHoraInicioTestESP32] = useState(null);
  const [temperaturaActual, setTemperaturaActual] = useState(null);
  const [temperaturaUpdateKey, setTemperaturaUpdateKey] = useState(0); // Key para forzar re-render
  const [isIniciandoTest, setIsIniciandoTest] = useState(false);
  const [tiempoTranscurridoDisplay, setTiempoTranscurridoDisplay] = useState('0:00');
  const autoSaveRef = useRef(false);
  const tiempoInicioTestRef = useRef(null);
  const tiempo0GradosRef = useRef(null);
  const tiempoMenos8GradosRef = useRef(null);
  const temperaturaActualRef = useRef(null); // Ref para acceso directo al valor más reciente
  const testESP32ActivoRef = useRef(false); // Ref para acceso al estado del test
  const ultimaActualizacionRef = useRef(null); // Ref para rastrear tiempo de última actualización
  const alarmaMenos8ActivadaRef = useRef(false); // Ref para controlar que la alarma solo suene una vez
  
  const [showCronometroModal, setShowCronometroModal] = useState(false);
  const [showCompletarTestModal, setShowCompletarTestModal] = useState(false);
  const [datosTestFinalizado, setDatosTestFinalizado] = useState(null);

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

  const canEditTestLimits = useMemo(() => {
    return ['admin', 'comercial', 'commerciale'].includes(currentUser?.rol);
  }, [currentUser?.rol]);

  // Función para reproducir señal sonora de alarma
  const reproducirAlarmaSonora = useCallback(() => {
    try {
      // Crear contexto de audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Función para generar un pitido
      const generarPitido = (frecuencia, duracion, inicio) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frecuencia;
        oscillator.type = 'sine';
        
        // Envelope para suavizar el sonido
        gainNode.gain.setValueAtTime(0, inicio);
        gainNode.gain.linearRampToValueAtTime(0.3, inicio + 0.01);
        gainNode.gain.linearRampToValueAtTime(0.3, inicio + duracion - 0.01);
        gainNode.gain.linearRampToValueAtTime(0, inicio + duracion);
        
        oscillator.start(inicio);
        oscillator.stop(inicio + duracion);
      };
      
      // Generar 3 pitidos cortos (alarma)
      const tiempoInicio = audioContext.currentTime;
      generarPitido(800, 0.2, tiempoInicio);      // Pitido 1
      generarPitido(800, 0.2, tiempoInicio + 0.3); // Pitido 2
      generarPitido(800, 0.2, tiempoInicio + 0.6); // Pitido 3
      
      console.log('🔔 Alarma sonora activada: Temperatura alcanzó -8°C');
    } catch (error) {
      console.error('Error al reproducir alarma sonora:', error);
      // Fallback: intentar con beep del sistema si está disponible
      if (window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance('Alarma: Temperatura menos 8 grados');
        utterance.volume = 1;
        utterance.rate = 1.5;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, []);

  // Efecto para cargar estado inicial cuando el modal se abre
  useEffect(() => {
    if (!showESP32Modal) {
      // Limpiar intervalo cuando se cierra el modal
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
      return;
    }
    
    // Cargar estado inicial con manejo de errores mejorado
    const cargarEstadoInicial = async () => {
      try {
        const estado = await sensorAPI.obtenerEstado();
        setEsp32Estado(estado);
        // Actualizar estado local del test activo basado en la respuesta del servidor
        setTestESP32Activo(estado.testActivo || false);
      } catch (error) {
        console.error('Error al obtener estado inicial del sensor:', error);
        // Si es error de autenticación, mostrar mensaje específico
        if (error.status === 401 || error.message?.includes('autenticat') || error.message?.includes('Sessione')) {
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
            error: 'Sessione scaduta. Effettua nuovamente il login.',
          });
        } else {
          // Inicializar con valores por defecto si hay otro error
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
            error: error.message || 'Errore di connessione con il sensore',
          });
        }
        setTestESP32Activo(false);
      }
    };
    
    cargarEstadoInicial();
    
    return () => {
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
    };
  }, [showESP32Modal]);

  // Efecto separado para manejar el polling solo cuando hay un test activo
  useEffect(() => {
    // Solo hacer polling si el modal está abierto Y hay un test activo
    if (!showESP32Modal || !testESP32Activo) {
      // Si no hay test activo, limpiar el intervalo si existe
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
      return;
    }
    
    // Configurar polling solo cuando hay un test activo
    const interval = setInterval(async () => {
      try {
        const estado = await sensorAPI.obtenerEstado();
        setEsp32Estado(estado);
        
        // Actualizar estado local del test activo
        const hayTestActivo = estado.testActivo || false;
        setTestESP32Activo(hayTestActivo);
        
        // Si el test ya no está activo, detener el polling
        if (!hayTestActivo) {
          // Limpiar el intervalo si el test ya no está activo
          clearInterval(interval);
          setEsp32PollingInterval(null);
          return;
        }
        
        // Si hay un test activo y se detectaron las temperaturas, actualizar el formulario
        if (estado.testActivo && estado.tiempo0Grados !== null && estado.tiempoMenos8Grados !== null) {
          // Convertir segundos a formato MM:SS
          const minutos0 = Math.floor(estado.tiempo0Grados / 60);
          const segundos0 = estado.tiempo0Grados % 60;
          const tiempo0Formato = `${minutos0.toString().padStart(2, '0')}:${segundos0.toString().padStart(2, '0')}`;
          
          const minutosMenos8 = Math.floor(estado.tiempoMenos8Grados / 60);
          const segundosMenos8 = estado.tiempoMenos8Grados % 60;
          const tiempoMenos8Formato = `${minutosMenos8.toString().padStart(2, '0')}:${segundosMenos8.toString().padStart(2, '0')}`;
          
          setFormData(prev => ({
            ...prev,
            temperatura_iniziale: estado.temperaturaInicial?.toString() || prev.temperatura_iniziale,
            tiempo_0_manual: tiempo0Formato,
            tiempo_meno8_manual: tiempoMenos8Formato,
          }));
          
          setModoManual(true);
          showNotification('Temperaturas detectadas automáticamente!', 'success');
        }
      } catch (error) {
        // No loguear errores de polling para evitar spam en consola
        // Los timeouts son esperados cuando el servidor está lento o no disponible
        // No mostrar error al usuario en cada polling para evitar spam
      }
    }, 3000); // Polling cada 3 segundos cuando hay test activo
    
    setEsp32PollingInterval(interval);
    
    return () => {
      clearInterval(interval);
    };
  }, [showESP32Modal, testESP32Activo]);

  const loadCurrentUser = async () => {
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
  };

  const loadData = useCallback(async () => {
    // Evitar múltiples cargas simultáneas
    if (dataLoadedRef.current) {
      return;
    }
    
    try {
      dataLoadedRef.current = true;
      setLoading(true);
      setLimitsLoading(true);
      const [maquinasData, testsData, tecnicosData, lottiData, limitsData] = await Promise.all([
        maquinasAPI.getAll(),
        testsAPI.getAll().catch(() => []),
        tecnicosAPI.getAll(),
        lottiAPI.getAll().catch(() => []),
        testsAPI.getLimits().catch(() => null),
      ]);
      setMaquinas(Array.isArray(maquinasData) ? maquinasData : []);
      setTests(Array.isArray(testsData) ? testsData : []);
      const tecnicosFiltrados = Array.isArray(tecnicosData) 
        ? tecnicosData.filter(t => t.usuario?.rol === 'tecnico' && t.usuario?.estado === 'aprobado')
        : [];
      setTecnicos(tecnicosFiltrados);
      setLotti(Array.isArray(lottiData) ? lottiData : []);
      if (limitsData?.raw) {
        setTestLimits(limitsData.raw);
        setTestLimitsForm({
          tempo0Max: String(limitsData.raw.TEMPO_0_GRADI_MAX ?? ''),
          tempoMeno8Min: String(limitsData.raw.TEMPO_MENO8_GRADI_MIN ?? ''),
          tempoMeno8Max: String(limitsData.raw.TEMPO_MENO8_GRADI_MAX ?? ''),
        });
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showNotification(error.message || 'Errore nel caricamento dei dati', 'error');
      dataLoadedRef.current = false; // Permitir reintento en caso de error
    } finally {
      setLimitsLoading(false);
      setLoading(false);
    }
  }, [showNotification]);

  const handleLimitsInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setTestLimitsForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSaveLimits = useCallback(async () => {
    if (!canEditTestLimits) {
      showNotification('No autorizado para modificar límites', 'error');
      return;
    }

    const payload = {
      tempo0Max: Number(testLimitsForm.tempo0Max),
      tempoMeno8Min: Number(testLimitsForm.tempoMeno8Min),
      tempoMeno8Max: Number(testLimitsForm.tempoMeno8Max),
    };

    if (
      !Number.isFinite(payload.tempo0Max) ||
      !Number.isFinite(payload.tempoMeno8Min) ||
      !Number.isFinite(payload.tempoMeno8Max)
    ) {
      showNotification('Inserisci valori numerici validi per i limiti', 'error');
      return;
    }

    setLimitsSaving(true);
    try {
      const result = await testsAPI.updateLimits(payload);
      if (result?.raw) {
        setTestLimits(result.raw);
        setTestLimitsForm({
          tempo0Max: String(result.raw.TEMPO_0_GRADI_MAX ?? ''),
          tempoMeno8Min: String(result.raw.TEMPO_MENO8_GRADI_MIN ?? ''),
          tempoMeno8Max: String(result.raw.TEMPO_MENO8_GRADI_MAX ?? ''),
        });
      }
      showNotification('Limiti di test aggiornati con successo', 'success');
    } catch (error) {
      showNotification(error.message || 'Errore aggiornando limiti di test', 'error');
    } finally {
      setLimitsSaving(false);
    }
  }, [canEditTestLimits, showNotification, testLimitsForm]);

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


  // Actualizar cronómetro cada segundo cuando el test está activo
  useEffect(() => {
    let cronometroInterval = null;
    
    if (testESP32Activo && tiempoInicioTestRef.current) {
      cronometroInterval = setInterval(() => {
        const tiempoTranscurrido = Math.floor((Date.now() - tiempoInicioTestRef.current) / 1000);
        const minutos = Math.floor(tiempoTranscurrido / 60);
        const segundos = tiempoTranscurrido % 60;
        setTiempoTranscurridoDisplay(`${minutos}:${segundos.toString().padStart(2, '0')}`);
      }, 1000);
    } else {
      setTiempoTranscurridoDisplay('0:00');
    }
    
    return () => {
      if (cronometroInterval) {
        clearInterval(cronometroInterval);
      }
    };
  }, [testESP32Activo]);

  // Ref para almacenar el handler del WebSocket y poder removerlo correctamente
  const handleSensorUpdateRef = useRef(null);
  
  // Conectar WebSocket para recibir actualizaciones en tiempo real (solo cuando el modal está abierto)
  useEffect(() => {
    const socketInstance = connectSocket();
    
    // Si el modal está cerrado, remover todos los listeners y salir
    if (!showESP32Modal) {
      // Remover el listener específico si existe
      if (handleSensorUpdateRef.current) {
        offSensorUpdate(handleSensorUpdateRef.current);
        handleSensorUpdateRef.current = null;
      }
      // También remover todos los listeners de sensor:update para asegurar limpieza completa
      socketInstance.off('sensor:update');
      const isDev = import.meta.env.DEV;
      if (isDev) {
        console.log('[WebSocket] 🧹 Modal cerrado - listeners removidos');
      }
      return;
    }
    
    // Función para detener el polling cuando el WebSocket está conectado
    const detenerPollingSiConectado = () => {
      if (esp32PollingInterval && socketInstance?.connected) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
        const isDev = import.meta.env.DEV;
        if (isDev) {
          console.log('[WebSocket] ✅ WebSocket conectado, polling detenido');
        }
      }
    };
    
    // Verificar estado de conexión periódicamente
    const checkConnection = () => {
      const status = socketInstance?.connected;
      if (status) {
        detenerPollingSiConectado();
      }
      return status;
    };
    
    // Verificar conexión inmediatamente y después de delays
    checkConnection();
    const timeout1 = setTimeout(() => {
      if (!checkConnection()) {
        console.warn('[WebSocket] ⚠️ Socket no conectado después de 2 segundos, reintentando...');
        // Intentar reconectar manualmente si no está conectado
        if (socketInstance && !socketInstance.connected) {
          socketInstance.connect();
        }
      } else {
        detenerPollingSiConectado();
      }
    }, 2000);
    
    const timeout2 = setTimeout(() => {
      checkConnection();
    }, 5000);
    
    // Listener para cuando el socket se conecta
    const handleConnect = () => {
      detenerPollingSiConectado();
    };
    
    socketInstance.on('connect', handleConnect);
    
    // Crear el handler y guardarlo en el ref para poder removerlo después
    const handleSensorUpdate = (data) => {
      // Solo procesar actualizaciones si el modal está abierto (usar ref para valor actual)
      if (!showESP32ModalRef.current) {
        return;
      }
      
      const temperatura = data.temperatura !== undefined && data.temperatura !== null ? parseFloat(data.temperatura) : null;
      const tempD2 = data.temperatura_d2 !== undefined && data.temperatura_d2 !== null ? parseFloat(data.temperatura_d2) : null;
      const tempD4 = data.temperatura_d4 !== undefined && data.temperatura_d4 !== null ? parseFloat(data.temperatura_d4) : null;
      const hasTemp = (temperatura !== null && !isNaN(temperatura)) || (tempD2 !== null && !isNaN(tempD2)) || (tempD4 !== null && !isNaN(tempD4));

      if (hasTemp) {
        // Temperatura de referencia: D2 (serbatoio) es la principal
        const tempRef = temperatura !== null && !isNaN(temperatura) ? temperatura : (tempD2 !== null ? tempD2 : tempD4);

        setTemperaturaActual(tempRef);
        temperaturaActualRef.current = tempRef;
        setTemperaturaUpdateKey(prev => prev + 1);

        const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
        setEsp32Estado(prev => {
          const nuevoEstado = {
            ...prev,
            temperatura: tempRef,
            temperatura_d2: tempD2,
            temperatura_d4: tempD4,
            humedad: data.humedad !== undefined && data.humedad !== null ? parseFloat(data.humedad) : (prev?.humedad || null),
            timestamp: timestamp
          };
          return nuevoEstado;
        });

        if (testESP32ActivoRef.current && tiempoInicioTestRef.current) {
          const tiempoTranscurrido = Math.floor((Date.now() - tiempoInicioTestRef.current) / 1000);
          // Para registro de 0°C y -8°C, usar sensor D2 (serbatoio) directamente, sin promediar
          const tempD2Ref = tempD2 !== null && !isNaN(tempD2) ? tempD2 : tempRef;
          if (tiempo0GradosRef.current === null && tempD2Ref >= -0.5 && tempD2Ref <= 0.5) {
            tiempo0GradosRef.current = tiempoTranscurrido;
            const minutos0 = Math.floor(tiempoTranscurrido / 60);
            const segundos0 = tiempoTranscurrido % 60;
            setFormData(prev => ({
              ...prev,
              tiempo_0_manual: `${minutos0.toString().padStart(2, '0')}:${segundos0.toString().padStart(2, '0')}`,
            }));
            showNotification(`✅ Temperatura 0°C detectada (D2: ${tempD2Ref.toFixed(1)}°C)`, 'success');
          }
          if (tiempoMenos8GradosRef.current === null && tempD2Ref >= -8.5 && tempD2Ref <= -7.5) {
            tiempoMenos8GradosRef.current = tiempoTranscurrido;
            const minutosMenos8 = Math.floor(tiempoTranscurrido / 60);
            const segundosMenos8 = tiempoTranscurrido % 60;
            setFormData(prev => ({
              ...prev,
              tiempo_meno8_manual: `${minutosMenos8.toString().padStart(2, '0')}:${segundosMenos8.toString().padStart(2, '0')}`,
            }));
            showNotification(`✅ Temperatura -8°C detectada (D2: ${tempD2Ref.toFixed(1)}°C)`, 'success');
          }
          if (tempD2Ref <= -8.0 && !alarmaMenos8ActivadaRef.current) {
            alarmaMenos8ActivadaRef.current = true;
            reproducirAlarmaSonora();
            showNotification(`🔔 ALARMA: Temperatura alcanzó -8°C!`, 'error');
          } else if (tempRef > -8.0 && alarmaMenos8ActivadaRef.current) {
            alarmaMenos8ActivadaRef.current = false;
          }
        }
      }
    };
    
    // Guardar el handler en el ref
    handleSensorUpdateRef.current = handleSensorUpdate;
    
    // Registrar el listener de actualizaciones del sensor
    onSensorUpdate(handleSensorUpdate);
    
    return () => {
      // Limpiar timeouts
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      
      // Remover listener cuando el modal se cierra o el componente se desmonta
      if (handleSensorUpdateRef.current) {
        offSensorUpdate(handleSensorUpdateRef.current);
        handleSensorUpdateRef.current = null;
      }
      // También remover todos los listeners de sensor:update para asegurar limpieza completa
      socketInstance.off('sensor:update');
      socketInstance.off('connect', handleConnect);
      // NO desconectar el socket aquí, solo remover el listener
      // El socket debe permanecer conectado para otros componentes
      const isDev = import.meta.env.DEV;
      if (isDev) {
        console.log('[WebSocket] 🧹 Listener removido - modal cerrado o componente desmontado');
      }
    };
  }, [showNotification, esp32PollingInterval, showESP32Modal]);


  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
      }
      // NO desconectar el socket aquí - debe permanecer conectado
      // El socket se desconectará solo cuando la página se cierre
    };
  }, [esp32PollingInterval]);

  useEffect(() => {
    // Actualizar ref cuando cambia el estado del modal
    showESP32ModalRef.current = showESP32Modal;
    
    if (!showESP32Modal) {
      // Detener polling cuando el modal se cierra
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
      
      // Remover listener del WebSocket inmediatamente cuando el modal se cierra
      (async () => {
        const { getSocketStatus } = await import('../services/socket.js');
        const socketStatus = getSocketStatus();
        if (socketStatus.socket && handleSensorUpdateRef.current) {
          socketStatus.socket.off('sensor:update', handleSensorUpdateRef.current);
          handleSensorUpdateRef.current = null;
          const isDev = import.meta.env.DEV;
          if (isDev) {
            console.log('[WebSocket] 🧹 Listener removido inmediatamente - modal cerrado');
          }
        }
      })();
      
      // Limpiar estados relacionados para evitar conflictos
      // No limpiar esp32Estado completamente porque puede contener datos útiles
      // Solo detener las actualizaciones activas
      return;
    }
    
    const cargarEstadoInicial = async () => {
      try {
        const estado = await sensorAPI.obtenerEstado();
        setEsp32Estado(estado);
      } catch (error) {
        // Solo loguear errores críticos, no 401/403 esperados
        const isDev = import.meta.env.DEV;
        if (isDev && error.status !== 401 && error.status !== 403) {
          console.error('Error al obtener estado inicial del sensor:', error);
        }
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
    
    // Polling HTTP SOLO como fallback cuando WebSocket NO está conectado
    // Verificar estado del WebSocket antes de iniciar polling
    const verificarYConfigurarPolling = async () => {
      const { getSocketStatus } = await import('../services/socket.js');
      const socketStatus = getSocketStatus();
      
      // Si el WebSocket está conectado, NO hacer polling
      if (socketStatus.connected) {
        if (esp32PollingInterval) {
          clearInterval(esp32PollingInterval);
          setEsp32PollingInterval(null);
        }
        return;
      }
      
      // Solo hacer polling si el WebSocket NO está conectado
      // Si ya hay un intervalo activo, no crear otro
      if (esp32PollingInterval) {
        return;
      }
      
      // Polling menos frecuente como fallback (solo cuando WebSocket falla)
      // Si hay un test activo, polling más frecuente (5 segundos)
      // Si no hay test activo, polling menos frecuente (10 segundos)
      let intervaloActual = testESP32Activo ? 5000 : 10000;
      let erroresConsecutivos = 0;
      const maxErroresConsecutivos = 3;
      
      const interval = setInterval(async () => {
        try {
          // Verificar nuevamente el estado del WebSocket antes de cada polling
          const { getSocketStatus: getSocketStatusCheck } = await import('../services/socket.js');
          const socketStatusCheck = getSocketStatusCheck();
          
          // Si el WebSocket se conectó, detener el polling
          if (socketStatusCheck.connected) {
            clearInterval(interval);
            setEsp32PollingInterval(null);
            erroresConsecutivos = 0;
            return;
          }
          
          const estado = await sensorAPI.obtenerEstado();
          
          // Si la petición fue exitosa, resetear contador de errores
          erroresConsecutivos = 0;
          // Restaurar intervalo normal si se había aumentado
          const nuevoIntervalo = testESP32Activo ? 5000 : 10000;
          if (intervaloActual !== nuevoIntervalo) {
            intervaloActual = nuevoIntervalo;
            clearInterval(interval);
            setEsp32PollingInterval(null);
            verificarYConfigurarPolling();
            return;
          }
          
          const temp = estado.temperatura !== null && estado.temperatura !== undefined ? parseFloat(estado.temperatura) : null;
          const tempD2 = estado.temperatura_d2 !== null && estado.temperatura_d2 !== undefined ? parseFloat(estado.temperatura_d2) : null;
          const tempD4 = estado.temperatura_d4 !== null && estado.temperatura_d4 !== undefined ? parseFloat(estado.temperatura_d4) : null;
          // Temperatura de referencia: D2 (serbatoio) es la principal
          const tempRef = temp !== null && !isNaN(temp) ? temp : (tempD2 !== null ? tempD2 : tempD4);

          if (tempRef !== null && !isNaN(tempRef)) {
            setTemperaturaActual(tempRef);
            temperaturaActualRef.current = tempRef;
            setTemperaturaUpdateKey(prev => prev + 1);
            const timestamp = estado.timestamp ? new Date(estado.timestamp) : new Date();
            setEsp32Estado(prev => ({
              ...prev,
              temperatura: tempRef,
              temperatura_d2: tempD2,
              temperatura_d4: tempD4,
              humedad: estado.humedad !== undefined && estado.humedad !== null ? parseFloat(estado.humedad) : (prev?.humedad || null),
              timestamp: timestamp
            }));
              
            if (tempRef <= -8.0 && !alarmaMenos8ActivadaRef.current) {
              alarmaMenos8ActivadaRef.current = true;
              reproducirAlarmaSonora();
              showNotification(`🔔 ALARMA: Temperatura alcanzó -8°C!`, 'error');
            } else if (tempRef > -8.0 && alarmaMenos8ActivadaRef.current) {
              alarmaMenos8ActivadaRef.current = false;
            }
          }
          
          // Actualizar estado completo del sensor (incluyendo testActivo, tiempos, etc.)
          setEsp32Estado(prev => ({
            ...prev,
            ...estado,
            temperatura: tempRef,
            temperatura_d2: tempD2 !== null ? tempD2 : (estado.temperatura_d2 !== undefined && estado.temperatura_d2 !== null ? estado.temperatura_d2 : prev?.temperatura_d2),
            temperatura_d4: tempD4 !== null ? tempD4 : (estado.temperatura_d4 !== undefined && estado.temperatura_d4 !== null ? estado.temperatura_d4 : prev?.temperatura_d4),
          }));
        
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
        
          // Cuando ambas temperaturas están detectadas, finalizar test y mostrar modal para completar datos
          if (estado.testActivo && 
              estado.tiempo0Grados !== null && 
              estado.tiempoMenos8Grados !== null &&
              !isSubmitting &&
              !autoSaveRef.current) {
            autoSaveRef.current = true;
            
            setTimeout(async () => {
              try {
                const resultado = await sensorAPI.finalizarTest();
                
                setTestESP32Activo(false);
                testESP32ActivoRef.current = false;
                alarmaMenos8ActivadaRef.current = false;
                
                // Guardar datos del test para el modal de completar
                setDatosTestFinalizado({
                  resultado: resultado.resultado,
                  fechaHoraTest: fechaHoraInicioTestESP32 || new Date().toISOString(),
                  temperaturaFinal: temperaturaActual,
                });
                setShowCompletarTestModal(true);
                
                showNotification('Test completato! Compila i dati per salvare.', 'success');
              } catch (autoSaveError) {
                const isDev = import.meta.env.DEV;
                if (isDev) {
                  console.error('Error al finalizar test:', autoSaveError);
                }
                autoSaveRef.current = false;
                showNotification('Errore nella finalizzazione del test.', 'error');
              }
            }, 2000);
          }
        } catch (error) {
          erroresConsecutivos++;
          
          // Silenciar errores 401/403
          if (error.status === 401 || error.status === 403) {
            return;
          }
          
          // Silenciar timeouts con backoff exponencial
          const esTimeout = error.message?.includes('Timeout') || 
                           error.message?.includes('timeout') || 
                           error.message?.includes('Il server non risponde');
          
          if (esTimeout) {
            if (erroresConsecutivos >= maxErroresConsecutivos) {
              const nuevoIntervalo = Math.min(intervaloActual * 2, 30000);
              if (nuevoIntervalo !== intervaloActual) {
                intervaloActual = nuevoIntervalo;
                clearInterval(interval);
                setEsp32PollingInterval(null);
                setTimeout(() => {
                  verificarYConfigurarPolling();
                }, nuevoIntervalo);
                return;
              }
            }
            return;
          }
          
          // Otros errores: loguear solo en desarrollo
          const isDev = import.meta.env.DEV;
          if (isDev && erroresConsecutivos <= 1) {
            console.warn('[Polling] Error al obtener estado:', error.message);
          }
          
          if (erroresConsecutivos >= maxErroresConsecutivos) {
            const nuevoIntervalo = Math.min(intervaloActual * 2, 30000);
            if (nuevoIntervalo !== intervaloActual) {
              intervaloActual = nuevoIntervalo;
              clearInterval(interval);
              setEsp32PollingInterval(null);
              setTimeout(() => {
                verificarYConfigurarPolling();
              }, nuevoIntervalo);
              return;
            }
          }
        }
      }, intervaloActual);
    
    setEsp32PollingInterval(interval);
    };
    
    // Verificar estado del WebSocket y configurar polling solo si es necesario
    // Esperar un poco para que el WebSocket tenga tiempo de conectar
    setTimeout(() => {
      verificarYConfigurarPolling();
    }, 2000);
    
    // También verificar periódicamente si el WebSocket se desconectó
    const checkInterval = setInterval(() => {
      verificarYConfigurarPolling();
    }, 5000);
    
    return () => {
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
      clearInterval(checkInterval);
    };
  }, [showESP32Modal, selectedMaquina, formData.tecnicoId, isSubmitting, fechaHoraInicioTestESP32, testESP32Activo, showNotification]);
  
  


  const iniciarTestESP32 = useCallback(async () => {
    if (isIniciandoTest || testESP32Activo) {
      return;
    }
    setIsIniciandoTest(true);
    try {
      // Máquina y técnico no obligatorios al iniciar; solo al finalizar para guardar
      autoSaveRef.current = false;
      
      // Iniciar test en el servidor - el backend tomará automáticamente la temperatura del sensor
      let resultado;
      try {
        resultado = await sensorAPI.iniciarTest();
      } catch (error) {
        // Si el servidor no está disponible pero tenemos USB, continuar solo con USB
        // Verificar si hay datos disponibles
        if (temperaturaActual !== null || esp32Estado?.temperatura_d4 !== null || esp32Estado?.temperatura !== null) {
          console.warn('Servidor no disponible, continuando solo con USB:', error.message);
          // Usar temperatura D4 (testina) como fallback, luego temperatura general
          const temperaturaInicial = esp32Estado?.temperatura_d4 !== null && esp32Estado?.temperatura_d4 !== undefined
            ? esp32Estado.temperatura_d4
            : (temperaturaActual !== null ? temperaturaActual : esp32Estado?.temperatura);
          resultado = {
            temperaturaInicial,
            tiempoInicio: Date.now()
          };
        } else {
          throw error;
        }
      }
      
      // Obtener temperatura inicial de la respuesta del servidor
      const temperaturaInicial = resultado.temperaturaInicial;
      
      if (temperaturaInicial === null || temperaturaInicial === undefined) {
        showNotification('No se pudo obtener la temperatura inicial del sensor. Verifica la conexión del ESP32.', 'error');
        setIsIniciandoTest(false);
        return;
      }
      
      setTestESP32Activo(true);
      testESP32ActivoRef.current = true;
      setFechaHoraInicioTestESP32(new Date().toISOString());
      
      // Inicializar referencias para detección local de temperaturas
      tiempoInicioTestRef.current = resultado.tiempoInicio || Date.now();
      tiempo0GradosRef.current = null;
      tiempoMenos8GradosRef.current = null;
      alarmaMenos8ActivadaRef.current = false; // Resetear alarma al iniciar nuevo test
      
      // Actualizar estado local con temperatura inicial del servidor
      setEsp32Estado(prev => ({
        ...prev,
        temperatura: temperaturaInicial,
        temperaturaInicial: temperaturaInicial,
        testActivo: true,
        tiempoInicio: tiempoInicioTestRef.current,
      }));
      
      showNotification(`✅ Test iniciado con temperatura inicial: ${temperaturaInicial.toFixed(2)}°C. Monitoreando temperatura automáticamente...`, 'success');
    } catch (error) {
      showNotification(error.message || 'Error al iniciar el test', 'error');
      setIsIniciandoTest(false);
    }
  }, [esp32Estado, temperaturaActual, showNotification, isIniciandoTest, testESP32Activo]);

  const finalizarTestESP32 = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const resultado = await sensorAPI.finalizarTest();
      
      setTestESP32Activo(false);
      testESP32ActivoRef.current = false;
      alarmaMenos8ActivadaRef.current = false;
      
      // Detener el polling
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
      
      // Guardar datos del test y mostrar modal para completar campos
      setDatosTestFinalizado({
        resultado: resultado.resultado,
        fechaHoraTest: fechaHoraInicioTestESP32 || new Date().toISOString(),
        temperaturaFinal: temperaturaActual,
      });
      setShowCompletarTestModal(true);
      
      showNotification('Test finalizzato! Compila i dati per salvare.', 'success');
    } catch (error) {
      const isDev = import.meta.env.DEV;
      if (isDev) {
        console.error('Error al finalizar test ESP32:', error);
      }
      showNotification(error.message || 'Errore nella finalizzazione del test', 'error');
      setTestESP32Activo(false);
      testESP32ActivoRef.current = false;
      alarmaMenos8ActivadaRef.current = false;
      setFechaHoraInicioTestESP32(null);
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, fechaHoraInicioTestESP32, temperaturaActual, showNotification, esp32PollingInterval]);

  // Guardar test completado desde el modal de completar datos
  const guardarTestCompletado = useCallback(async (modalData) => {
    if (isSubmitting || !datosTestFinalizado) return;
    setIsSubmitting(true);
    try {
      const { resultado, fechaHoraTest, temperaturaFinal: tempFinal } = datosTestFinalizado;
      
      // Formatear tiempos
      let tiempo0Formato = null;
      let tiempoMenos8Formato = null;
      
      if (resultado.tiempo0Grados !== null && resultado.tiempo0Grados !== undefined) {
        const minutos0 = Math.floor(resultado.tiempo0Grados / 60);
        const segundos0 = resultado.tiempo0Grados % 60;
        tiempo0Formato = `${minutos0.toString().padStart(2, '0')}:${segundos0.toString().padStart(2, '0')}`;
      }
      
      if (resultado.tiempoMenos8Grados !== null && resultado.tiempoMenos8Grados !== undefined) {
        const minutosMenos8 = Math.floor(resultado.tiempoMenos8Grados / 60);
        const segundosMenos8 = resultado.tiempoMenos8Grados % 60;
        tiempoMenos8Formato = `${minutosMenos8.toString().padStart(2, '0')}:${segundosMenos8.toString().padStart(2, '0')}`;
      }
      
      // Temperatura final
      let temperaturaFinal = tempFinal;
      if ((resultado.tiempo0Grados === null || resultado.tiempoMenos8Grados === null) && temperaturaFinal === null) {
        if (esp32Estado?.temperatura !== null && esp32Estado?.temperatura !== undefined) {
          temperaturaFinal = esp32Estado.temperatura;
        } else if (resultado.temperaturaInicial !== null) {
          temperaturaFinal = resultado.temperaturaInicial;
        }
      }
      
      // Observaciones
      let observacionesFinal = modalData.observazioni || '';
      if (resultado.tiempo0Grados === null || resultado.tiempoMenos8Grados === null) {
        const temperaturasNoAlcanzadas = [];
        if (resultado.tiempo0Grados === null) temperaturasNoAlcanzadas.push('0°C');
        if (resultado.tiempoMenos8Grados === null) temperaturasNoAlcanzadas.push('-8°C');
        const nota = `Test completato senza raggiungere le temperature obiettivo (${temperaturasNoAlcanzadas.join(', ')}). `;
        observacionesFinal = nota + observacionesFinal;
        if (temperaturaFinal !== null && temperaturaFinal !== undefined) {
          observacionesFinal += ` Temperatura alla finalizzazione: ${temperaturaFinal.toFixed(1)}°C.`;
        }
      }
      
      const dataToSend = {
        maquinaId: parseInt(modalData.maquinaId),
        tecnicoId: parseInt(modalData.tecnicoId),
        temperatura_iniziale: resultado.temperaturaInicial || undefined,
        temperatura_final: temperaturaFinal !== null && temperaturaFinal !== undefined ? temperaturaFinal : undefined,
        tiempo_0_gradi: resultado.tiempo0Grados || undefined,
        tiempo_meno8_gradi: resultado.tiempoMenos8Grados || undefined,
        humedad_ambiente: resultado.humedad || undefined,
        regolazione_vite: modalData.regolazione_vite || undefined,
        quantita_liquido: modalData.quantita_liquido ? parseFloat(modalData.quantita_liquido) : undefined,
        observazioni: observacionesFinal || undefined,
        hora_test: fechaHoraTest,
      };

      await testsAPI.create(dataToSend);
      
      const testsActualizados = await testsAPI.getAll();
      setTests(Array.isArray(testsActualizados) ? testsActualizados : []);
      
      setFormData(prev => ({
        ...prev,
        temperatura_iniziale: resultado.temperaturaInicial?.toString() || prev.temperatura_iniziale,
        tiempo_0_manual: tiempo0Formato || prev.tiempo_0_manual,
        tiempo_meno8_manual: tiempoMenos8Formato || prev.tiempo_meno8_manual,
        humedad_ambiente: resultado.humedad?.toString() || prev.humedad_ambiente,
      }));
      
      setFechaHoraInicioTestESP32(null);
      setShowCompletarTestModal(false);
      setDatosTestFinalizado(null);
      setShowESP32Modal(false);
      autoSaveRef.current = false;
      
      showNotification('Test salvato con successo!', 'success');
    } catch (error) {
      const isDev = import.meta.env.DEV;
      if (isDev) {
        console.error('Error al guardar test:', error);
      }
      showNotification(error.message || 'Errore nel salvataggio del test', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, datosTestFinalizado, esp32Estado, showNotification]);

  const cancelarTestESP32 = useCallback(async () => {
    try {
      // Intentar cancelar en el servidor si está disponible
    try {
      await sensorAPI.cancelarTest();
      } catch (error) {
        // Si falla, no importa - cancelamos localmente
        const isDev = import.meta.env.DEV;
        if (isDev) {
          console.warn('No se pudo cancelar en el servidor, cancelando localmente:', error.message);
        }
      }
      
      setTestESP32Activo(false);
      testESP32ActivoRef.current = false;
      setFechaHoraInicioTestESP32(null);
      autoSaveRef.current = false;
      
      // Resetear referencias de tiempo
      tiempoInicioTestRef.current = null;
      tiempo0GradosRef.current = null;
      tiempoMenos8GradosRef.current = null;
      setTiempoTranscurridoDisplay('0:00');
      setIsIniciandoTest(false);
      
      // Detener el polling explícitamente
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
      
      showNotification('Test cancelado', 'info');
    } catch (error) {
      showNotification(error.message || 'Error al cancelar el test', 'error');
      // Asegurar que el polling se detenga incluso si hay error
      setTestESP32Activo(false);
      if (esp32PollingInterval) {
        clearInterval(esp32PollingInterval);
        setEsp32PollingInterval(null);
      }
    }
  }, [showNotification, esp32PollingInterval]);


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
        
        // Si no se cumplen los requisitos, permitir guardar con temperatura actual
        if (!tiempo0 || !tiempoMenos8) {
          // Obtener temperatura actual si está disponible (del sensor o del formulario)
          let temperaturaActual = null;
          
          // Intentar obtener temperatura del sensor ESP32 si está disponible
          if (temperaturaActual !== null && temperaturaActual !== undefined) {
            // Ya está en temperaturaActual
          } else if (esp32Estado && esp32Estado.temperatura !== null && esp32Estado.temperatura !== undefined) {
            temperaturaActual = esp32Estado.temperatura;
          } else if (formData.temperatura_iniziale) {
            // Si no hay sensor, usar la temperatura inicial del formulario
            temperaturaActual = parseFloat(formData.temperatura_iniziale);
          }
          
          // Si no hay temperatura disponible, mostrar error
          if (temperaturaActual === null || temperaturaActual === undefined || isNaN(temperaturaActual)) {
            showNotification('Inserisci entrambi i tempi (0°C e -8°C) o assicurati che il sensore stia inviando dati', 'error');
            setIsSubmitting(false);
            return;
          }
          
          // Continuar con el guardado usando la temperatura actual
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
        
        // Si no se cumplen los requisitos, permitir guardar con temperatura actual
        if (!tiempo0 || !tiempoMenos8) {
          // Obtener temperatura actual si está disponible (del sensor o del formulario)
          let temperaturaActual = null;
          
          // Intentar obtener temperatura del sensor ESP32 si está disponible
          if (temperaturaActual !== null && temperaturaActual !== undefined) {
            // Ya está en temperaturaActual
          } else if (esp32Estado && esp32Estado.temperatura !== null && esp32Estado.temperatura !== undefined) {
            temperaturaActual = esp32Estado.temperatura;
          } else if (formData.temperatura_iniziale) {
            // Si no hay sensor, usar la temperatura inicial del formulario
            temperaturaActual = parseFloat(formData.temperatura_iniziale);
          }
          
          // Si no hay temperatura disponible, mostrar error
          if (temperaturaActual === null || temperaturaActual === undefined || isNaN(temperaturaActual)) {
            showNotification('Registra entrambi i tempi usando il cronometro o assicurati che il sensore stia inviando dati', 'error');
            setIsSubmitting(false);
            return;
          }
          
          // Continuar con el guardado usando la temperatura actual
        }
      }
      
      // Obtener temperatura actual al momento de finalizar si no se alcanzaron las temperaturas objetivo
      let temperaturaFinal = null;
      if ((!tiempo0 || !tiempoMenos8) && modoManual) {
        // Obtener temperatura actual del sensor o del formulario
        if (temperaturaActual !== null && temperaturaActual !== undefined) {
          temperaturaFinal = temperaturaActual;
        } else if (esp32Estado && esp32Estado.temperatura !== null && esp32Estado.temperatura !== undefined) {
          temperaturaFinal = esp32Estado.temperatura;
        } else if (formData.temperatura_iniziale) {
          temperaturaFinal = parseFloat(formData.temperatura_iniziale);
        }
      } else if ((!tiempo0 || !tiempoMenos8) && !modoManual) {
        // Modo cronómetro sin sensor
        if (formData.temperatura_iniziale) {
          temperaturaFinal = parseFloat(formData.temperatura_iniziale);
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

      // Preparar observaciones: agregar nota si no se alcanzaron las temperaturas objetivo
      let observacionesFinal = formData.observaciones || '';
      if (!tiempo0 || !tiempoMenos8) {
        const temperaturasNoAlcanzadas = [];
        if (!tiempo0) temperaturasNoAlcanzadas.push('0°C');
        if (!tiempoMenos8) temperaturasNoAlcanzadas.push('-8°C');
        const nota = `Test completato senza raggiungere le temperature obiettivo (${temperaturasNoAlcanzadas.join(', ')}). `;
        observacionesFinal = nota + (observacionesFinal || '');
        if (temperaturaFinal !== null && temperaturaFinal !== undefined) {
          observacionesFinal += `Temperatura al momento della finalizzazione: ${temperaturaFinal.toFixed(1)}°C.`;
        }
      }
      
      const dataToSend = {
        maquinaId: parseInt(selectedMaquina),
        temperatura_iniziale: formData.temperatura_iniziale
          ? parseFloat(formData.temperatura_iniziale)
          : undefined,
        // Si no se alcanzaron las temperaturas objetivo, registrar temperatura final
        temperatura_final: (!tiempo0 || !tiempoMenos8) && temperaturaFinal !== null && temperaturaFinal !== undefined
          ? temperaturaFinal
          : undefined,
        regolazione_vite: formData.regolazione_vite || undefined,
        tiempo_0_gradi: tiempo0 || undefined,
        tiempo_meno8_gradi: tiempoMenos8 || undefined,
        quantita_liquido: formData.quantita_liquido
          ? parseFloat(formData.quantita_liquido)
          : undefined,
        humedad_ambiente: formData.humedad_ambiente
          ? parseFloat(formData.humedad_ambiente)
          : undefined,
        observazioni: observacionesFinal || undefined,
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

      // Mantener el técnico por defecto al resetear el formulario
      const tecnicoPorDefecto = currentUser && tecnicos.length > 0
        ? tecnicos.find(t => t.usuario?.id_usuario === currentUser.id_usuario)?.id_tecnico.toString() || ''
        : '';
      
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
        tecnicoId: tecnicoPorDefecto,
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

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiSliders className="w-5 h-5 text-primary-600" />
            Limiti Test (secondi)
          </h3>
          {!canEditTestLimits && (
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">Solo lettura</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tempo 0°C (max)</label>
            <input
              type="number"
              min="0"
              name="tempo0Max"
              value={testLimitsForm.tempo0Max}
              onChange={handleLimitsInputChange}
              disabled={!canEditTestLimits || limitsLoading}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tempo -8°C (min)</label>
            <input
              type="number"
              min="0"
              name="tempoMeno8Min"
              value={testLimitsForm.tempoMeno8Min}
              onChange={handleLimitsInputChange}
              disabled={!canEditTestLimits || limitsLoading}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tempo -8°C (max)</label>
            <input
              type="number"
              min="0"
              name="tempoMeno8Max"
              value={testLimitsForm.tempoMeno8Max}
              onChange={handleLimitsInputChange}
              disabled={!canEditTestLimits || limitsLoading}
              className="input-field"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {testLimits
              ? `Actual: 0°C<=${testLimits.TEMPO_0_GRADI_MAX}s | -8°C ${testLimits.TEMPO_MENO8_GRADI_MIN}-${testLimits.TEMPO_MENO8_GRADI_MAX}s`
              : 'No se pudieron cargar los límites desde backend'}
          </p>
          <button
            type="button"
            onClick={handleSaveLimits}
            disabled={!canEditTestLimits || limitsSaving || limitsLoading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {limitsSaving ? 'Salvando...' : 'Guardar límites'}
          </button>
        </div>
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
                      onClick={() => setShowESP32Modal(true)}
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
          className="fixed inset-0 flex items-center justify-center z-50 p-4" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'backdropFadeIn 0.2s ease-out'
          }}
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
            className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            style={{ 
              animation: 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform, opacity'
            }}
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

      {/* Modal ESP32 - abierto al pulsar ESP32 (máquina y técnico solo obligatorios al finalizar para guardar) */}
      {showESP32Modal && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4" 
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'backdropFadeIn 0.2s ease-out'
          }}
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
                  <p className="text-sm text-gray-600">Monitoraggio temperatura con sensore DS18B20</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (testESP32Activo) {
                    if (window.confirm('Sei sicuro di voler chiudere? Il test attivo verrà annullato.')) {
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
              <div className={`p-3 rounded-lg ${
                (esp32Estado?.temperatura != null || esp32Estado?.temperatura_d2 != null || esp32Estado?.temperatura_d4 != null)
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    (esp32Estado?.temperatura != null || esp32Estado?.temperatura_d2 != null || esp32Estado?.temperatura_d4 != null) ? 'bg-green-500' : 'bg-yellow-500'
                  }`}></div>
                  <p className={`text-sm font-semibold ${
                    (esp32Estado?.temperatura != null || esp32Estado?.temperatura_d2 != null || esp32Estado?.temperatura_d4 != null) ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {(esp32Estado?.temperatura != null || esp32Estado?.temperatura_d2 != null || esp32Estado?.temperatura_d4 != null)
                      ? '✅ Connesso – aggiornamento in tempo reale'
                      : '⚠️ In attesa dati ESP32'}
                  </p>
                </div>
              </div>

              {(esp32Estado?.temperatura == null && esp32Estado?.temperatura_d2 == null && esp32Estado?.temperatura_d4 == null) && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    ℹ️ Connetti l'ESP32 via WiFi/HTTP. Il sensore invierà i dati automaticamente al server.
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

            {/* Dos sensores: Temperatura serbatoio (D2) y Temperatura testina (D4) */}
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Temperatura serbatoio (D2)</label>
                  <div className="flex items-center gap-2">
                    <FiThermometer className="w-5 h-5 text-red-500" />
                    <span 
                      className="text-2xl font-bold text-gray-900 transition-all duration-200" 
                      key={`temp-d2-${temperaturaUpdateKey}`}
                      style={{ animation: (esp32Estado?.temperatura_d2 != null) ? 'pulse 0.3s ease-in-out' : 'none' }}
                    >
                      {(esp32Estado?.temperatura_d2 != null && !isNaN(esp32Estado.temperatura_d2))
                        ? `${Number(esp32Estado.temperatura_d2).toFixed(1)}°C` : '--'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-600 mb-1 block">Temperatura testina (D4)</label>
                  <div className="flex items-center gap-2">
                    <FiThermometer className="w-5 h-5 text-blue-500" />
                    <span 
                      className="text-2xl font-bold text-gray-900 transition-all duration-200" 
                      key={`temp-d4-${temperaturaUpdateKey}`}
                      style={{ animation: (esp32Estado?.temperatura_d4 != null) ? 'pulse 0.3s ease-in-out' : 'none' }}
                    >
                      {(esp32Estado?.temperatura_d4 != null && !isNaN(esp32Estado.temperatura_d4))
                        ? `${Number(esp32Estado.temperatura_d4).toFixed(1)}°C` : '--'}
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  {testESP32Activo ? (
                    <>
                      <label className="text-xs text-gray-600 mb-1 block">Tempo Trascorso</label>
                  <div className="flex items-center gap-2">
                        <FiClock className="w-5 h-5 text-blue-500" />
                        <span className="text-2xl font-bold text-blue-600 font-mono">
                          {tiempoTranscurridoDisplay}
                    </span>
                  </div>
                    </>
                  ) : (
                    <>
                      <label className="text-xs text-gray-600 mb-1 block">Tempo Trascorso</label>
                      <div className="flex items-center gap-2">
                        <FiClock className="w-5 h-5 text-gray-400" />
                        <span className="text-2xl font-bold text-gray-400 font-mono">
                          00:00
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              {(esp32Estado?.timestamp || temperaturaActual != null || esp32Estado?.temperatura_d2 != null || esp32Estado?.temperatura_d4 != null) && (() => {
                const timestampDisplay = esp32Estado?.timestamp 
                  ? (esp32Estado.timestamp instanceof Date 
                      ? esp32Estado.timestamp.toLocaleTimeString() 
                      : new Date(esp32Estado.timestamp).toLocaleTimeString())
                  : new Date().toLocaleTimeString();
                
                console.log('[UI] 🎨 RENDERIZANDO TIMESTAMP:', {
                  esp32Estado: esp32Estado,
                  tieneTimestamp: !!esp32Estado?.timestamp,
                  timestamp: esp32Estado?.timestamp,
                  timestampTipo: typeof esp32Estado?.timestamp,
                  timestampEsDate: esp32Estado?.timestamp instanceof Date,
                  timestampDisplay: timestampDisplay,
                  temperaturaActual: temperaturaActual,
                  horaActual: new Date().toLocaleTimeString()
                });
                
                return (
                  <div className="mt-3 text-xs text-gray-500">
                    Ultimo aggiornamento: {timestampDisplay}
                  </div>
                );
              })()}
            </div>

            {/* Estado del test */}
            {testESP32Activo && (
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <FiPlay className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-blue-900">Dettagli del Test</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Temp. Iniziale</label>
                    <span className="font-semibold text-gray-900">
                      {(esp32Estado?.temperaturaInicial !== null && esp32Estado?.temperaturaInicial !== undefined)
                        ? `${esp32Estado.temperaturaInicial.toFixed(1)}°C`
                        : (temperaturaActual !== null && temperaturaActual !== undefined ? `${temperaturaActual.toFixed(1)}°C` : '--')}
                    </span>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Stato</label>
                    <span className="font-semibold text-green-600">
                      {(tiempo0GradosRef.current !== null && tiempoMenos8GradosRef.current !== null) ||
                       (esp32Estado?.tiempo0Grados && esp32Estado?.tiempoMenos8Grados)
                        ? 'Completato ✓' 
                        : 'Monitoraggio...'}
                    </span>
                  </div>
                </div>
                
                {/* Indicadores de temperaturas detectadas */}
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg ${(tiempo0GradosRef.current !== null || esp32Estado?.tiempo0Grados) ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">0°C Rilevato</span>
                      {(tiempo0GradosRef.current !== null || esp32Estado?.tiempo0Grados) ? (
                        <span className="text-sm font-bold text-green-700">
                          {tiempo0GradosRef.current !== null
                            ? `${Math.floor(tiempo0GradosRef.current / 60)}:${(tiempo0GradosRef.current % 60).toString().padStart(2, '0')}`
                            : `${Math.floor(esp32Estado.tiempo0Grados / 60)}:${(esp32Estado.tiempo0Grados % 60).toString().padStart(2, '0')}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">In attesa...</span>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${(tiempoMenos8GradosRef.current !== null || esp32Estado?.tiempoMenos8Grados) ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-100'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">-8°C Rilevato</span>
                      {(tiempoMenos8GradosRef.current !== null || esp32Estado?.tiempoMenos8Grados) ? (
                        <span className="text-sm font-bold text-green-700">
                          {tiempoMenos8GradosRef.current !== null
                            ? `${Math.floor(tiempoMenos8GradosRef.current / 60)}:${(tiempoMenos8GradosRef.current % 60).toString().padStart(2, '0')}`
                            : `${Math.floor(esp32Estado.tiempoMenos8Grados / 60)}:${(esp32Estado.tiempoMenos8Grados % 60).toString().padStart(2, '0')}`}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">In attesa...</span>
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
                    (
                      (temperaturaActual === null || temperaturaActual === undefined) &&
                      (!esp32Estado || (esp32Estado.temperatura == null && esp32Estado.temperatura_d2 == null && esp32Estado.temperatura_d4 == null))
                    )
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
                      <span>Avviando...</span>
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

      {/* Modal para completar datos del test finalizado */}
      {showCompletarTestModal && datosTestFinalizado && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-[60] p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-green-50 p-3 rounded-xl">
                <FiCheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Test completato</h2>
                <p className="text-sm text-gray-600">Compila i dati per salvare il test</p>
              </div>
            </div>

            {/* Resumen del test */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Temp. Iniziale (testina):</span>
                <span className="font-semibold">{datosTestFinalizado.resultado.temperaturaInicial?.toFixed(2) || '--'}°C</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tempo 0°C:</span>
                <span className="font-semibold">
                  {datosTestFinalizado.resultado.tiempo0Grados !== null 
                    ? `${Math.floor(datosTestFinalizado.resultado.tiempo0Grados / 60).toString().padStart(2, '0')}:${(datosTestFinalizado.resultado.tiempo0Grados % 60).toString().padStart(2, '0')}`
                    : 'Non raggiunto'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tempo -8°C:</span>
                <span className="font-semibold">
                  {datosTestFinalizado.resultado.tiempoMenos8Grados !== null
                    ? `${Math.floor(datosTestFinalizado.resultado.tiempoMenos8Grados / 60).toString().padStart(2, '0')}:${(datosTestFinalizado.resultado.tiempoMenos8Grados % 60).toString().padStart(2, '0')}`
                    : 'Non raggiunto'}
                </span>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target;
              const maquinaId = form.maquinaId.value;
              const tecnicoId = form.tecnicoId.value;
              if (!maquinaId) {
                showNotification('Seleziona una macchina', 'error');
                return;
              }
              if (!tecnicoId) {
                showNotification('Seleziona un tecnico', 'error');
                return;
              }
              guardarTestCompletado({
                maquinaId,
                tecnicoId,
                regolazione_vite: form.regolazione_vite.value,
                quantita_liquido: form.quantita_liquido.value,
                observazioni: form.observazioni.value,
              });
            }} className="space-y-4">
              {/* Macchina */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Macchina *</label>
                <select
                  name="maquinaId"
                  defaultValue={selectedMaquina || ''}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Seleziona macchina</option>
                  {maquinasOrdenadas.map((maquina) => (
                    <option key={maquina.id_maquina} value={maquina.id_maquina}>
                      {maquina.numero_telaio} {maquina.modello ? `- ${maquina.modello}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tecnico */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tecnico *</label>
                <select
                  name="tecnicoId"
                  defaultValue={formData.tecnicoId || ''}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Seleziona tecnico</option>
                  {tecnicos.map((tecnico) => (
                    <option key={tecnico.id_tecnico} value={tecnico.id_tecnico}>
                      {tecnico.nome} {tecnico.cognome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Regolazione vite */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regolazione vite</label>
                <input
                  type="text"
                  name="regolazione_vite"
                  defaultValue={formData.regolazione_vite || ''}
                  placeholder="Es: 1.5 giri"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Quantita liquido */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantit&agrave; liquido (ml)</label>
                <input
                  type="number"
                  name="quantita_liquido"
                  defaultValue={formData.quantita_liquido || ''}
                  placeholder="Es: 500"
                  step="0.1"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Osservazioni */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Osservazioni</label>
                <textarea
                  name="observazioni"
                  defaultValue={formData.observazioni || ''}
                  placeholder="Note o osservazioni..."
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <FiCheckCircle className="w-5 h-5" />
                  )}
                  <span>Salva Test</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletarTestModal(false);
                    setDatosTestFinalizado(null);
                    setFechaHoraInicioTestESP32(null);
                    autoSaveRef.current = false;
                  }}
                  className="px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-lg transition-colors"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
