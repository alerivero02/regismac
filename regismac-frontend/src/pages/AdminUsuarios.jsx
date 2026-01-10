import { useEffect, useState } from 'react';
import { 
  FiUsers, 
  FiCheckCircle, 
  FiXCircle, 
  FiClock,
  FiMail,
  FiUser,
  FiRefreshCw,
  FiEdit2,
  FiSave,
  FiX
} from 'react-icons/fi';
import { usuariosAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [pendientes, setPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [editingRol, setEditingRol] = useState(null); // { id_usuario, rol }

  useEffect(() => {
    loadUsuarios();
  }, []);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const [allUsuarios, pendientesData] = await Promise.all([
        usuariosAPI.getAll(),
        usuariosAPI.getPendientes(),
      ]);
      setUsuarios(Array.isArray(allUsuarios) ? allUsuarios : []);
      setPendientes(Array.isArray(pendientesData) ? pendientesData : []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      showNotification(error.message || 'Errore nel caricamento degli utenti', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAprobar = async (id) => {
    try {
      await usuariosAPI.aprobar(id);
      showNotification('Utente approvato con successo', 'success');
      loadUsuarios();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'approvazione dell\'utente', 'error');
    }
  };

  const handleRechazar = async (id) => {
    if (!window.confirm('Sei sicuro di voler rifiutare questo utente?')) {
      return;
    }

    try {
      await usuariosAPI.rechazar(id);
      showNotification('Utente rifiutato', 'success');
      loadUsuarios();
    } catch (error) {
      showNotification(error.message || 'Errore nel rifiuto dell\'utente', 'error');
    }
  };

  const handleUpdateRol = async (id, nuevoRol) => {
    try {
      await usuariosAPI.updateRol(id, nuevoRol);
      showNotification('Ruolo aggiornato con successo', 'success');
      setEditingRol(null);
      loadUsuarios();
    } catch (error) {
      showNotification(error.message || 'Errore nell\'aggiornamento del ruolo', 'error');
    }
  };

  const getRolLabel = (rol) => {
    const roles = {
      admin: 'Amministratore',
      tecnico: 'Tecnico',
      comercial: 'Comercial',
    };
    return roles[rol] || rol;
  };

  const getRolBadge = (rol) => {
    const badges = {
      admin: 'bg-purple-100 text-purple-700',
      tecnico: 'bg-blue-100 text-blue-700',
      comercial: 'bg-green-100 text-green-700',
    };
    return badges[rol] || 'bg-gray-100 text-gray-700';
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ ...notification, show: false }), 5000);
  };

  const getEstadoBadge = (estado) => {
    const estados = {
      pendiente: { icon: FiClock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'In Attesa' },
      aprobado: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Approvato' },
      rechazado: { icon: FiXCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rifiutato' },
    };
    const config = estados[estado] || estados.pendiente;
    const Icon = config.icon;
    
    return (
      <span className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${config.bg} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Caricamento utenti..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden" style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 leading-tight">
            Amministrazione Utenti
          </h2>
          <p className="text-gray-600 text-sm sm:text-lg hidden sm:block">
            Gestisci le richieste di registrazione e gli utenti del sistema
          </p>
        </div>
        <button
          onClick={loadUsuarios}
          className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-white rounded-xl border border-gray-200 hover:bg-gray-50 hover:shadow-md transition-all font-semibold text-gray-700 text-sm sm:text-base w-full sm:w-auto"
          title="Aggiorna"
        >
          <FiRefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Aggiorna</span>
        </button>
      </div>

      {/* Usuarios Pendientes */}
      {pendientes.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="bg-yellow-50 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
              <FiClock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                Richieste in Attesa ({pendientes.length})
              </h3>
              <p className="text-xs sm:text-sm text-gray-600">Utenti in attesa di approvazione</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {pendientes.map((usuario) => (
              <div
                key={usuario.id_usuario}
                className="p-3 sm:p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all bg-white"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="bg-primary-50 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
                      <FiUser className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                        <h4 className="font-bold text-gray-900 text-base sm:text-lg truncate">
                          {usuario.nombre} {usuario.apellido || ''}
                        </h4>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full w-fit ${getRolBadge(usuario.rol)}`}>
                          {getRolLabel(usuario.rol)}
                        </span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <FiMail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          <span className="truncate">{usuario.email}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          Registrato: {new Date(usuario.fecha_registro).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <div className="hidden sm:block">{getEstadoBadge(usuario.estado)}</div>
                    <div className="sm:hidden w-full">{getEstadoBadge(usuario.estado)}</div>
                    <button
                      onClick={() => handleAprobar(usuario.id_usuario)}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-semibold flex items-center justify-center gap-2 text-sm min-h-[44px]"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Approva</span>
                      <span className="sm:hidden">OK</span>
                    </button>
                    <button
                      onClick={() => handleRechazar(usuario.id_usuario)}
                      className="flex-1 sm:flex-none px-3 sm:px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold flex items-center justify-center gap-2 text-sm min-h-[44px]"
                    >
                      <FiXCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Rifiuta</span>
                      <span className="sm:hidden">No</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Todos los Usuarios */}
      <div className="card">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-primary-50 p-2 sm:p-3 rounded-lg sm:rounded-xl flex-shrink-0">
            <FiUsers className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Tutti gli Utenti ({usuarios.length})
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">Lista completa degli utenti del sistema</p>
          </div>
        </div>

        {usuarios.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nessun utente registrato</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Utente</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Ruolo</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Stato</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase">Data Registrazione</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => (
                  <tr key={usuario.id_usuario} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900">
                        {usuario.nombre} {usuario.apellido || ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{usuario.email}</td>
                    <td className="py-3 px-4">
                      {editingRol?.id_usuario === usuario.id_usuario ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editingRol.rol}
                            onChange={(e) => setEditingRol({ ...editingRol, rol: e.target.value })}
                            className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            <option value="admin">Amministratore</option>
                            <option value="tecnico">Tecnico</option>
                            <option value="comercial">Comercial</option>
                          </select>
                          <button
                            onClick={() => handleUpdateRol(usuario.id_usuario, editingRol.rol)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Salva"
                          >
                            <FiSave className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingRol(null)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Annulla"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRolBadge(usuario.rol)}`}>
                            {getRolLabel(usuario.rol)}
                          </span>
                          <button
                            onClick={() => setEditingRol({ id_usuario: usuario.id_usuario, rol: usuario.rol })}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="Modifica ruolo"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getEstadoBadge(usuario.estado)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(usuario.fecha_registro).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setEditingRol({ id_usuario: usuario.id_usuario, rol: usuario.rol })}
                        className="px-3 py-1.5 text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1"
                        title="Modifica ruolo"
                      >
                        <FiEdit2 className="w-3 h-3" />
                        Modifica Ruolo
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {usuarios.map((usuario) => (
              <div
                key={usuario.id_usuario}
                className="p-4 rounded-xl border-2 border-gray-200 bg-white"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-gray-900 text-base truncate">
                        {usuario.nombre} {usuario.apellido || ''}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${getRolBadge(usuario.rol)}`}>
                        {getRolLabel(usuario.rol)}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <FiMail className="w-3.5 h-3.5" />
                        <span className="truncate">{usuario.email}</span>
                      </div>
                      <div>
                        Registrato: {new Date(usuario.fecha_registro).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="ml-2">{getEstadoBadge(usuario.estado)}</div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  {editingRol?.id_usuario === usuario.id_usuario ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={editingRol.rol}
                        onChange={(e) => setEditingRol({ ...editingRol, rol: e.target.value })}
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="admin">Amministratore</option>
                        <option value="tecnico">Tecnico</option>
                        <option value="comercial">Comercial</option>
                      </select>
                      <button
                        onClick={() => handleUpdateRol(usuario.id_usuario, editingRol.rol)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Salva"
                      >
                        <FiSave className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingRol(null)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Annulla"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditingRol({ id_usuario: usuario.id_usuario, rol: usuario.rol })}
                      className="w-full px-3 py-2.5 text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors flex items-center justify-center gap-1 min-h-[44px]"
                    >
                      <FiEdit2 className="w-4 h-4" />
                      Modifica Ruolo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
        )}
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

