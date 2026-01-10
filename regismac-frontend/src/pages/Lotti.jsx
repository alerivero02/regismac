import { useEffect, useState } from 'react';
import { 
  FiPackage, 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSearch,
  FiX,
  FiSave,
  FiCalendar,
  FiHash,
  FiInfo,
  FiCheckCircle,
  FiAlertCircle,
  FiMinus
} from 'react-icons/fi';
import { lottiAPI, maquinasAPI } from '../services/api';
import Notification from '../components/Notification';
import LoadingSpinner from '../components/LoadingSpinner';
import ModernDropdown from '../components/ModernDropdown';

export default function Lotti() {
  const [lotti, setLotti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [showForm, setShowForm] = useState(false);
  const [editingLotto, setEditingLotto] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    anno: new Date().getFullYear(),
    descrizione: '',
    numero_telaio_da: '',
    numero_telaio_a: ''
  });
  const [maquinasDisponibles, setMaquinasDisponibles] = useState([]);
  const [cargandoMaquinas, setCargandoMaquinas] = useState(false);

  useEffect(() => {
    loadLotti();
  }, []);

  const loadLotti = async () => {
    try {
      setLoading(true);
      const data = await lottiAPI.getAll();
      setLotti(data);
    } catch (error) {
      showNotification(error.message || 'Errore nel caricamento dei lotti', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 5000);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleBuscarMaquinas = async () => {
    if (!formData.numero_telaio_da || !formData.numero_telaio_a) {
      showNotification('Inserisci il range di numeri di telaio', 'error');
      return;
    }

    try {
      setCargandoMaquinas(true);
      const maquinas = await lottiAPI.getMaquinasDisponiblesEnRango(
        formData.numero_telaio_da,
        formData.numero_telaio_a
      );
      setMaquinasDisponibles(maquinas);
      if (maquinas.length === 0) {
        showNotification('Nessuna macchina disponibile trovata nel range specificato', 'info');
      }
    } catch (error) {
      showNotification(error.message || 'Errore nella ricerca delle macchine', 'error');
    } finally {
      setCargandoMaquinas(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.anno) {
      showNotification('L\'anno è obbligatorio', 'error');
      return;
    }

    try {
      if (editingLotto) {
        await lottiAPI.update(editingLotto.id_lotto, formData);
        showNotification('Lotto aggiornato con successo', 'success');
      } else {
        await lottiAPI.create(formData);
        showNotification('Lotto creato con successo', 'success');
      }
      
      setShowForm(false);
      setEditingLotto(null);
      setFormData({
        anno: new Date().getFullYear(),
        descrizione: '',
        numero_telaio_da: '',
        numero_telaio_a: ''
      });
      setMaquinasDisponibles([]);
      loadLotti();
    } catch (error) {
      showNotification(error.message || 'Errore nel salvataggio del lotto', 'error');
    }
  };

  const handleEdit = (lotto) => {
    setEditingLotto(lotto);
    setFormData({
      anno: lotto.anno,
      descrizione: lotto.descrizione || '',
      numero_telaio_da: lotto.numero_telaio_da || '',
      numero_telaio_a: lotto.numero_telaio_a || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo lotto?')) {
      return;
    }

    try {
      await lottiAPI.delete(id);
      showNotification('Lotto eliminato con successo', 'success');
      loadLotti();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'eliminazione del lotto', 'error');
    }
  };

  const handleAsignarPorRango = async (lottoId) => {
    const lotto = lotti.find(l => l.id_lotto === lottoId);
    if (!lotto) return;

    const numeroTelaioDa = prompt('Inserisci il numero di telaio iniziale:');
    const numeroTelaioA = prompt('Inserisci il numero di telaio finale:');

    if (!numeroTelaioDa || !numeroTelaioA) {
      return;
    }

    try {
      await lottiAPI.asignarPorRango(lottoId, numeroTelaioDa, numeroTelaioA);
      showNotification('Macchine assegnate al lotto con successo', 'success');
      loadLotti();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'assegnazione delle macchine', 'error');
    }
  };

  const handleQuitarMaquina = async (lottoId, maquinaId, numeroTelaio) => {
    if (!window.confirm(`¿Estás seguro de quitar la máquina ${numeroTelaio} de este lote?`)) {
      return;
    }

    try {
      await lottiAPI.quitarMaquina(lottoId, maquinaId);
      showNotification(`Máquina ${numeroTelaio} removida del lote exitosamente`, 'success');
      loadLotti();
    } catch (error) {
      showNotification(error.message || 'Errore al quitar la máquina del lote', 'error');
    }
  };

  const lottiFiltrados = lotti.filter(lotto => {
    const searchLower = searchTerm.toLowerCase();
    return (
      lotto.numero_lotto.toLowerCase().includes(searchLower) ||
      (lotto.descrizione && lotto.descrizione.toLowerCase().includes(searchLower)) ||
      lotto.anno.toString().includes(searchLower)
    );
  });

  if (loading) {
    return <LoadingSpinner message="Caricamento lotti..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FiPackage className="text-primary-600" />
                Gestione Lotti
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Gestisci i lotti di produzione delle macchine
              </p>
            </div>
            <button
              onClick={() => {
                setShowForm(true);
                setEditingLotto(null);
                setFormData({
                  anno: new Date().getFullYear(),
                  descrizione: '',
                  numero_telaio_da: '',
                  numero_telaio_a: ''
                });
                setMaquinasDisponibles([]);
              }}
              className="btn-primary flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base"
            >
              <FiPlus className="w-4 h-4" />
              Nuovo Lotto
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per numero lotto, descrizione o anno..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4 overflow-y-auto"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              animation: 'backdropFadeIn 0.2s ease-out'
            }}
          >
            <div 
              className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              style={{ 
                animation: 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                willChange: 'transform, opacity'
              }}
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingLotto ? 'Modifica Lotto' : 'Nuovo Lotto'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    setEditingLotto(null);
                    setMaquinasDisponibles([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 rounded-b-xl">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Anno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="anno"
                    value={formData.anno}
                    onChange={handleInputChange}
                    min="2020"
                    max="2100"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Descrizione (opzionale)
                  </label>
                  <textarea
                    name="descrizione"
                    value={formData.descrizione}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                    placeholder="Descrizione del lotto..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Numero Telaio Da
                    </label>
                    <input
                      type="text"
                      name="numero_telaio_da"
                      value={formData.numero_telaio_da}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                      placeholder="es. 1001"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Numero Telaio A
                    </label>
                    <input
                      type="text"
                      name="numero_telaio_a"
                      value={formData.numero_telaio_a}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
                      placeholder="es. 1050"
                    />
                  </div>
                </div>

                {formData.numero_telaio_da && formData.numero_telaio_a && (
                  <div>
                    <button
                      type="button"
                      onClick={handleBuscarMaquinas}
                      disabled={cargandoMaquinas}
                      className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base"
                    >
                      {cargandoMaquinas ? (
                        <>
                          <LoadingSpinner message="" />
                          Cercando...
                        </>
                      ) : (
                        <>
                          <FiSearch className="w-4 h-4" />
                          Cerca Macchine Disponibili
                        </>
                      )}
                    </button>

                    {maquinasDisponibles.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-2">
                          Trovate {maquinasDisponibles.length} macchine disponibili nel range:
                        </p>
                        <div className="max-h-40 overflow-y-auto">
                          <ul className="text-sm text-blue-800 space-y-1">
                            {maquinasDisponibles.map((m) => (
                              <li key={m.id_maquina}>
                                • {m.numero_telaio} {m.tecnico && `- ${m.tecnico.nome} ${m.tecnico.cognome}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <FiSave className="w-4 h-4" />
                    {editingLotto ? 'Aggiorna' : 'Crea'} Lotto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingLotto(null);
                      setMaquinasDisponibles([]);
                    }}
                    className="btn-secondary px-6"
                  >
                    Annulla
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista Lotti */}
        {lottiFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold text-lg">
              {searchTerm ? 'Nessun lotto trovato' : 'Nessun lotto creato'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                className="btn-primary mt-4 inline-flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Crea il Primo Lotto
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {lottiFiltrados.map((lotto) => (
              <div key={lotto.id_lotto} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-5 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {lotto.numero_lotto}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <FiCalendar className="w-4 h-4" />
                      <span>Anno: {lotto.anno}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(lotto)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifica"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(lotto.id_lotto)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Elimina"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {lotto.descrizione && (
                  <p className="text-sm text-gray-700 mb-4">{lotto.descrizione}</p>
                )}

                {(lotto.numero_telaio_da || lotto.numero_telaio_a) && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-xs text-gray-600 mb-1">Range Telaio:</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {lotto.numero_telaio_da || '?'} - {lotto.numero_telaio_a || '?'}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Macchine assegnate:</span>
                    <span className="font-bold text-gray-900">{lotto.maquinas?.length || 0}</span>
                  </div>
                  {lotto.maquinas && lotto.maquinas.length > 0 && (
                    <div className="max-h-48 overflow-y-auto text-xs space-y-1">
                      {lotto.maquinas.map((m) => (
                        <div 
                          key={m.id_maquina} 
                          className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-gray-700">• {m.numero_telaio}</span>
                          <button
                            onClick={() => handleQuitarMaquina(lotto.id_lotto, m.id_maquina, m.numero_telaio)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Quitar máquina del lote"
                          >
                            <FiMinus className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleAsignarPorRango(lotto.id_lotto)}
                    className="flex-1 btn-secondary text-xs sm:text-sm py-2"
                  >
                    Assegna per Range
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ show: false, message: '', type: 'success' })}
      />
    </div>
  );
}

