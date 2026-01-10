import { useEffect, useState } from 'react';
import { 
  FiPlus, 
  FiX, 
  FiPackage, 
  FiSearch,
  FiFilter,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiEdit2,
  FiSave,
  FiImage,
  FiTrash2,
  FiClock,
  FiPlay,
  FiCheck,
  FiTruck,
  FiRotateCw,
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiCalendar,
  FiInfo,
  FiThermometer,
  FiDroplet,
  FiCloud,
  FiSettings
} from 'react-icons/fi';
import { maquinasAPI, tecnicosAPI, authAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import ModernDropdown from '../components/ModernDropdown';

export default function Registros() {
  const [maquinas, setMaquinas] = useState([]);
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterTecnico, setFilterTecnico] = useState('');
  const [filterTipoGas, setFilterTipoGas] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' o 'desc'
  const [showFilters, setShowFilters] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [editingGas, setEditingGas] = useState(null);
  const [gasEditValue, setGasEditValue] = useState('');
  const [user, setUser] = useState(null);
  const [editingField, setEditingField] = useState(null); // { maquinaId, field, value }
  const [selectedMaquinas, setSelectedMaquinas] = useState([]); // IDs de máquinas seleccionadas
  const [showBatchConsegnaModal, setShowBatchConsegnaModal] = useState(false);
  const [batchConsegnaDate, setBatchConsegnaDate] = useState(new Date().toISOString().split('T')[0]);
  const [processingBatch, setProcessingBatch] = useState(false);
  const [fotoModal, setFotoModal] = useState({ show: false, url: null, title: '' });
  const [detalleModal, setDetalleModal] = useState({ show: false, maquina: null });
  const [fotoIndex, setFotoIndex] = useState(0); // Para navegar entre fotos en el modal
  const [editandoFotos, setEditandoFotos] = useState(false);
  const [nuevasFotos, setNuevasFotos] = useState({ foto1: null, foto2: null });
  const [previewsFotos, setPreviewsFotos] = useState({ foto1: null, foto2: null });
  const [eliminarFotos, setEliminarFotos] = useState({ foto1: false, foto2: false });
  const [guardandoFotos, setGuardandoFotos] = useState(false);
  const [fotosError, setFotosError] = useState({}); // Para rastrear qué fotos fallaron al cargar
  const [confirmEstadoModal, setConfirmEstadoModal] = useState({ 
    show: false, 
    maquinaId: null, 
    nuevoEstado: null, 
    estadoAnterior: null,
    maquinaInfo: null 
  });
  const [isClosingModal, setIsClosingModal] = useState(false);
  
  // Cerrar modales con tecla Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (fotoModal.show) {
          setFotoModal({ show: false, url: null, title: '' });
        }
        if (detalleModal.show) {
          setDetalleModal({ show: false, maquina: null });
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [fotoModal.show, detalleModal.show]);

  const [formData, setFormData] = useState({
    numero_telaio: '',
    seriale_compressore: '',
    tipo_gas: '',
    quantita_gas: '',
    tipo_valvola: '',
    annotazioni: '',
    stato: '',
    tecnicoId: '',
    data_consegna: '',
  });
  const [foto1, setFoto1] = useState(null);
  const [foto1Preview, setFoto1Preview] = useState(null);
  const [foto2, setFoto2] = useState(null);
  const [foto2Preview, setFoto2Preview] = useState(null);

  useEffect(() => {
    loadData();
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authAPI.getCurrentUser();
      if (userData) {
        setUser(userData);
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      setUser(null);
    }
  };

  const isAdmin = user?.rol === 'admin';
  const isTecnico = user?.rol === 'tecnico';
  const puedeEditar = isAdmin || isTecnico;

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

  // Opciones de estado con iconos y colores para el dropdown
  const estadoOptions = [
    { 
      value: 'ok', 
      label: 'OK', 
      icon: <FiCheckCircle />, 
      iconColor: 'text-green-500',
      badge: 'Completato',
      badgeColor: 'bg-green-100 text-green-700'
    },
    { 
      value: 'in_produzione', 
      label: 'In Produzione', 
      icon: <FiPlay />, 
      iconColor: 'text-blue-500',
      badge: 'Attivo',
      badgeColor: 'bg-blue-100 text-blue-700'
    },
    { 
      value: 'consegnata', 
      label: 'Consegnata', 
      icon: <FiTruck />, 
      iconColor: 'text-indigo-500',
      badge: 'Spedito',
      badgeColor: 'bg-indigo-100 text-indigo-700'
    },
    { 
      value: 'rientrate', 
      label: 'Rientrate', 
      icon: <FiRotateCw />, 
      iconColor: 'text-purple-500',
      badge: 'Rientrata',
      badgeColor: 'bg-purple-100 text-purple-700'
    },
    { 
      value: 'in_test', 
      label: 'In Test', 
      icon: <FiClock />, 
      iconColor: 'text-yellow-500',
      badge: 'Test',
      badgeColor: 'bg-yellow-100 text-yellow-700'
    },
    { 
      value: 'pendente', 
      label: 'Pendente', 
      icon: <FiAlertCircle />, 
      iconColor: 'text-orange-500',
      badge: 'In attesa',
      badgeColor: 'bg-orange-100 text-orange-700'
    },
  ];

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
   * @param {Object} maquina - Objeto máquina con sus pruebas
   * @returns {Object|null} - Última prueba o null si no hay pruebas
   */
  const obtenerUltimaPrueba = (maquina) => {
    if (!maquina.tests || maquina.tests.length === 0) return null;
    
    // Los tests ya vienen ordenados del backend (más reciente primero)
    // Si no están ordenados, ordenarlos por fecha
    const testsOrdenados = [...maquina.tests].sort((a, b) => {
      const fechaA = new Date(a.hora_test || a.fecha_test);
      const fechaB = new Date(b.hora_test || b.fecha_test);
      return fechaB - fechaA; // Más reciente primero
    });
    
    return testsOrdenados[0];
  };

  // Calcular el siguiente número de telaio cuando se abre el formulario o cambian las máquinas
  useEffect(() => {
    if (showForm && maquinas.length > 0) {
      // Obtener todos los números de telaio que sean numéricos
      const numerosTelaio = maquinas
        .map(m => m.numero_telaio)
        .filter(num => /^\d+$/.test(num))
        .map(num => parseInt(num))
        .sort((a, b) => b - a);
      
      if (numerosTelaio.length > 0) {
        const ultimoNumero = numerosTelaio[0];
        const siguienteNumero = (ultimoNumero + 1).toString();
        setFormData(prev => ({
          ...prev,
          numero_telaio: siguienteNumero
        }));
      } else {
        // Si no hay números, empezar con 1
        setFormData(prev => ({
          ...prev,
          numero_telaio: '1'
        }));
      }
    }
  }, [showForm, maquinas]);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ ...notification, show: false }), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [maquinasData, tecnicosData] = await Promise.all([
        maquinasAPI.getAll(),
        tecnicosAPI.getAll(),
      ]);

      setMaquinas(Array.isArray(maquinasData) ? maquinasData : []);
      setTecnicos(Array.isArray(tecnicosData) ? tecnicosData : []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      showNotification(error.message || 'Errore nel caricamento dei dati', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = {
        numero_telaio: formData.numero_telaio,
        seriale_compressore: formData.seriale_compressore,
        tecnicoId: parseInt(formData.tecnicoId),
      };

      // Agregar campos opcionales solo si tienen valor
      if (formData.tipo_gas) dataToSend.tipo_gas = formData.tipo_gas;
      if (formData.quantita_gas) dataToSend.quantita_gas = parseFloat(formData.quantita_gas);
      if (formData.tipo_valvola) dataToSend.tipo_valvola = formData.tipo_valvola;
      if (formData.annotazioni) dataToSend.annotazioni = formData.annotazioni;
      if (formData.stato) {
        // Normalizar el estado antes de enviarlo
        const statoNormalizado = normalizarEstado(formData.stato);
        const statiValidos = estadoOptions.map(opt => opt.value);
        if (statiValidos.includes(statoNormalizado)) {
          dataToSend.stato = statoNormalizado;
        }
      }
      if (formData.data_consegna) dataToSend.data_consegna = formData.data_consegna;

      // Enviar archivos directamente (no Base64)
      const files = {};
      if (foto1) files.foto1 = foto1;
      if (foto2) files.foto2 = foto2;

      await maquinasAPI.create(dataToSend, files);
      showNotification('Macchina registrata con successo!', 'success');
      setShowForm(false);
      setFormData({
        numero_telaio: '',
        seriale_compressore: '',
        tipo_gas: '',
        quantita_gas: '',
        tipo_valvola: '',
        annotazioni: '',
        stato: '',
        tecnicoId: '',
        data_consegna: '',
      });
      setFoto1(null);
      setFoto1Preview(null);
      setFoto2(null);
      setFoto2Preview(null);
      loadData();
    } catch (error) {
      console.error('Error al crear máquina:', error);
      showNotification(error.message || 'Errore nella registrazione della macchina', 'error');
    }
  };

  // Obtener valores únicos para filtros (solo estados válidos)
  const statiValidos = estadoOptions.map(opt => opt.value);
  const statiUnici = [...new Set(maquinas.map(m => normalizarEstado(m.stato)).filter(Boolean))].filter(s => statiValidos.includes(s));
  const tiposGasUnici = [...new Set(maquinas.map(m => m.tipo_gas).filter(Boolean))];
  
  // Filtrar máquinas según criterios de búsqueda
  const maquinasFiltradas = maquinas.filter((maquina) => {
    const matchSearch = searchTerm === '' || 
      maquina.numero_telaio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (maquina.seriale_compressore && maquina.seriale_compressore.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchEstado = filterEstado === '' || normalizarEstado(maquina.stato) === normalizarEstado(filterEstado);
    const matchTecnico = filterTecnico === '' || maquina.id_tecnico === Number(filterTecnico);
    const matchTipoGas = filterTipoGas === '' || maquina.tipo_gas === filterTipoGas;
    return matchSearch && matchEstado && matchTecnico && matchTipoGas;
  });

  // Ordenar solo por numero_telaio
  const maquinasOrdenadas = [...maquinasFiltradas].sort((a, b) => {
    const numA = parseInt(a.numero_telaio) || 0;
    const numB = parseInt(b.numero_telaio) || 0;
    
    if (numA !== 0 && numB !== 0) {
      // Ambos son numéricos, ordenar numéricamente
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    } else if (numA !== 0) {
      // Solo A es numérico, va primero
      return sortOrder === 'asc' ? -1 : 1;
    } else if (numB !== 0) {
      // Solo B es numérico, va primero
      return sortOrder === 'asc' ? 1 : -1;
    } else {
      // Ninguno es numérico, ordenar alfabéticamente
      return sortOrder === 'asc' 
        ? a.numero_telaio.localeCompare(b.numero_telaio)
        : b.numero_telaio.localeCompare(a.numero_telaio);
    }
  });

  /**
   * Maneja el cambio directo de estado de una máquina (sin modo edición)
   * @param {number} maquinaId - ID de la máquina
   * @param {string} nuevoEstado - Nuevo estado a asignar
   */
  const handleEstadoChange = (maquinaId, nuevoEstado) => {
    if (!puedeEditar) return;
    
    // Obtener información de la máquina primero
    const maquina = maquinas.find(m => m.id_maquina === maquinaId);
    if (!maquina) return;
    
      // Mapear "completata" a "ok" si viene de datos antiguos
      const statoNormalizado = normalizarEstado(nuevoEstado);
      const statoFinal = statoNormalizado === 'completata' ? 'ok' : statoNormalizado;
      
      // Validar que el estado sea uno de los válidos
      const statiValidos = estadoOptions.map(opt => opt.value);
      
      if (nuevoEstado && !statiValidos.includes(statoFinal)) {
        showNotification('Stato non valido. Seleziona uno stato dalla lista.', 'error');
        return;
      }
      
    // Obtener etiquetas de los estados
    const statoAnteriorNorm = normalizarEstado(maquina.stato);
    const statoAnteriorMapeado = statoAnteriorNorm === 'completata' ? 'ok' : statoAnteriorNorm;
    const estadoAnteriorLabel = estadoOptions.find(opt => opt.value === statoAnteriorMapeado)?.label || 'Sin estado';
    const estadoNuevoLabel = estadoOptions.find(opt => opt.value === statoFinal)?.label || 'Sin estado';
    
    // Mostrar modal de confirmación
    setConfirmEstadoModal({
      show: true,
      maquinaId: maquinaId,
      nuevoEstado: statoFinal || null,
      estadoAnterior: maquina.stato,
      maquinaInfo: {
        numero_telaio: maquina.numero_telaio,
        estadoAnteriorLabel: estadoAnteriorLabel,
        estadoNuevoLabel: estadoNuevoLabel
      }
    });
  };

  /**
   * Confirma y guarda el cambio de estado de una máquina
   */
  const confirmarCambioEstado = async () => {
    const { maquinaId, nuevoEstado } = confirmEstadoModal;
    
    if (!maquinaId) return;
    
    try {
      // Actualizar en el backend
      const maquinaActualizada = await maquinasAPI.update(maquinaId, { stato: nuevoEstado });
      
      // Actualizar el estado local con la respuesta del servidor
      if (maquinaActualizada) {
        setMaquinas(prevMaquinas => 
          prevMaquinas.map(maquina => 
            maquina.id_maquina === maquinaId 
              ? { ...maquina, ...maquinaActualizada }
              : maquina
          )
        );
        
        // Actualizar también el modal si está abierto - cargar información completa desde el backend
        if (detalleModal.show && detalleModal.maquina?.id_maquina === maquinaId) {
          try {
            const maquinaCompleta = await maquinasAPI.getById(maquinaId);
            if (maquinaCompleta) {
              setDetalleModal({ ...detalleModal, maquina: maquinaCompleta });
            }
          } catch (error) {
            console.error('Error al recargar detalles de la máquina:', error);
            // Si falla, actualizar con los datos disponibles
            setDetalleModal({
              ...detalleModal,
              maquina: { ...detalleModal.maquina, ...maquinaActualizada }
            });
          }
        }
      } else {
        // Si no hay respuesta, actualizar manualmente con el nuevo estado
        setMaquinas(prevMaquinas => 
          prevMaquinas.map(maquina => 
            maquina.id_maquina === maquinaId 
              ? { ...maquina, stato: nuevoEstado }
              : maquina
          )
        );
        
        if (detalleModal.show && detalleModal.maquina?.id_maquina === maquinaId) {
          setDetalleModal({
            ...detalleModal,
            maquina: { ...detalleModal.maquina, stato: nuevoEstado }
          });
        }
      }
      
      // Cerrar modal de confirmación
      setConfirmEstadoModal({ 
        show: false, 
        maquinaId: null, 
        nuevoEstado: null, 
        estadoAnterior: null,
        maquinaInfo: null 
      });
      
      showNotification('Stato aggiornato con successo', 'success');
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      showNotification(error.message || 'Errore nell\'aggiornamento dello stato', 'error');
      
      // Cerrar modal de confirmación incluso si hay error
      setConfirmEstadoModal({ 
        show: false, 
        maquinaId: null, 
        nuevoEstado: null, 
        estadoAnterior: null,
        maquinaInfo: null 
      });
    }
  };

  const handleEditGas = (maquina) => {
    if (!puedeEditar) return;
    setEditingGas(maquina.id_maquina);
    setGasEditValue(maquina.quantita_gas?.toString() || '');
  };

  const handleSaveGas = async (maquinaId) => {
    try {
      await maquinasAPI.update(maquinaId, { 
        quantita_gas: gasEditValue ? parseFloat(gasEditValue) : null 
      });
      showNotification('Quantità di gas aggiornata con successo', 'success');
      setEditingGas(null);
      loadData();
    } catch (error) {
      console.error('Error al actualizar cantidad de gas:', error);
      showNotification(error.message || 'Errore nell\'aggiornamento della quantità di gas', 'error');
    }
  };

  const handleCancelEditGas = () => {
    setEditingGas(null);
    setGasEditValue('');
  };

  /**
   * Inicia la edición de un campo de una máquina
   * @param {Object} maquina - Objeto máquina
   * @param {string} field - Nombre del campo a editar
   */
  const handleStartEdit = (maquina, field) => {
    if (!puedeEditar) return;
    let value = maquina[field];
    // Manejar campos especiales
    if (field === 'tecnicoId') {
      value = maquina.id_tecnico || '';
    } else if (field === 'data_consegna' && value) {
      // Convertir fecha a formato YYYY-MM-DD para input type="date"
      value = new Date(value).toISOString().split('T')[0];
    }
    setEditingField({ maquinaId: maquina.id_maquina, field, value: value || '' });
  };

  /**
   * Guarda la edición de un campo de una máquina
   * @param {number} maquinaId - ID de la máquina
   * @param {string} field - Nombre del campo
   * @param {any} value - Nuevo valor del campo
   */
  const handleSaveField = async (maquinaId, field, value) => {
    try {
      const updateData = { [field]: value };
      
      // Conversiones especiales
      if (field === 'quantita_gas') {
        updateData[field] = value ? parseFloat(value) : null;
      } else if (field === 'id_tecnico' || field === 'tecnicoId') {
        updateData.tecnicoId = value ? Number(value) : null;
      } else if (field === 'data_consegna') {
        updateData.data_consegna = value ? new Date(value + 'T00:00:00') : null;
      } else if (value === '') {
        updateData[field] = null;
      }

      await maquinasAPI.update(maquinaId, updateData);
      showNotification('Campo aggiornato con successo', 'success');
      setEditingField(null);
      
      // Actualizar el modal si está abierto - cargar información completa desde el backend
      if (detalleModal.show && detalleModal.maquina?.id_maquina === maquinaId) {
        try {
          const maquinaCompleta = await maquinasAPI.getById(maquinaId);
          if (maquinaCompleta) {
            setDetalleModal({ ...detalleModal, maquina: maquinaCompleta });
          }
        } catch (error) {
          console.error('Error al recargar detalles de la máquina:', error);
        }
      }
      
      loadData();
    } catch (error) {
      console.error('Error al actualizar campo:', error);
      // No cerrar sesión si el error no es de autenticación (401)
      // Solo mostrar el error sin redirigir
      const errorMessage = error.message || 'Errore nell\'aggiornamento del campo';
      showNotification(errorMessage, 'error');
      // Mantener el campo en edición si el error no es crítico
      if (!errorMessage.includes('autenticato') && !errorMessage.includes('Sessione scaduta')) {
        // No hacer nada, mantener el campo en edición para que el usuario pueda intentar de nuevo
      }
    }
  };

  const handleCancelEditField = () => {
    setEditingField(null);
  };

  /**
   * Alterna la selección de una máquina
   * @param {number} maquinaId - ID de la máquina
   */
  const handleToggleSelectMaquina = (maquinaId) => {
    setSelectedMaquinas(prev => {
      if (prev.includes(maquinaId)) {
        return prev.filter(id => id !== maquinaId);
      } else {
        return [...prev, maquinaId];
      }
    });
  };

  /**
   * Selecciona o deselecciona todas las máquinas visibles
   */
  const handleSelectAll = () => {
    // Usar maquinasOrdenadas que es la lista filtrada y ordenada que se muestra
    if (selectedMaquinas.length === maquinasOrdenadas.length && maquinasOrdenadas.length > 0) {
      setSelectedMaquinas([]);
    } else {
      setSelectedMaquinas(maquinasOrdenadas.map(m => m.id_maquina));
    }
  };

  const handleBatchConsegna = async () => {
    if (selectedMaquinas.length === 0) {
      showNotification('Seleziona almeno una macchina', 'error');
      return;
    }

    try {
      setProcessingBatch(true);
      await maquinasAPI.updateBatch(selectedMaquinas, {
        data_consegna: batchConsegnaDate
      });
      showNotification(`${selectedMaquinas.length} macchina(e) marcate come consegnate`, 'success');
      setSelectedMaquinas([]);
      setShowBatchConsegnaModal(false);
      loadData();
    } catch (error) {
      console.error('Error al marcar máquinas como entregadas:', error);
      showNotification(error.message || 'Errore nella marcatura in lote', 'error');
    } finally {
      setProcessingBatch(false);
    }
  };

  /**
   * Maneja el cambio de foto (foto1 o foto2)
   * @param {number} fotoNumber - Número de foto (1 o 2)
   * @param {Event} e - Evento del input file
   */
  const handleFotoChange = (fotoNumber, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // Límite de 5MB
        showNotification('La foto non può superare 5MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showNotification('Il file deve essere un\'immagine', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (fotoNumber === 1) {
          setFoto1(file);
          setFoto1Preview(reader.result);
        } else {
          setFoto2(file);
          setFoto2Preview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Elimina una foto (foto1 o foto2)
   * @param {number} fotoNumber - Número de foto (1 o 2)
   */
  const handleRemoveFoto = (fotoNumber) => {
    if (fotoNumber === 1) {
      setFoto1(null);
      setFoto1Preview(null);
    } else {
      setFoto2(null);
      setFoto2Preview(null);
    }
  };

  /**
   * Abre el modal de detalles de una máquina
   * @param {Object} maquina - Objeto máquina
   */
  const handleOpenDetalleModal = async (maquina) => {
    // Mostrar el modal inmediatamente con los datos disponibles
    setDetalleModal({ show: true, maquina });
    setFotoIndex(0);
    setEditandoFotos(false);
    setNuevasFotos({ foto1: null, foto2: null });
    setPreviewsFotos({ foto1: null, foto2: null });
    setEliminarFotos({ foto1: false, foto2: false });
    setFotosError({}); // Resetear errores de fotos
    
    // Cargar la información completa de la máquina desde el backend para obtener los tests con técnico
    try {
      const maquinaCompleta = await maquinasAPI.getById(maquina.id_maquina);
      if (maquinaCompleta) {
        setDetalleModal({ show: true, maquina: maquinaCompleta });
      }
    } catch (error) {
      console.error('Error al cargar detalles completos de la máquina:', error);
      // Si falla, mantener los datos que ya tenemos
    }
  };

  /**
   * Maneja el cambio de foto en el modal
   * @param {number} fotoNumber - Número de foto (1 o 2)
   * @param {Event} e - Evento del input file
   */
  const handleFotoChangeModal = (fotoNumber, e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('La foto non può superare 5MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        showNotification('Il file deve essere un\'immagine', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        if (fotoNumber === 1) {
          setNuevasFotos({ ...nuevasFotos, foto1: file });
          setPreviewsFotos({ ...previewsFotos, foto1: reader.result });
          setEliminarFotos({ ...eliminarFotos, foto1: false });
        } else {
          setNuevasFotos({ ...nuevasFotos, foto2: file });
          setPreviewsFotos({ ...previewsFotos, foto2: reader.result });
          setEliminarFotos({ ...eliminarFotos, foto2: false });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Elimina una foto nueva del modal
   * @param {number} fotoNumber - Número de foto (1 o 2)
   */
  const handleRemoveFotoModal = (fotoNumber) => {
    if (fotoNumber === 1) {
      setNuevasFotos({ ...nuevasFotos, foto1: null });
      setPreviewsFotos({ ...previewsFotos, foto1: null });
    } else {
      setNuevasFotos({ ...nuevasFotos, foto2: null });
      setPreviewsFotos({ ...previewsFotos, foto2: null });
    }
  };

  /**
   * Marca una foto para eliminar
   * @param {number} fotoNumber - Número de foto (1 o 2)
   */
  const handleMarcarEliminarFoto = (fotoNumber) => {
    setEliminarFotos({ ...eliminarFotos, [fotoNumber === 1 ? 'foto1' : 'foto2']: true });
    setNuevasFotos({ ...nuevasFotos, [fotoNumber === 1 ? 'foto1' : 'foto2']: null });
    setPreviewsFotos({ ...previewsFotos, [fotoNumber === 1 ? 'foto1' : 'foto2']: null });
  };

  /**
   * Desmarca una foto para eliminar
   * @param {number} fotoNumber - Número de foto (1 o 2)
   */
  const handleDesmarcarEliminarFoto = (fotoNumber) => {
    setEliminarFotos({ ...eliminarFotos, [fotoNumber === 1 ? 'foto1' : 'foto2']: false });
  };

  /**
   * Guarda las fotos actualizadas
   */
  const handleGuardarFotos = async () => {
    if (!detalleModal.maquina) return;

    try {
      setGuardandoFotos(true);
      const updateData = {};
      const files = {};

      // Preparar datos para actualizar
      if (eliminarFotos.foto1) {
        updateData.foto1 = null;
      } else if (nuevasFotos.foto1) {
        files.foto1 = nuevasFotos.foto1;
      }

      if (eliminarFotos.foto2) {
        updateData.foto2 = null;
      } else if (nuevasFotos.foto2) {
        files.foto2 = nuevasFotos.foto2;
      }

      // Solo actualizar si hay cambios
      if (Object.keys(updateData).length > 0 || Object.keys(files).length > 0) {
        await maquinasAPI.update(detalleModal.maquina.id_maquina, updateData, files);
        showNotification('Fotos aggiornate con successo!', 'success');
        
        // Recargar datos y actualizar el modal
        await loadData();
        const maquinasActualizadas = await maquinasAPI.getAll();
        const maquinaActualizada = maquinasActualizadas.find(m => m.id_maquina === detalleModal.maquina.id_maquina);
        if (maquinaActualizada) {
          setDetalleModal({ ...detalleModal, maquina: maquinaActualizada });
        }
        
        // Limpiar estados
        setEditandoFotos(false);
        setNuevasFotos({ foto1: null, foto2: null });
        setPreviewsFotos({ foto1: null, foto2: null });
        setEliminarFotos({ foto1: false, foto2: false });
      } else {
        showNotification('Nessuna modifica da salvare', 'info');
      }
    } catch (error) {
      console.error('Errore nel salvataggio delle foto:', error);
      // El mensaje de error ya está traducido a italiano en api.js
      showNotification(error.message || 'Errore nel salvataggio delle foto', 'error');
    } finally {
      setGuardandoFotos(false);
    }
  };

  /**
   * Elimina una foto directamente desde la galería (sin modo edición)
   * @param {string} fotoField - Campo de la foto ('foto1' o 'foto2')
   */
  const handleEliminarFotoDirecta = async (fotoField) => {
    if (!detalleModal.maquina) return;

    // Confirmar eliminación
    if (!window.confirm('Sei sicuro di voler eliminare questa foto? L\'operazione non può essere annullata.')) {
      return;
    }

    try {
      setGuardandoFotos(true);
      const updateData = { [fotoField]: null };
      
      await maquinasAPI.update(detalleModal.maquina.id_maquina, updateData, {});
      showNotification('Foto eliminata con successo!', 'success');
      
      // Recargar datos y actualizar el modal
      await loadData();
      const maquinasActualizadas = await maquinasAPI.getAll();
      const maquinaActualizada = maquinasActualizadas.find(m => m.id_maquina === detalleModal.maquina.id_maquina);
      if (maquinaActualizada) {
        setDetalleModal({ ...detalleModal, maquina: maquinaActualizada });
        // Si eliminamos la foto actual, ajustar el índice
        const fotos = getFotos(maquinaActualizada);
        if (fotoIndex >= fotos.length && fotos.length > 0) {
          setFotoIndex(fotos.length - 1);
        } else if (fotos.length === 0) {
          setFotoIndex(0);
        }
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione della foto:', error);
      showNotification(error.message || 'Errore nell\'eliminazione della foto', 'error');
    } finally {
      setGuardandoFotos(false);
    }
  };

  /**
   * Obtiene la URL de una foto formateada correctamente
   * @param {string} foto - URL o base64 de la foto
   * @returns {string} - URL formateada
   */
  const getFotoUrl = (foto) => {
    if (!foto) return null;
    
    // Si ya es una data URL, retornarla tal cual
    if (foto.startsWith('data:image')) {
      return foto;
    }
    
    // Si es una URL HTTP/HTTPS
    if (foto.startsWith('http://') || foto.startsWith('https://')) {
      // Si ya es una URL de uc?export=view, retornarla tal cual (formato correcto)
      if (foto.includes('drive.google.com/uc?export=view')) {
        return foto;
      }
      
      // Extraer el ID del archivo de diferentes formatos de URL de Google Drive
      let fileId = null;
      
      // Formato: /file/d/{id}
      const match1 = foto.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match1 && match1[1]) {
        fileId = match1[1];
      }
      
      // Formato: /d/{id}
      if (!fileId) {
        const match2 = foto.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match2 && match2[1]) {
          fileId = match2[1];
        }
      }
      
      // Formato: ?id={id} o &id={id}
      if (!fileId) {
        const match3 = foto.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (match3 && match3[1]) {
          fileId = match3[1];
        }
      }
      
      // Si encontramos un ID, convertir a formato de imagen directa
      if (fileId) {
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
      
      // Si es otra URL de Google Drive pero no pudimos extraer el ID, intentar con la URL completa
      if (foto.includes('drive.google.com')) {
        // Si es webViewLink o similar, intentar extraer de otra forma
        const webMatch = foto.match(/drive\.google\.com\/[^/]+\/([a-zA-Z0-9_-]+)/);
        if (webMatch && webMatch[1]) {
          return `https://drive.google.com/uc?export=view&id=${webMatch[1]}`;
        }
      }
      
      // Si no es Google Drive o no pudimos convertir, retornar la URL original
      return foto;
    }
    
    // Si es base64 sin prefijo, agregarlo
    return `data:image/jpeg;base64,${foto}`;
  };

  /**
   * Obtiene todas las fotos de una máquina
   * @param {Object} maquina - Objeto máquina
   * @returns {Array} - Array de URLs de fotos
   */
  const getFotos = (maquina) => {
    const fotos = [];
    if (maquina.foto1) {
      const url = getFotoUrl(maquina.foto1);
      if (url) fotos.push({ url, title: `Foto 1 - ${maquina.numero_telaio}` });
    }
    if (maquina.foto2) {
      const url = getFotoUrl(maquina.foto2);
      if (url) fotos.push({ url, title: `Foto 2 - ${maquina.numero_telaio}` });
    }
    return fotos;
  };


  if (loading) {
    return <LoadingSpinner message="Caricamento macchine..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden px-1">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 leading-tight">
            Registri Macchine
          </h2>
          <p className="text-gray-600 text-sm sm:text-base hidden sm:block">
            Gestisci e registra tutte le tue macchine prodotte
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto text-sm sm:text-sm lg:text-base min-h-[44px]"
        >
          {showForm ? (
            <>
              <FiX className="w-4 h-4" />
              <span>Annulla</span>
            </>
          ) : (
            <>
              <FiPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Nuova Macchina</span>
              <span className="sm:hidden">Nuova</span>
            </>
          )}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-3 sm:p-4 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 lg:mb-6">
            <div className="bg-primary-50 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
              <FiPackage className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
            </div>
            <h3 className="text-base sm:text-lg lg:text-2xl font-bold text-gray-900">Registra Nuova Macchina</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Numero di Telaio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="numero_telaio"
                  value={formData.numero_telaio}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="Inserisci il numero di telaio"
                />
                <p className="text-xs text-gray-500 mt-1">Il numero viene generato automaticamente basato sull'ultimo telaio</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Seriale Compressore <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="seriale_compressore"
                  value={formData.seriale_compressore}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="Inserisci il seriale del compressore"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo di Gas
                </label>
                <select
                  name="tipo_gas"
                  value={formData.tipo_gas}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Seleziona tipo di gas</option>
                  <option value="R449a">R449a</option>
                  <option value="R404a">R404a</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantità di Gas (g)
                </label>
                <input
                  type="number"
                  step="1"
                  name="quantita_gas"
                  value={formData.quantita_gas}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tipo di Valvola
                </label>
                <select
                  name="tipo_valvola"
                  value={formData.tipo_valvola}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Seleziona tipo di valvola</option>
                  <option value="R449A">R449A</option>
                  <option value="R404">R404</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Tecnico Responsabile <span className="text-red-500">*</span>
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Stato
                </label>
                <ModernDropdown
                  value={formData.stato}
                  onChange={(value) => setFormData(prev => ({ ...prev, stato: value }))}
                  options={estadoOptions}
                  placeholder="Seleziona stato"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Data di Consegna
                </label>
                <input
                  type="date"
                  name="data_consegna"
                  value={formData.data_consegna}
                  onChange={handleInputChange}
                  className="input-field"
                />
              </div>
            </div>

            {/* Upload Fotos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FiImage className="w-4 h-4 text-primary-600" />
                  Foto 1
                </label>
                {foto1Preview ? (
                  <div className="relative">
                    <img 
                      src={foto1Preview} 
                      alt="Preview Foto 1" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFoto(1)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Rimuovi foto"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FiImage className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Clicca per caricare</span> o trascina qui
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFotoChange(1, e)}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FiImage className="w-4 h-4 text-primary-600" />
                  Foto 2
                </label>
                {foto2Preview ? (
                  <div className="relative">
                    <img 
                      src={foto2Preview} 
                      alt="Preview Foto 2" 
                      className="w-full h-48 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFoto(2)}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Rimuovi foto"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FiImage className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Clicca per caricare</span> o trascina qui
                      </p>
                      <p className="text-xs text-gray-500">PNG, JPG (MAX. 5MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleFotoChange(2, e)}
                    />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Annotazioni
              </label>
              <textarea
                name="annotazioni"
                value={formData.annotazioni}
                onChange={handleInputChange}
                rows={4}
                className="input-field resize-none"
                placeholder="Note aggiuntive sulla macchina..."
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="btn-primary w-full sm:w-auto order-1 sm:order-2"
              >
                Registra Macchina
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="card p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 lg:gap-4">
          <div className="md:col-span-8">
            <div className="relative">
              <FiSearch className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Cerca per numero di telaio o seriale..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10 sm:pl-12 text-sm sm:text-base"
              />
            </div>
          </div>
          <div className="md:col-span-4 flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn-secondary flex items-center justify-center gap-2 flex-1 text-xs sm:text-sm lg:text-base min-h-[44px]"
            >
              <FiFilter className="w-4 h-4" />
              <span className="hidden sm:inline">Filtri</span>
              <span className="sm:hidden">Filtri</span>
            </button>
            <button
              onClick={loadData}
              className="btn-secondary p-2.5 sm:p-3 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Aggiorna"
            >
              <FiRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filtra per Stato
                </label>
                <select
                  value={filterEstado}
                  onChange={(e) => setFilterEstado(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Tutti gli stati</option>
                  {estadoOptions.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filtra per Tecnico
                </label>
                <select
                  value={filterTecnico}
                  onChange={(e) => setFilterTecnico(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Tutti i tecnici</option>
                  {tecnicos.map((tecnico) => (
                    <option key={tecnico.id_tecnico} value={tecnico.id_tecnico}>
                      {tecnico.nome} {tecnico.cognome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Filtra per Tipo Gas
                </label>
                <select
                  value={filterTipoGas}
                  onChange={(e) => setFilterTipoGas(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="">Tutti i tipi</option>
                  {tiposGasUnici.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ordina per Telaio
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="asc">Crescente (1, 2, 3...)</option>
                  <option value="desc">Decrescente (...3, 2, 1)</option>
                </select>
              </div>
            </div>

            {(filterEstado || filterTecnico || filterTipoGas) && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => {
                    setFilterEstado('');
                    setFilterTecnico('');
                    setFilterTipoGas('');
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Rimuovi tutti i filtri
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-3 sm:p-4 lg:p-6">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4 lg:mb-6">
          Macchine Registrate ({maquinasOrdenadas.length})
        </h3>
        <div className="w-full max-w-full overflow-hidden">
          {/* Barra de acciones en lote */}
          {selectedMaquinas.length > 0 && (
            <div className="mb-4 p-3 sm:p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <FiTruck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                <span className="font-semibold text-indigo-900 text-sm sm:text-base">
                  {selectedMaquinas.length} macchina(e) selezionata(e)
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowBatchConsegnaModal(true)}
                  className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto"
                >
                  <FiTruck className="w-4 h-4" />
                  <span className="hidden sm:inline">Marca come Consegnate</span>
                  <span className="sm:hidden">Marca Consegnate</span>
                </button>
                <button
                  onClick={() => setSelectedMaquinas([])}
                  className="btn-secondary text-sm sm:text-base w-full sm:w-auto"
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {/* Desktop Table View */}
          <div className="hidden md:block w-full max-w-full">
            <div className="w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              <table className="w-full" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr className="border-b border-gray-200">
                      <th className="text-left py-2 md:py-3 px-1.5 md:px-2 lg:px-3 text-xs font-bold text-gray-600 uppercase w-10 md:w-12">
                        <input
                          type="checkbox"
                          checked={selectedMaquinas.length === maquinasOrdenadas.length && maquinasOrdenadas.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </th>
                      <th className="text-left py-2 md:py-3 px-1.5 md:px-2 lg:px-3 text-xs font-bold text-gray-600 uppercase whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          Telaio
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title={`Ordina ${sortOrder === 'asc' ? 'decrescente' : 'crescente'}`}
                          >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                          </button>
                        </div>
                      </th>
                  <th className="text-left py-3 px-2 md:px-3 lg:px-4 text-xs font-bold text-gray-600 uppercase hidden lg:table-cell">Seriale</th>
                  <th className="text-left py-3 px-2 md:px-3 lg:px-4 text-xs font-bold text-gray-600 uppercase hidden xl:table-cell">Tipo Gas</th>
                  <th className="text-left py-3 px-2 md:px-3 lg:px-4 text-xs font-bold text-gray-600 uppercase hidden xl:table-cell">Quantità Gas</th>
                  <th className="text-left py-3 px-2 md:px-3 lg:px-4 text-xs font-bold text-gray-600 uppercase min-w-[120px]">Stato</th>
                  <th className="text-left py-3 px-2 md:px-3 lg:px-4 text-xs font-bold text-gray-600 uppercase hidden xl:table-cell">Tecnico</th>
                  <th className="text-left py-3 px-2 md:px-3 lg:px-4 text-xs font-bold text-gray-600 uppercase hidden 2xl:table-cell">Ultima Prova</th>
                  <th className="text-left py-3 px-2 md:px-3 lg:px-4 text-xs font-bold text-gray-600 uppercase w-32">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {maquinasOrdenadas.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 font-semibold text-lg">Nessuna macchina trovata</p>
                    </td>
                  </tr>
                ) : (
                  maquinasOrdenadas.map((maquina) => {
                    const ultimaPrueba = obtenerUltimaPrueba(maquina);
                    return (
                      <tr 
                        key={maquina.id_maquina} 
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleOpenDetalleModal(maquina)}
                      >
                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedMaquinas.includes(maquina.id_maquina)}
                            onChange={() => handleToggleSelectMaquina(maquina.id_maquina)}
                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                        </td>
                        <td className="py-3 md:py-4 px-1.5 md:px-2 lg:px-3">
                          <div className="text-xs md:text-sm font-semibold text-gray-900">
                            {maquina.numero_telaio}
                          </div>
                        </td>
                        <td className="py-3 md:py-4 px-1.5 md:px-2 lg:px-3 hidden lg:table-cell">
                          <div className="text-xs md:text-sm text-gray-600">
                            {maquina.seriale_compressore || '-'}
                          </div>
                        </td>
                        <td className="py-3 md:py-4 px-1.5 md:px-2 lg:px-3 hidden xl:table-cell">
                          <div className="text-xs md:text-sm text-gray-600">
                            {maquina.tipo_gas || '-'}
                          </div>
                        </td>
                        <td className="py-3 md:py-4 px-1.5 md:px-2 lg:px-3 hidden xl:table-cell">
                          <div className="text-xs md:text-sm text-gray-600">
                            {maquina.quantita_gas !== null && maquina.quantita_gas !== undefined 
                              ? `${maquina.quantita_gas} g` 
                              : '-'}
                          </div>
                        </td>
                        <td className="py-3 md:py-4 px-1.5 md:px-2 lg:px-3" onClick={(e) => e.stopPropagation()}>
                          {puedeEditar ? (
                            <div className="min-w-[140px]">
                              <ModernDropdown
                                key={`estado-${maquina.id_maquina}-${maquina.stato || 'null'}`}
                                value={(() => {
                                  const statoNorm = normalizarEstado(maquina.stato);
                                  return statoNorm === 'completata' ? 'ok' : (statoNorm || '');
                                })()}
                                onChange={(value) => handleEstadoChange(maquina.id_maquina, value)}
                                options={estadoOptions}
                                placeholder="Seleziona stato"
                                size="small"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {(() => {
                                const statoNormalizado = normalizarEstado(maquina.stato);
                                const statoMapeado = statoNormalizado === 'completata' ? 'ok' : statoNormalizado;
                                const estado = estadoOptions.find(opt => opt.value === statoMapeado);
                                if (estado) {
                                  return (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                                      <span className={estado.iconColor}>{estado.icon}</span>
                                      <span className="text-xs font-semibold text-gray-700">{estado.label}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 border border-gray-200">
                                    {maquina.stato || 'Senza stato'}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 md:py-4 px-1.5 md:px-2 lg:px-3 hidden xl:table-cell">
                          <div className="text-xs md:text-sm text-gray-600 truncate max-w-[150px]">
                            {maquina.tecnico
                              ? `${maquina.tecnico.nome} ${maquina.tecnico.cognome}`
                              : '-'}
                          </div>
                        </td>
                        <td className="py-3 md:py-4 px-1.5 md:px-2 lg:px-3 hidden 2xl:table-cell">
                          {ultimaPrueba && (ultimaPrueba.tempo_0_gradi || ultimaPrueba.tempo_meno8_gradi) ? (
                            <div className="text-xs md:text-sm">
                              <div className="font-semibold text-gray-900">
                                {segundosAMinutosSegundos(ultimaPrueba.tempo_0_gradi)} / {segundosAMinutosSegundos(ultimaPrueba.tempo_meno8_gradi)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {ultimaPrueba.tempo_0_gradi ? '0°C' : ''} {ultimaPrueba.tempo_0_gradi && ultimaPrueba.tempo_meno8_gradi ? '•' : ''} {ultimaPrueba.tempo_meno8_gradi ? '-8°C' : ''}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">-</div>
                          )}
                        </td>
                        <td className="py-3 md:py-4 px-1.5 md:px-2 lg:px-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetalleModal(maquina)}
                            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                            title="Visualizza dettagli"
                          >
                            <FiPackage className="w-3 h-3" />
                            Dettagli
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3 w-full max-w-full overflow-hidden">
            {maquinasOrdenadas.length === 0 ? (
              <div className="text-center py-12">
                <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold text-base">Nessuna macchina trovata</p>
              </div>
            ) : (
              <>
                {/* Select All Mobile */}
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedMaquinas.length === maquinasOrdenadas.length && maquinasOrdenadas.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0"
                  />
                  <span className="text-sm font-semibold text-gray-700 flex-1 min-w-0 truncate">
                    Seleziona tutte ({maquinasOrdenadas.length})
                  </span>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0 min-h-[44px]"
                  >
                    Ordina {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>

                {maquinasOrdenadas.map((maquina) => {
                  const statoNormalizado = normalizarEstado(maquina.stato);
                  const statoMapeado = statoNormalizado === 'completata' ? 'ok' : statoNormalizado;
                  const estado = estadoOptions.find(opt => opt.value === statoMapeado);
                  const ultimaPrueba = obtenerUltimaPrueba(maquina);
                  const numTests = maquina.tests ? maquina.tests.length : 0;
                  const tecnico = maquina.tecnico;
                  
                  return (
                    <div
                      key={maquina.id_maquina}
                      className={`p-3.5 rounded-lg border-2 transition-all w-full max-w-full ${
                        selectedMaquinas.includes(maquina.id_maquina)
                          ? 'border-primary-400 bg-primary-50'
                          : 'border-gray-200 bg-white hover:border-primary-200 hover:shadow-sm'
                      }`}
                    >
                      {/* Primera fila: Checkbox, Telaio y Estado */}
                      <div className="flex items-start justify-between mb-2.5 gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedMaquinas.includes(maquina.id_maquina)}
                            onChange={() => handleToggleSelectMaquina(maquina.id_maquina)}
                            className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 flex-shrink-0 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="text-base font-bold text-gray-900 truncate">
                                {maquina.numero_telaio}
                              </h4>
                              {estado && (
                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md ${estado.badgeColor} flex-shrink-0`}>
                                  <span className={estado.iconColor}>{estado.icon}</span>
                                  <span className="text-xs font-semibold">{estado.label}</span>
                                </div>
                              )}
                            </div>
                            {maquina.seriale_compressore && (
                              <p className="text-xs text-gray-600 mb-1 truncate">
                                Seriale: {maquina.seriale_compressore}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Segunda fila: Información adicional */}
                      <div className="grid grid-cols-2 gap-2 mb-2.5 pl-8">
                        {maquina.tipo_gas && (
                          <div className="flex items-center gap-1.5">
                            <FiDroplet className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700 truncate">{maquina.tipo_gas}</span>
                          </div>
                        )}
                        {tecnico && (
                          <div className="flex items-center gap-1.5">
                            <FiUser className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700 truncate">
                              {tecnico.nome} {tecnico.cognome}
                            </span>
                          </div>
                        )}
                        {numTests > 0 && (
                          <div className="flex items-center gap-1.5">
                            <FiCheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700">{numTests} test</span>
                          </div>
                        )}
                        {ultimaPrueba && (ultimaPrueba.tempo_0_gradi || ultimaPrueba.tempo_meno8_gradi) && (
                          <div className="flex items-center gap-1.5">
                            <FiThermometer className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                            <span className="text-xs text-gray-700 truncate">
                              {segundosAMinutosSegundos(ultimaPrueba.tempo_0_gradi || ultimaPrueba.tempo_meno8_gradi)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tercera fila: Botón de detalles */}
                      <div className="pl-8">
                        <button
                          onClick={() => handleOpenDetalleModal(maquina)}
                          className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-2 min-h-[40px]"
                        >
                          <FiPackage className="w-3.5 h-3.5" />
                          Visualizza Dettagli
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal para marcar en lote como entregadas */}
      {showBatchConsegnaModal && (
        <div 
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'backdropFadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="bg-white rounded-t-2xl sm:rounded-lg p-5 sm:p-6 max-w-md w-full"
            style={{ 
              animation: 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform, opacity'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiTruck className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                Marca come Consegnate
              </h3>
              <button
                onClick={() => setShowBatchConsegnaModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Sei sicuro di voler marcare <strong>{selectedMaquinas.length}</strong> macchina(e) come consegnate?
              </p>
              
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Data di Consegna <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={batchConsegnaDate}
                onChange={(e) => setBatchConsegnaDate(e.target.value)}
                className="input-field w-full"
                required
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
              <button
                onClick={() => setShowBatchConsegnaModal(false)}
                className="btn-secondary w-full sm:w-auto order-2 sm:order-1"
                disabled={processingBatch}
              >
                Annulla
              </button>
              <button
                onClick={handleBatchConsegna}
                className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto order-1 sm:order-2"
                disabled={processingBatch}
              >
                {processingBatch ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <FiTruck className="w-4 h-4" />
                    Conferma
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar fotos */}
      {fotoModal.show && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'backdropFadeIn 0.2s ease-out'
          }}
          onClick={() => setFotoModal({ show: false, url: null, title: '' })}
        >
          <div 
            className="relative max-w-4xl max-h-[95vh] sm:max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFotoModal({ show: false, url: null, title: '' })}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 bg-white rounded-full p-2 sm:p-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Chiudi"
            >
              <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <div className="p-3 sm:p-4 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">{fotoModal.title}</h3>
              </div>
              <div className="p-2 sm:p-4 flex items-center justify-center bg-gray-900">
                <img
                  src={fotoModal.url}
                  alt={fotoModal.title}
                  className="max-w-full max-h-[75vh] sm:max-h-[70vh] object-contain rounded"
                  onError={(e) => {
                    e.target.src = '';
                    e.target.alt = 'Errore nel caricamento dell\'immagine';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Máquina */}
      {detalleModal.show && detalleModal.maquina && (
        <div 
          className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 overflow-y-auto"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'backdropFadeIn 0.2s ease-out'
          }}
          onClick={() => setDetalleModal({ show: false, maquina: null })}
        >
          <div 
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col my-0 sm:my-4"
            style={{ 
              animation: 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform, opacity'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div className="bg-primary-50 p-2 rounded-lg flex-shrink-0">
                  <FiPackage className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    Macchina {detalleModal.maquina.numero_telaio}
                  </h2>
                  {detalleModal.maquina.seriale_compressore && (
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate">
                      Seriale: {detalleModal.maquina.seriale_compressore}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDetalleModal({ show: false, maquina: null })}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                title="Chiudi"
              >
                <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 rounded-b-xl">
              {/* Estado */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Stato</h3>
                {puedeEditar ? (
                  <div className="w-full sm:min-w-[200px] sm:w-auto">
                    <ModernDropdown
                      key={`estado-modal-${detalleModal.maquina.id_maquina}-${detalleModal.maquina.stato || 'null'}`}
                      value={(() => {
                        const statoNorm = normalizarEstado(detalleModal.maquina.stato);
                        return statoNorm === 'completata' ? 'ok' : (statoNorm || '');
                      })()}
                      onChange={(value) => {
                        handleEstadoChange(detalleModal.maquina.id_maquina, value);
                      }}
                      options={estadoOptions}
                      placeholder="Seleziona stato"
                      size="small"
                    />
                  </div>
                ) : (
                  (() => {
                    const statoNormalizado = normalizarEstado(detalleModal.maquina.stato);
                    const statoMapeado = statoNormalizado === 'completata' ? 'ok' : statoNormalizado;
                    const estado = estadoOptions.find(opt => opt.value === statoMapeado);
                    if (estado) {
                      return (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${estado.badgeColor}`}>
                          <span className={estado.iconColor}>{estado.icon}</span>
                          <span className="text-sm font-semibold">{estado.label}</span>
                        </div>
                      );
                    }
                    return (
                      <span className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600">
                        {detalleModal.maquina.stato || 'Senza stato'}
                      </span>
                    );
                  })()
                )}
              </div>

              {/* Información Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-4">
                  {/* Tipo di Gas */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo di Gas</label>
                    {puedeEditar && editingField?.maquinaId === detalleModal.maquina.id_maquina && editingField?.field === 'tipo_gas' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingField.value}
                          onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveField(detalleModal.maquina.id_maquina, 'tipo_gas', editingField.value);
                            } else if (e.key === 'Escape') {
                              handleCancelEditField();
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSaveField(detalleModal.maquina.id_maquina, 'tipo_gas', editingField.value)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Salva"
                        >
                          <FiSave className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditField}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Annulla"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <p className="text-gray-900 flex-1">{detalleModal.maquina.tipo_gas || '-'}</p>
                        {puedeEditar && (
                          <button
                            onClick={() => handleStartEdit(detalleModal.maquina, 'tipo_gas')}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="Modifica"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quantità Gas */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Quantità Gas</label>
                    {puedeEditar && editingField?.maquinaId === detalleModal.maquina.id_maquina && editingField?.field === 'quantita_gas' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editingField.value}
                          onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          placeholder="g"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveField(detalleModal.maquina.id_maquina, 'quantita_gas', editingField.value);
                            } else if (e.key === 'Escape') {
                              handleCancelEditField();
                            }
                          }}
                        />
                        <span className="text-gray-600 text-sm">g</span>
                        <button
                          onClick={() => handleSaveField(detalleModal.maquina.id_maquina, 'quantita_gas', editingField.value)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Salva"
                        >
                          <FiSave className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditField}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Annulla"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <p className="text-gray-900 flex-1">
                          {detalleModal.maquina.quantita_gas !== null && detalleModal.maquina.quantita_gas !== undefined 
                            ? `${detalleModal.maquina.quantita_gas} g` 
                            : '-'}
                        </p>
                        {puedeEditar && (
                          <button
                            onClick={() => handleStartEdit(detalleModal.maquina, 'quantita_gas')}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="Modifica"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tipo di Valvola */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo di Valvola</label>
                    {puedeEditar && editingField?.maquinaId === detalleModal.maquina.id_maquina && editingField?.field === 'tipo_valvola' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingField.value}
                          onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveField(detalleModal.maquina.id_maquina, 'tipo_valvola', editingField.value);
                            } else if (e.key === 'Escape') {
                              handleCancelEditField();
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSaveField(detalleModal.maquina.id_maquina, 'tipo_valvola', editingField.value)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Salva"
                        >
                          <FiSave className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditField}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Annulla"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <p className="text-gray-900 flex-1">{detalleModal.maquina.tipo_valvola || '-'}</p>
                        {puedeEditar && (
                          <button
                            onClick={() => handleStartEdit(detalleModal.maquina, 'tipo_valvola')}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="Modifica"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>
                <div className="space-y-4">
                  {/* Tecnico Responsabile */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                      <FiUser className="w-4 h-4" />
                      Tecnico Responsabile
                    </label>
                    {puedeEditar && editingField?.maquinaId === detalleModal.maquina.id_maquina && editingField?.field === 'tecnicoId' ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editingField.value}
                          onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              handleCancelEditField();
                            }
                          }}
                        >
                          <option value="">Nessun tecnico</option>
                          {tecnicos.map((tecnico) => (
                            <option key={tecnico.id_tecnico} value={tecnico.id_tecnico}>
                              {tecnico.nome} {tecnico.cognome}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleSaveField(detalleModal.maquina.id_maquina, 'tecnicoId', editingField.value)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Salva"
                        >
                          <FiSave className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditField}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Annulla"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <p className="text-gray-900 flex-1">
                          {detalleModal.maquina.tecnico
                            ? `${detalleModal.maquina.tecnico.nome} ${detalleModal.maquina.tecnico.cognome}`
                            : '-'}
                        </p>
                        {puedeEditar && (
                          <button
                            onClick={() => handleStartEdit(detalleModal.maquina, 'tecnicoId')}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="Modifica"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Data di Consegna */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                      <FiCalendar className="w-4 h-4" />
                      Data di Consegna
                    </label>
                    {puedeEditar && editingField?.maquinaId === detalleModal.maquina.id_maquina && editingField?.field === 'data_consegna' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={editingField.value}
                          onChange={(e) => setEditingField({ ...editingField, value: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              handleCancelEditField();
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSaveField(detalleModal.maquina.id_maquina, 'data_consegna', editingField.value)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Salva"
                        >
                          <FiSave className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleCancelEditField}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Annulla"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group">
                        <p className="text-gray-900 flex-1">
                          {detalleModal.maquina.data_consegna
                            ? new Date(detalleModal.maquina.data_consegna).toLocaleDateString('it-IT')
                            : '-'}
                        </p>
                        {puedeEditar && (
                          <button
                            onClick={() => handleStartEdit(detalleModal.maquina, 'data_consegna')}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                            title="Modifica"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Prima Prova - Solo lectura */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Prima Prova</label>
                    <p className="text-gray-900">
                      {detalleModal.maquina.fecha_primera_prueba
                        ? new Date(detalleModal.maquina.fecha_primera_prueba).toLocaleDateString('it-IT')
                        : '-'}
                    </p>
                  </div>

                  {/* Data OK - Solo lectura */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Data OK</label>
                    <p className="text-gray-900">
                      {detalleModal.maquina.fecha_estado_ok
                        ? new Date(detalleModal.maquina.fecha_estado_ok).toLocaleDateString('it-IT')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Todas las Pruebas */}
              {detalleModal.maquina.tests && detalleModal.maquina.tests.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FiClock className="w-4 h-4" />
                    Prove Eseguite ({detalleModal.maquina.tests.length})
                  </label>
                  <div className="space-y-4">
                    {[...detalleModal.maquina.tests].reverse().map((test, index) => (
                      <div key={test.id_test} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              Prova #{detalleModal.maquina.tests.length - index}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {test.hora_test 
                                ? new Date(test.hora_test).toLocaleString('it-IT', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : test.fecha_test 
                                  ? new Date(test.fecha_test).toLocaleDateString('it-IT')
                                  : '-'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          {/* Responsabile della Prova */}
                          <div className="flex items-center gap-2">
                            <FiUser className="w-4 h-4 text-primary-600" />
                            <div>
                              <span className="text-xs text-gray-600">Responsabile:</span>
                              <span className="ml-2 font-semibold text-gray-900">
                                {(() => {
                                  // Si el test tiene el objeto técnico completo
                                  if (test.tecnico && test.tecnico.nome && test.tecnico.cognome) {
                                    return `${test.tecnico.nome} ${test.tecnico.cognome}`;
                                  }
                                  // Si solo tiene id_tecnico, buscar en la lista de técnicos
                                  if (test.id_tecnico && tecnicos.length > 0) {
                                    const tecnicoEncontrado = tecnicos.find(t => t.id_tecnico === test.id_tecnico);
                                    if (tecnicoEncontrado) {
                                      return `${tecnicoEncontrado.nome} ${tecnicoEncontrado.cognome}`;
                                    }
                                  }
                                  return 'Non assegnato';
                                })()}
                              </span>
                            </div>
                          </div>
                          {/* Temperatura Iniziale */}
                          {test.temperatura_iniziale !== null && test.temperatura_iniziale !== undefined && (
                            <div className="flex items-center gap-2">
                              <FiThermometer className="w-4 h-4 text-red-500" />
                              <div>
                                <span className="text-xs text-gray-600">Temperatura Iniziale:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {test.temperatura_iniziale}°C
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Regolazione Vite */}
                          <div className="flex items-center gap-2">
                            <FiSettings className="w-4 h-4 text-gray-600" />
                            <div>
                              <span className="text-xs text-gray-600">Regolazione Vite:</span>
                              <span className="ml-2 font-semibold text-gray-900">
                                {test.regolazione_vite && test.regolazione_vite.trim() !== '' 
                                  ? test.regolazione_vite 
                                  : '-'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Humedad Ambiente */}
                          {test.humedad_ambiente !== null && test.humedad_ambiente !== undefined && (
                            <div className="flex items-center gap-2">
                              <FiCloud className="w-4 h-4 text-blue-500" />
                              <div>
                                <span className="text-xs text-gray-600">Umidità Ambiente:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {test.humedad_ambiente}%
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Quantità Liquido */}
                          {test.quantita_liquido !== null && test.quantita_liquido !== undefined && (
                            <div className="flex items-center gap-2">
                              <FiDroplet className="w-4 h-4 text-blue-500" />
                              <div>
                                <span className="text-xs text-gray-600">Quantità Liquido:</span>
                                <span className="ml-2 font-semibold text-gray-900">
                                  {test.quantita_liquido} ml
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Tiempos de Prueba */}
                        {(test.tempo_0_gradi || test.tempo_meno8_gradi) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-4">
                              {test.tempo_0_gradi && (
                                <div>
                                  <span className="text-xs text-gray-600">Tempo a 0°C:</span>
                                  <span className="ml-2 font-mono font-bold text-primary-700 text-base">
                                    {segundosAMinutosSegundos(test.tempo_0_gradi)}
                                  </span>
                                </div>
                              )}
                              {test.tempo_meno8_gradi && (
                                <div>
                                  <span className="text-xs text-gray-600">Tempo a -8°C:</span>
                                  <span className="ml-2 font-mono font-bold text-primary-700 text-base">
                                    {segundosAMinutosSegundos(test.tempo_meno8_gradi)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Observazioni */}
                        {test.observazioni && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <span className="text-xs text-gray-600">Osservazioni:</span>
                            <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                              {test.observazioni}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Annotazioni */}
              {detalleModal.maquina.annotazioni && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <FiInfo className="w-4 h-4" />
                    Annotazioni
                  </label>
                  <p className="text-gray-900 bg-gray-50 border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">
                    {detalleModal.maquina.annotazioni}
                  </p>
                </div>
              )}

              {/* Galería de Fotos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <FiImage className="w-4 h-4" />
                    Foto
                  </label>
                  {!editandoFotos ? (
                    <button
                      onClick={() => setEditandoFotos(true)}
                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <FiEdit2 className="w-3 h-3" />
                      Modifica Foto
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditandoFotos(false);
                          setNuevasFotos({ foto1: null, foto2: null });
                          setPreviewsFotos({ foto1: null, foto2: null });
                          setEliminarFotos({ foto1: false, foto2: false });
                        }}
                        className="btn-secondary text-xs px-3 py-1.5"
                        disabled={guardandoFotos}
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleGuardarFotos}
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                        disabled={guardandoFotos}
                      >
                        {guardandoFotos ? (
                          <>
                            <FiRefreshCw className="w-3 h-3 animate-spin" />
                            Salvataggio...
                          </>
                        ) : (
                          <>
                            <FiSave className="w-3 h-3" />
                            Salva
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {editandoFotos ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Foto 1 */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Foto 1
                      </label>
                      {eliminarFotos.foto1 ? (
                        <div className="border-2 border-red-300 border-dashed rounded-lg p-4 bg-red-50 text-center">
                          <p className="text-sm text-red-700 mb-2">Foto marcata per eliminazione</p>
                          <button
                            onClick={() => handleDesmarcarEliminarFoto(1)}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Annulla eliminazione
                          </button>
                        </div>
                      ) : previewsFotos.foto1 ? (
                        <div className="relative group">
                          <img
                            src={previewsFotos.foto1}
                            alt="Preview Foto 1"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => handleRemoveFotoModal(1)}
                              className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-opacity"
                              title="Rimuovi foto"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                            Nuova foto
                          </div>
                        </div>
                      ) : detalleModal.maquina.foto1 ? (
                        <div className="relative group">
                          <img
                            src={getFotoUrl(detalleModal.maquina.foto1)}
                            alt="Foto 1"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => handleMarcarEliminarFoto(1)}
                              className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-opacity"
                              title="Elimina foto"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="mt-2">
                            <label className="flex flex-col items-center justify-center w-full border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors py-2">
                              <div className="flex flex-col items-center justify-center">
                                <FiImage className="w-5 h-5 mb-1 text-blue-500" />
                                <p className="text-xs text-blue-600 font-semibold">Sostituisci foto</p>
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFotoChangeModal(1, e)}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 hover:border-blue-300 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FiImage className="w-12 h-12 mb-3 text-gray-400 group-hover:text-blue-500" />
                            <p className="mb-2 text-sm text-gray-600">
                              <span className="font-semibold">Clicca per caricare</span>
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, WEBP (MAX. 5MB)</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFotoChangeModal(1, e)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Foto 2 */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-2">
                        Foto 2
                      </label>
                      {eliminarFotos.foto2 ? (
                        <div className="border-2 border-red-300 border-dashed rounded-lg p-4 bg-red-50 text-center">
                          <p className="text-sm text-red-700 mb-2">Foto marcata per eliminazione</p>
                          <button
                            onClick={() => handleDesmarcarEliminarFoto(2)}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Annulla eliminazione
                          </button>
                        </div>
                      ) : previewsFotos.foto2 ? (
                        <div className="relative group">
                          <img
                            src={previewsFotos.foto2}
                            alt="Preview Foto 2"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => handleRemoveFotoModal(2)}
                              className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-opacity"
                              title="Rimuovi foto"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                            Nuova foto
                          </div>
                        </div>
                      ) : detalleModal.maquina.foto2 ? (
                        <div className="relative group">
                          <img
                            src={getFotoUrl(detalleModal.maquina.foto2)}
                            alt="Foto 2"
                            className="w-full h-48 object-cover rounded-lg border border-gray-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                            <button
                              onClick={() => handleMarcarEliminarFoto(2)}
                              className="opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-opacity"
                              title="Elimina foto"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="mt-2">
                            <label className="flex flex-col items-center justify-center w-full border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors py-2">
                              <div className="flex flex-col items-center justify-center">
                                <FiImage className="w-5 h-5 mb-1 text-blue-500" />
                                <p className="text-xs text-blue-600 font-semibold">Sostituisci foto</p>
                              </div>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => handleFotoChangeModal(2, e)}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gradient-to-br from-gray-50 to-gray-100 hover:from-blue-50 hover:to-blue-100 hover:border-blue-300 transition-all">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FiImage className="w-12 h-12 mb-3 text-gray-400 group-hover:text-blue-500" />
                            <p className="mb-2 text-sm text-gray-600">
                              <span className="font-semibold">Clicca per caricare</span>
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG, WEBP (MAX. 5MB)</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => handleFotoChangeModal(2, e)}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ) : (
                  (() => {
                    const fotos = getFotos(detalleModal.maquina);
                    if (fotos.length === 0) {
                      return (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <FiImage className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Nessuna foto disponibile</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="relative">
                        {/* Foto Principal */}
                        <div className="relative bg-gray-900 rounded-lg overflow-hidden min-h-[384px] flex items-center justify-center group">
                          {fotosError[fotoIndex] ? (
                            <div className="flex flex-col items-center justify-center text-white p-8">
                              <FiImage className="w-16 h-16 mb-4 text-gray-400" />
                              <p className="text-lg font-semibold mb-2">Immagine non disponibile</p>
                              <p className="text-sm text-gray-400 text-center max-w-md">
                                L'immagine potrebbe essere stata eliminata o non essere più accessibile.
                                <br />
                                Prova a ricaricare la pagina o contatta l'amministratore.
                              </p>
                            </div>
                          ) : (
                            <>
                              <img
                                src={fotos[fotoIndex]?.url}
                                alt={fotos[fotoIndex]?.title}
                                className="w-full h-96 object-contain"
                                onError={(e) => {
                                  // Intentar con URL alternativa si falla
                                  const currentUrl = e.target.src;
                                  if (currentUrl.includes('uc?export=view')) {
                                    // Si falla uc?export=view, intentar con thumbnail
                                    const fileIdMatch = currentUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                                    if (fileIdMatch && fileIdMatch[1]) {
                                      const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w1000`;
                                      e.target.src = thumbnailUrl;
                                      return; // No marcar como error todavía, intentar con thumbnail
                                    }
                                  }
                                  // Si también falla el thumbnail, marcar como error
                                  setFotosError(prev => ({ ...prev, [fotoIndex]: true }));
                                }}
                              />
                              {/* Botón para eliminar foto directamente (visible al hacer hover) */}
                              <button
                                onClick={() => {
                                  const fotoField = fotos[fotoIndex]?.field; // 'foto1' o 'foto2'
                                  if (fotoField) {
                                    handleEliminarFotoDirecta(fotoField);
                                  }
                                }}
                                className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Elimina foto"
                                disabled={guardandoFotos}
                              >
                                {guardandoFotos ? (
                                  <FiRotateCw className="w-5 h-5 animate-spin" />
                                ) : (
                                  <FiTrash2 className="w-5 h-5" />
                                )}
                              </button>
                            </>
                          )}
                          
                          {/* Navegación de fotos */}
                          {fotos.length > 1 && (
                            <>
                              <button
                                onClick={() => {
                                  const newIndex = fotoIndex === 0 ? fotos.length - 1 : fotoIndex - 1;
                                  setFotoIndex(newIndex);
                                  // Resetear error al cambiar de foto
                                  if (fotosError[newIndex]) {
                                    setFotosError(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors[newIndex];
                                      return newErrors;
                                    });
                                  }
                                }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
                                title="Foto precedente"
                              >
                                <FiChevronLeft className="w-6 h-6" />
                              </button>
                              <button
                                onClick={() => {
                                  const newIndex = fotoIndex === fotos.length - 1 ? 0 : fotoIndex + 1;
                                  setFotoIndex(newIndex);
                                  // Resetear error al cambiar de foto
                                  if (fotosError[newIndex]) {
                                    setFotosError(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors[newIndex];
                                      return newErrors;
                                    });
                                  }
                                }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
                                title="Foto successiva"
                              >
                                <FiChevronRight className="w-6 h-6" />
                              </button>
                            </>
                          )}
                        </div>
                        
                        {/* Miniaturas */}
                        {fotos.length > 1 && (
                          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
                            {fotos.map((foto, index) => (
                              <div
                                key={index}
                                className="relative flex-shrink-0 group"
                              >
                                <button
                                  onClick={() => {
                                    setFotoIndex(index);
                                    // Resetear error al cambiar de foto
                                    if (fotosError[index]) {
                                      setFotosError(prev => {
                                        const newErrors = { ...prev };
                                        delete newErrors[index];
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                                    fotoIndex === index ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'
                                  }`}
                                >
                                  {fotosError[index] ? (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                      <FiImage className="w-6 h-6 text-gray-500" />
                                    </div>
                                  ) : (
                                    <img
                                      src={foto.url}
                                      alt={foto.title}
                                      className="w-full h-full object-cover"
                                      onError={() => {
                                        setFotosError(prev => ({ ...prev, [index]: true }));
                                      }}
                                    />
                                  )}
                                </button>
                                {/* Botón eliminar en thumbnail */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Sei sicuro di voler eliminare questa foto?')) {
                                      handleEliminarFotoDirecta(foto.field);
                                    }
                                  }}
                                  className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Elimina foto"
                                  disabled={guardandoFotos}
                                >
                                  <FiX className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Indicador de foto */}
                        {fotos.length > 1 && (
                          <div className="text-center mt-2 text-sm text-gray-600">
                            Foto {fotoIndex + 1} di {fotos.length}
                          </div>
                        )}
                        
                        {/* Botones de acción */}
                        <div className="mt-4 flex gap-2 justify-center">
                          <button
                            onClick={() => setEditandoFotos(true)}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                          >
                            <FiEdit2 className="w-4 h-4" />
                            Modifica Foto
                          </button>
                          {fotos.length > 0 && (
                            <button
                              onClick={() => {
                                const fotoField = fotos[fotoIndex]?.field;
                                if (fotoField) {
                                  handleEliminarFotoDirecta(fotoField);
                                }
                              }}
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                              disabled={guardandoFotos}
                            >
                              {guardandoFotos ? (
                                <>
                                  <FiRotateCw className="w-4 h-4 animate-spin" />
                                  Eliminando...
                                </>
                              ) : (
                                <>
                                  <FiTrash2 className="w-4 h-4" />
                                  Elimina Foto
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cambio de Estado */}
      {confirmEstadoModal.show && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setIsClosingModal(true);
            setTimeout(() => {
              setConfirmEstadoModal({ 
                show: false, 
                maquinaId: null, 
                nuevoEstado: null, 
                estadoAnterior: null,
                maquinaInfo: null 
              });
              setIsClosingModal(false);
            }, 200);
          }}
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: isClosingModal ? 'backdropFadeOut 0.2s ease-out' : 'backdropFadeIn 0.2s ease-out'
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl mx-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              width: '360px', 
              maxWidth: '90vw',
              animation: isClosingModal ? 'modalDisappear 0.2s ease-out' : 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform, opacity'
            }}
          >
            {/* Header */}
            <div className="bg-yellow-50 border-b border-yellow-200 px-5 py-4 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500 p-2 rounded-lg">
                  <FiAlertCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Conferma cambio di stato</h3>
              </div>
            </div>
            
            {/* Contenido */}
            <div className="p-5">
              <p className="text-gray-700 mb-4 text-sm leading-relaxed">
                Sei sicuro di voler cambiare lo stato della macchina <span className="font-bold">{confirmEstadoModal.maquinaInfo?.numero_telaio}</span>?
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Stato attuale:</span>
                  <span className="font-semibold text-gray-900 px-3 py-1 bg-white rounded border border-gray-300">
                    {confirmEstadoModal.maquinaInfo?.estadoAnteriorLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Nuovo stato:</span>
                  <span className="font-semibold text-primary-600 px-3 py-1 bg-primary-50 rounded border border-primary-300">
                    {confirmEstadoModal.maquinaInfo?.estadoNuevoLabel}
                  </span>
                </div>
              </div>
              
              {/* Botones */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsClosingModal(true);
                    setTimeout(() => {
                      setConfirmEstadoModal({ 
                        show: false, 
                        maquinaId: null, 
                        nuevoEstado: null, 
                        estadoAnterior: null,
                        maquinaInfo: null 
                      });
                      setIsClosingModal(false);
                    }, 200);
                  }}
                  className="px-5 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmarCambioEstado}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors font-medium text-sm"
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
