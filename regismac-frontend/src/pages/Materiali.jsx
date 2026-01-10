import { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  FiPlus, 
  FiPackage, 
  FiSearch,
  FiEdit2,
  FiX,
  FiSave,
  FiRefreshCw,
  FiTrendingUp,
  FiTrendingDown,
  FiBox,
  FiMinus,
  FiTrash2
} from 'react-icons/fi';
import { materialiAPI, authAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Materiali() {
  const [materiali, setMateriali] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    cod_articolo: '',
    codice: '',
    descrizione: '',
    fornitore: '',
    unita_misura: '',
    prezzo_unitario: '',
    note: '',
    activar_alerta: true,
    stock_minimo: '',
  });
  const [editingStock, setEditingStock] = useState(null); // { id, field: 'comprado' | 'utilizado' }
  const [stockUsatoTemp, setStockUsatoTemp] = useState({}); // { id_materiale: cantidad_temp }
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50); // Mostrar 50 elementos por página

  // Definir showNotification primero para que pueda ser usado en loadMateriali
  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 5000);
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await authAPI.getCurrentUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error al cargar usuario actual:', error);
    }
  };

  /**
   * Carga todos los materiales desde la API
   */
  const loadMateriali = useCallback(async () => {
    try {
      setLoading(true);
      const data = await materialiAPI.getAll();
      const materialiArray = Array.isArray(data) ? data : [];
      // Ordenar por fornitore (alfabéticamente) - optimizado
      // Crear copia antes de ordenar para evitar mutación directa
      if (materialiArray.length > 0) {
        const sorted = [...materialiArray].sort((a, b) => {
          const fornitoreA = (a.fornitore || '').toLowerCase();
          const fornitoreB = (b.fornitore || '').toLowerCase();
          return fornitoreA.localeCompare(fornitoreB);
        });
        setMateriali(sorted);
      } else {
        setMateriali([]);
      }
      setCurrentPage(1); // Resetear a la primera página al cargar
    } catch (error) {
      console.error('Error al cargar materiales:', error);
      showNotification(error.message || 'Errore nel caricamento dei materiali', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadMateriali();
    loadCurrentUser();
  }, [loadMateriali]);

  // Debounce del término de búsqueda para mejorar rendimiento
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Resetear página cuando cambia el término de búsqueda
    }, 300); // Esperar 300ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchTerm]);

  /**
   * Cierra el modal con la tecla Escape
   */
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showForm) {
        setShowForm(false);
        setEditingId(null);
        setFormData({
          cod_articolo: '',
          codice: '',
          descrizione: '',
          fornitore: '',
          unita_misura: '',
          prezzo_unitario: '',
          note: '',
          stock_minimo: '',
        });
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showForm]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  // Memorizar permisos de usuario (debe estar antes de las funciones que los usan)
  const isTecnico = useMemo(() => currentUser?.rol === 'tecnico', [currentUser]);
  const isAdmin = useMemo(() => currentUser?.rol === 'admin', [currentUser]);
  const puedeEditar = useMemo(() => currentUser && currentUser.rol !== 'tecnico', [currentUser]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    // Verificar que el usuario no sea técnico
    if (isTecnico) {
      showNotification('I tecnici non possono creare o modificare materiali', 'error');
      return;
    }
    
    try {
      // Preparar datos para enviar, convirtiendo stock_minimo y activar_alerta
      const dataToSend = {
        ...formData,
        activar_alerta: formData.activar_alerta !== undefined ? formData.activar_alerta : true,
        stock_minimo: formData.stock_minimo && formData.stock_minimo.trim() !== '' 
          ? parseFloat(formData.stock_minimo) 
          : null,
      };
      
      if (editingId) {
        await materialiAPI.update(editingId, dataToSend);
        showNotification('Materiale aggiornato con successo', 'success');
      } else {
        await materialiAPI.create(dataToSend);
        showNotification('Materiale creato con successo', 'success');
      }
      resetForm();
      loadMateriali();
    } catch (error) {
      showNotification(error.message || 'Errore nella registrazione del materiale', 'error');
    }
  }, [isTecnico, editingId, formData, showNotification]);

  const handleEdit = useCallback((materiale) => {
    // Verificar que el usuario no sea técnico
    if (isTecnico) {
      showNotification('I tecnici non possono modificare materiali', 'error');
      return;
    }
    
    setEditingId(materiale.id_materiale);
    setFormData({
      cod_articolo: materiale.cod_articolo,
      codice: materiale.codice || '',
      descrizione: materiale.descrizione,
      fornitore: materiale.fornitore,
      unita_misura: materiale.unita_misura || '',
      prezzo_unitario: materiale.prezzo_unitario?.toString() || '',
      note: materiale.note || '',
      activar_alerta: materiale.activar_alerta !== undefined ? materiale.activar_alerta : true,
      stock_minimo: materiale.stock_minimo?.toString() || '',
    });
    setShowForm(true);
  }, [isTecnico, showNotification]);

  const handleStockUpdate = useCallback(async (id, field, value) => {
    try {
      const numValue = parseFloat(value) || 0;
      const materiale = materiali.find(m => m.id_materiale === id);
      
      let updateData = {};
      
      if (field === 'comprado') {
        // Modificar stock directamente (solo comercial/admin)
        if (!isTecnico) {
          updateData = {
            stock_comprado: numValue,
            stock_utilizado: materiale?.stock_utilizado || 0,
          };
        } else {
          showNotification('I tecnici non possono modificare lo stock direttamente', 'error');
          setEditingStock(null);
          return;
        }
      } else if (field === 'utilizado') {
        // Cuando se inserta cantidad usada, restar del stock y limpiar el campo
        const quantitaUsata = numValue;
        const stockAttuale = materiale?.stock_comprado || 0;
        
        if (quantitaUsata <= 0) {
          showNotification('La quantità utilizzata deve essere maggiore di zero', 'error');
          setStockUsatoTemp(prev => ({ ...prev, [id]: '' }));
          return;
        }
        
        if (quantitaUsata > stockAttuale) {
          showNotification(`Stock insufficiente. Disponibile: ${stockAttuale}`, 'error');
          setStockUsatoTemp(prev => ({ ...prev, [id]: '' }));
          return;
        }
        
        // Restar del stock y actualizar stock_utilizado acumulado
        const nuovoStock = stockAttuale - quantitaUsata;
        const nuovoStockUtilizzato = (materiale?.stock_utilizado || 0) + quantitaUsata;
        
        updateData = {
          stock_comprado: Math.max(0, nuovoStock),
          stock_utilizado: nuovoStockUtilizzato,
        };
      }

      await materialiAPI.updateStock(id, updateData);
      showNotification('Stock aggiornato con successo', 'success');
      setEditingStock(null);
      setStockUsatoTemp(prev => ({ ...prev, [id]: '' })); // Limpiar campo usado
      // Actualizar solo el materiale específico en lugar de recargar todo
      setMateriali(prev => prev.map(m => 
        m.id_materiale === id 
          ? { ...m, ...updateData }
          : m
      ));
    } catch (error) {
      showNotification(error.message || 'Errore nell\'aggiornamento dello stock', 'error');
    }
  }, [materiali, isTecnico, showNotification]);

  /**
   * Resta 1 unidad del stock y la agrega a stock_utilizado
   * @param {number} id - ID del materiale
   */
  const handleRestarUno = useCallback(async (id) => {
    const materiale = materiali.find(m => m.id_materiale === id);
    const stockAttuale = materiale?.stock_comprado || 0;
    
    if (stockAttuale <= 0) {
      showNotification('Stock insufficiente', 'error');
      return;
    }
    
    // Restar 1 del stock
    const nuovoStock = stockAttuale - 1;
    const nuovoStockUtilizzato = (materiale?.stock_utilizado || 0) + 1;
    
    try {
      await materialiAPI.updateStock(id, {
        stock_comprado: Math.max(0, nuovoStock),
        stock_utilizado: nuovoStockUtilizzato,
      });
      showNotification('1 unità rimossa dallo stock', 'success');
      // Actualizar solo el materiale específico
      setMateriali(prev => prev.map(m => 
        m.id_materiale === id 
          ? { ...m, stock_comprado: Math.max(0, nuovoStock), stock_utilizado: nuovoStockUtilizzato }
          : m
      ));
    } catch (error) {
      showNotification(error.message || 'Errore nell\'aggiornamento dello stock', 'error');
    }
  }, [materiali, showNotification]);

  /**
   * Elimina un materiale (solo admin)
   * @param {number} id - ID del materiale
   */
  const handleDelete = useCallback(async (id) => {
    const materiale = materiali.find(m => m.id_materiale === id);
    if (!materiale) return;

    // Confirmación antes de eliminar
    const confirmMessage = `Sei sicuro di voler eliminare il materiale "${materiale.cod_articolo || materiale.descrizione}"?\n\nQuesta azione non può essere annullata.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await materialiAPI.delete(id);
      showNotification('Materiale eliminato con successo', 'success');
      // Recargar materiales
      await loadMateriali();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'eliminazione del materiale', 'error');
    }
  }, [materiali, showNotification, loadMateriali]);

  /**
   * Agrega 1 unidad al stock (solo para comercial/admin)
   * @param {number} id - ID del materiale
   */
  const handleAggiungereUno = useCallback(async (id) => {
    const materiale = materiali.find(m => m.id_materiale === id);
    const stockAttuale = materiale?.stock_comprado || 0;
    
    // Agregar 1 al stock (solo para comercial/admin)
    const nuovoStock = stockAttuale + 1;
    
    try {
      await materialiAPI.updateStock(id, {
        stock_comprado: nuovoStock,
        stock_utilizado: materiale?.stock_utilizado || 0,
      });
      showNotification('1 unità aggiunta allo stock', 'success');
      // Actualizar solo el materiale específico
      setMateriali(prev => prev.map(m => 
        m.id_materiale === id 
          ? { ...m, stock_comprado: nuovoStock }
          : m
      ));
    } catch (error) {
      showNotification(error.message || 'Errore nell\'aggiornamento dello stock', 'error');
    }
  }, [materiali, showNotification]);

  /**
   * Resta 1 unidad del stock sin actualizar stock_utilizado (solo para comercial/admin)
   * @param {number} id - ID del materiale
   */
  const handleSottrarreUnoStock = useCallback(async (id) => {
    const materiale = materiali.find(m => m.id_materiale === id);
    const stockAttuale = materiale?.stock_comprado || 0;
    
    if (stockAttuale <= 0) {
      showNotification('Stock insufficiente', 'error');
      return;
    }
    
    // Restar 1 del stock (solo para comercial/admin, no actualiza stock_utilizado)
    const nuovoStock = stockAttuale - 1;
    
    try {
      await materialiAPI.updateStock(id, {
        stock_comprado: Math.max(0, nuovoStock),
        stock_utilizzato: materiale?.stock_utilizado || 0,
      });
      showNotification('1 unità rimossa dallo stock', 'success');
      // Actualizar solo el materiale específico
      setMateriali(prev => prev.map(m => 
        m.id_materiale === id 
          ? { ...m, stock_comprado: Math.max(0, nuovoStock) }
          : m
      ));
    } catch (error) {
      showNotification(error.message || 'Errore nell\'aggiornamento dello stock', 'error');
    }
  }, [materiali, showNotification]);


  const resetForm = () => {
    setFormData({
      cod_articolo: '',
      codice: '',
      descrizione: '',
      fornitore: '',
      unita_misura: '',
      prezzo_unitario: '',
      note: '',
      activar_alerta: true,
      stock_minimo: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Memoizar materiales filtrados para mejor rendimiento (usa debouncedSearchTerm)
  const materialiFiltrados = useMemo(() => {
    if (!debouncedSearchTerm) return materiali;
    const searchLower = debouncedSearchTerm.toLowerCase();
    return materiali.filter((m) => {
      const cod = m.cod_articolo?.toLowerCase() || '';
      const codice = m.codice?.toLowerCase() || '';
      const desc = m.descrizione?.toLowerCase() || '';
      const forn = m.fornitore?.toLowerCase() || '';
      return cod.includes(searchLower) || codice.includes(searchLower) || desc.includes(searchLower) || forn.includes(searchLower);
    });
  }, [materiali, debouncedSearchTerm]);

  // Paginación de materiales filtrados
  const materialiPaginados = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return materialiFiltrados.slice(startIndex, endIndex);
  }, [materialiFiltrados, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(materialiFiltrados.length / itemsPerPage);

  if (loading) {
    return <LoadingSpinner message="Caricamento materiali..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 leading-tight">
            Gestione Materiali e Stock
          </h2>
          <p className="text-gray-600 text-sm sm:text-lg hidden sm:block">
            Gestisci i materiali disponibili e controlla lo stock
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={loadMateriali}
            className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all font-semibold text-gray-700 text-sm sm:text-base flex-1 sm:flex-none"
            title="Aggiorna"
          >
            <FiRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Aggiorna</span>
          </button>
          {puedeEditar && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-none"
            >
              <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Nuovo Materiale</span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Formulario */}
      {showForm && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'backdropFadeIn 0.2s ease-out'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              resetForm();
            }
          }}
        >
          <div 
            className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            style={{ 
              animation: 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
              willChange: 'transform, opacity'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingId ? 'Modifica Materiale' : 'Nuovo Materiale'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 p-4 sm:px-6 pb-6 rounded-b-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Articolo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="cod_articolo"
                  value={formData.cod_articolo}
                  onChange={handleInputChange}
                  required
                  disabled={editingId !== null}
                  className="input-field"
                  placeholder="Es: DAB VS 65/150 M"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Codice
                </label>
                <input
                  type="text"
                  name="codice"
                  value={formData.codice}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Es: DAB 60182213H, 3045, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fornitore <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fornitore"
                  value={formData.fornitore}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder="Es: CET"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Descrizione <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Descrizione del materiale"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Unità di Misura
                </label>
                <select
                  name="unita_misura"
                  value={formData.unita_misura}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option value="">Seleziona...</option>
                  <option value="kg">kg</option>
                  <option value="litri">litri</option>
                  <option value="unità">unità</option>
                  <option value="mt">mt</option>
                  <option value="pz">pz</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Prezzo Unitario (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="prezzo_unitario"
                  value={formData.prezzo_unitario}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Configuración de Alertas - Solo para administradores */}
            {isAdmin && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 mb-3">Configurazione Alert Stock</h4>
                
                {/* Activar/Desactivar Alerta */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="activar_alerta"
                    name="activar_alerta"
                    checked={formData.activar_alerta}
                    onChange={(e) => setFormData(prev => ({ ...prev, activar_alerta: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="activar_alerta" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Attiva alerta di basso stock per questo materiale
                  </label>
                </div>
                
                {/* Stock Minimo */}
                {formData.activar_alerta && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Stock Minimo (per attivare alerta)
                      <span className="text-xs md:text-sm font-normal text-gray-500 ml-2">
                        (Lascia vuoto per calcolo automatico: 20% del stock comprato o minimo 10)
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="stock_minimo"
                      value={formData.stock_minimo}
                      onChange={handleInputChange}
                      className="input-field"
                      placeholder="Lascia vuoto per calcolo automatico"
                    />
                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                      L'alerta si attiverà quando lo stock disponibile scende sotto questo valore.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Note
              </label>
              <textarea
                name="note"
                value={formData.note}
                onChange={handleInputChange}
                rows={3}
                className="input-field resize-none"
                placeholder="Note aggiuntive..."
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 sm:px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-gray-700 transition-colors text-sm sm:text-base w-full sm:w-auto order-2 sm:order-1"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center justify-center gap-2 text-sm sm:text-base w-full sm:w-auto order-1 sm:order-2"
              >
                <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{editingId ? 'Aggiorna' : 'Crea'}</span>
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* Ricerca */}
      <div className="card">
        <div className="flex items-center gap-2 sm:gap-3">
          <FiSearch className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Cerca per codice, descrizione o fornitore..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 input-field text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Tabella */}
      <div className="card w-full max-w-full overflow-hidden">
        {/* Vista Tabella Desktop */}
        <div className="hidden md:block w-full max-w-full">
          <div className="w-full max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <table className="w-full" style={{ tableLayout: 'auto' }}>
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 md:py-4 px-2 md:px-3 lg:px-4 text-sm md:text-base font-bold text-gray-600 uppercase whitespace-nowrap">Cod. Articolo</th>
                <th className="text-left py-3 md:py-4 px-2 md:px-3 lg:px-4 text-sm md:text-base font-bold text-gray-600 uppercase whitespace-nowrap">Articolo</th>
                <th className="text-left py-3 md:py-4 px-2 md:px-3 lg:px-4 text-sm md:text-base font-bold text-gray-600 uppercase whitespace-nowrap">Fornitore</th>
                <th className="text-left py-3 md:py-4 px-2 md:px-3 lg:px-4 text-sm md:text-base font-bold text-gray-600 uppercase hidden xl:table-cell whitespace-nowrap">Unità</th>
                <th className="text-left py-3 md:py-4 px-2 md:px-3 lg:px-4 text-sm md:text-base font-bold text-gray-600 uppercase hidden xl:table-cell whitespace-nowrap">Prezzo</th>
                <th className="text-left py-3 md:py-4 px-2 md:px-3 lg:px-4 text-sm md:text-base font-bold text-gray-600 uppercase whitespace-nowrap">Stock</th>
                <th className="text-left py-3 md:py-4 px-2 md:px-3 lg:px-4 text-sm md:text-base font-bold text-gray-600 uppercase whitespace-nowrap">USATO</th>
                <th className="text-left py-3 md:py-4 px-2 md:px-3 lg:px-4 text-sm md:text-base font-bold text-gray-600 uppercase w-20 whitespace-nowrap">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {materialiFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-semibold text-lg">Nessun materiale trovato</p>
                  </td>
                </tr>
              ) : (
                materialiPaginados.map((materiale) => {
                  return (
                    <tr key={materiale.id_materiale} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 md:py-4 px-2 md:px-3 lg:px-4">
                        <div className="text-sm md:text-base font-semibold text-gray-900 truncate max-w-[120px]" title={materiale.codice || 'Nessun codice'}>
                          {materiale.codice || <span className="text-gray-400 italic">-</span>}
                        </div>
                      </td>
                      <td className="py-3 md:py-4 px-2 md:px-3 lg:px-4">
                        <div className="text-sm md:text-base text-gray-700 truncate max-w-[200px]" title={materiale.descrizione || 'Nessun articolo'}>
                          {materiale.descrizione || <span className="text-gray-400 italic">Nessun articolo</span>}
                        </div>
                      </td>
                      <td className="py-3 md:py-4 px-2 md:px-3 lg:px-4">
                        <div className="text-sm md:text-base text-gray-600 truncate max-w-[100px]">{materiale.fornitore}</div>
                      </td>
                      <td className="py-3 md:py-4 px-2 md:px-3 lg:px-4 hidden xl:table-cell">
                        <div className="text-sm md:text-base text-gray-600">{materiale.unita_misura || '-'}</div>
                      </td>
                      <td className="py-3 md:py-4 px-2 md:px-3 lg:px-4 hidden xl:table-cell">
                        <div className="text-sm md:text-base text-gray-600 whitespace-nowrap">
                          {materiale.prezzo_unitario ? `€ ${materiale.prezzo_unitario.toFixed(2)}` : '-'}
                        </div>
                      </td>
                      <td className="py-3 md:py-4 px-2 md:px-3 lg:px-4">
                        <div className="flex items-center gap-1.5">
                          {editingStock?.id === materiale.id_materiale && editingStock?.field === 'comprado' ? (
                            <>
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={materiale.stock_comprado || 0}
                                onBlur={(e) => {
                                  handleStockUpdate(materiale.id_materiale, 'comprado', e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleStockUpdate(materiale.id_materiale, 'comprado', e.target.value);
                                  } else if (e.key === 'Escape') {
                                    setEditingStock(null);
                                  }
                                }}
                                autoFocus
                                className="w-16 md:w-20 px-2 md:px-3 py-1.5 text-sm md:text-base border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => setEditingStock(null)}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <div
                                onClick={() => {
                                  // Solo commerciale/admin può modificare stock
                                  if (!isTecnico) {
                                    setEditingStock({ id: materiale.id_materiale, field: 'comprado' });
                                  }
                                }}
                                className={`text-sm md:text-base font-semibold text-gray-700 px-2 md:px-3 py-1.5 rounded transition-colors ${
                                  !isTecnico 
                                    ? 'cursor-pointer hover:text-blue-600 hover:bg-blue-50' 
                                    : 'cursor-default'
                                }`}
                                title={currentUser?.rol === 'tecnico' ? 'Stock attuale' : 'Clicca per modificare'}
                              >
                                {materiale.stock_comprado?.toFixed(2) || '0.00'} {materiale.unita_misura || 'pz'}
                              </div>
                              {puedeEditar && (
                                <button
                                  onClick={() => handleAggiungereUno(materiale.id_materiale)}
                                  className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors border border-green-200 hover:border-green-300"
                                  title="Aggiungi 1 unità"
                                >
                                  <FiPlus className="w-4 h-4 md:w-5 md:h-5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRestarUno(materiale.id_materiale)}
                                disabled={(materiale.stock_comprado || 0) <= 0}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                title="Usa 1 unità"
                              >
                                <FiMinus className="w-4 h-4 md:w-5 md:h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 md:py-4 px-2 md:px-3 lg:px-4">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={materiale.stock_comprado || 0}
                            value={stockUsatoTemp[materiale.id_materiale] || ''}
                            onChange={(e) => {
                              setStockUsatoTemp(prev => ({
                                ...prev,
                                [materiale.id_materiale]: e.target.value
                              }));
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value && parseFloat(value) > 0) {
                                handleStockUpdate(materiale.id_materiale, 'utilizado', value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const value = stockUsatoTemp[materiale.id_materiale];
                                if (value && parseFloat(value) > 0) {
                                  handleStockUpdate(materiale.id_materiale, 'utilizado', value);
                                }
                              }
                            }}
                            placeholder="0"
                            className="w-16 md:w-20 px-2 md:px-3 py-1.5 text-sm md:text-base border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title={`Inserisci quantità da usare (${materiale.unita_misura || 'pz'})`}
                          />
                          <span className="text-sm md:text-base text-gray-500">{materiale.unita_misura || 'pz'}</span>
                        </div>
                      </td>
                      <td className="py-3 md:py-4 px-2 md:px-3 lg:px-4">
                        <div className="flex items-center gap-2">
                          {puedeEditar && (
                            <button
                              onClick={() => handleEdit(materiale)}
                              className="p-2 md:p-2.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifica"
                            >
                              <FiEdit2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(materiale.id_materiale)}
                              className="p-2 md:p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Elimina"
                            >
                              <FiTrash2 className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>
          
          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4 border-t border-gray-200 bg-gray-50">
              <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                Mostrando <span className="font-semibold">{(currentPage - 1) * itemsPerPage + 1}</span> a{' '}
                <span className="font-semibold">
                  {Math.min(currentPage * itemsPerPage, materialiFiltrados.length)}
                </span>{' '}
                de <span className="font-semibold">{materialiFiltrados.length}</span> materiales
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm sm:text-base font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  Anterior
                </button>
                <span className="text-xs sm:text-sm text-gray-700 px-2 sm:px-3">
                  <span className="font-semibold">{currentPage}</span> / <span className="font-semibold">{totalPages}</span>
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm sm:text-base font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Vista Card Mobile */}
        <div className="md:hidden space-y-3">
          {materialiFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold text-lg">Nessun materiale trovato</p>
            </div>
          ) : (
            <>
              {materialiPaginados.map((materiale) => {
              const stockDisponible = (materiale.stock_comprado || 0) - (materiale.stock_utilizado || 0);
              const stockMinimo = materiale.stock_minimo !== null && materiale.stock_minimo !== undefined
                ? materiale.stock_minimo
                : Math.max((materiale.stock_comprado || 0) * 0.2, 10);
              const isLowStock = materiale.activar_alerta && (stockDisponible <= 0 || stockDisponible < stockMinimo);
              
              return (
                <div
                  key={materiale.id_materiale}
                  className="p-4 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-lg mb-1 truncate">
                        {materiale.cod_articolo || <span className="text-gray-400 italic">Nessun articolo</span>}
                      </h4>
                      {materiale.codice && (
                        <p className="text-xs md:text-sm text-gray-500 mb-1">Codice: {materiale.codice}</p>
                      )}
                      <p className="text-sm text-gray-600 line-clamp-2">{materiale.descrizione}</p>
                    </div>
                    {isLowStock && (
                      <div className="text-xs md:text-sm font-bold px-2.5 md:px-3 py-1 md:py-1.5 rounded-full flex-shrink-0 ml-2 bg-red-100 text-red-700">
                        <div className="flex items-center gap-1">
                          <FiBox className="w-3 h-3" />
                          Esaurito
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Informazioni */}
                  <div className="space-y-2 mb-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm md:text-base">
                      <span className="text-gray-600">Fornitore:</span>
                      <span className="font-semibold text-gray-900">{materiale.fornitore}</span>
                    </div>
                    {materiale.unita_misura && (
                      <div className="flex items-center justify-between text-sm md:text-base">
                        <span className="text-gray-600">Unità:</span>
                        <span className="font-semibold text-gray-900">{materiale.unita_misura}</span>
                      </div>
                    )}
                    {materiale.prezzo_unitario && (
                      <div className="flex items-center justify-between text-sm md:text-base">
                        <span className="text-gray-600">Prezzo:</span>
                        <span className="font-semibold text-gray-900">€ {materiale.prezzo_unitario.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-xs md:text-sm text-gray-500 block mb-1">Stock</span>
                        {editingStock?.id === materiale.id_materiale && editingStock?.field === 'comprado' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.01"
                              defaultValue={materiale.stock_comprado || 0}
                              onBlur={(e) => {
                                handleStockUpdate(materiale.id_materiale, 'comprado', e.target.value);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleStockUpdate(materiale.id_materiale, 'comprado', e.target.value);
                                } else if (e.key === 'Escape') {
                                  setEditingStock(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 px-2 py-1.5 text-sm md:text-base border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => setEditingStock(null)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <FiX className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div
                              onClick={() => {
                                // Solo commerciale/admin può modificare stock
                                if (currentUser?.rol !== 'tecnico') {
                                  setEditingStock({ id: materiale.id_materiale, field: 'comprado' });
                                }
                              }}
                              className={`text-sm font-semibold text-gray-700 px-2 py-1.5 rounded transition-colors flex-1 ${
                                !isTecnico 
                                  ? 'cursor-pointer hover:text-blue-600 hover:bg-blue-50' 
                                  : 'cursor-default'
                              }`}
                              title={currentUser?.rol === 'tecnico' ? 'Stock attuale' : 'Clicca per modificare'}
                            >
                              {materiale.stock_comprado?.toFixed(2) || '0.00'} {materiale.unita_misura || 'pz'}
                            </div>
                            {puedeEditar && (
                              <button
                                onClick={() => handleAggiungereUno(materiale.id_materiale)}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors border border-green-200 hover:border-green-300"
                                title="Aggiungi 1 unità"
                              >
                                <FiPlus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleRestarUno(materiale.id_materiale)}
                              disabled={(materiale.stock_comprado || 0) <= 0}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                              title="Usa 1 unità"
                            >
                              <FiMinus className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-xs md:text-sm text-gray-500 block mb-1">Usa</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={materiale.stock_comprado || 0}
                            value={stockUsatoTemp[materiale.id_materiale] || ''}
                            onChange={(e) => {
                              setStockUsatoTemp(prev => ({
                                ...prev,
                                [materiale.id_materiale]: e.target.value
                              }));
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              if (value && parseFloat(value) > 0) {
                                handleStockUpdate(materiale.id_materiale, 'utilizado', value);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const value = stockUsatoTemp[materiale.id_materiale];
                                if (value && parseFloat(value) > 0) {
                                  handleStockUpdate(materiale.id_materiale, 'utilizado', value);
                                }
                              }
                            }}
                            placeholder="0"
                            className="flex-1 px-2 py-1.5 text-sm md:text-base border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title={`Inserisci quantità da usare (${materiale.unita_misura || 'pz'})`}
                          />
                          <span className="text-xs md:text-sm text-gray-500">{materiale.unita_misura || 'pz'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pulsanti di azione */}
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    {puedeEditar && (
                      <button
                        onClick={() => handleEdit(materiale)}
                        className="flex-1 px-3 py-2 text-xs md:text-sm font-semibold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <FiEdit2 className="w-3.5 h-3.5" />
                        Modifica
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(materiale.id_materiale)}
                        className="flex-1 px-3 py-2 text-xs md:text-sm font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                        Elimina
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Paginación Mobile */}
            {totalPages > 1 && (
              <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-200">
                <div className="text-sm md:text-base text-gray-700 text-center">
                  Página <span className="font-semibold">{currentPage}</span> de <span className="font-semibold">{totalPages}</span>
                  <br />
                  <span className="text-xs md:text-sm text-gray-500">
                    {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, materialiFiltrados.length)} de {materialiFiltrados.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 w-full">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 px-4 py-2 text-sm md:text-base font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="flex-1 px-4 py-2 text-sm md:text-base font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </div>
  );
}

