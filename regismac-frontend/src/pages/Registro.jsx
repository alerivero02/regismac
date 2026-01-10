import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiUserPlus, FiMail, FiLock, FiUser, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { usuariosAPI } from '../services/api';
import Notification from '../components/Notification';

export default function Registro() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();


  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const validateForm = () => {
    if (!formData.nombre || !formData.email || !formData.password) {
      setError('Tutti i campi contrassegnati con * sono obbligatori');
      return false;
    }

    if (formData.password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Le password non corrispondono');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await usuariosAPI.registro({
        nombre: formData.nombre,
        apellido: formData.apellido || null,
        email: formData.email,
        password: formData.password,
      });

      showNotification('Registrazione completata. Il tuo account è in attesa di approvazione.', 'success');
      
      setTimeout(() => {
        navigate('/login?registro=exitoso');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Errore durante la registrazione');
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ ...notification, show: false }), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4 sm:p-6 lg:p-8" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <div className="max-w-md w-full" style={{ width: '100%', maxWidth: '28rem' }}>
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-gray-100" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
                <FiUserPlus className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Crea Account
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Registrati e attendi l'approvazione dell'amministratore
            </p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 sm:gap-3">
              <FiAlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nome <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="Il tuo nome"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Cognome
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleInputChange}
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="Il tuo cognome"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-9 sm:pl-10 pr-9 sm:pr-10 text-sm sm:text-base"
                  placeholder="Minimo 6 caratteri"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Conferma Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  className="input-field pl-9 sm:pl-10 text-sm sm:text-base"
                  placeholder="Ripeti la password"
                />
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-start gap-2 sm:gap-3">
                <FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm text-blue-700">
                  <p className="font-semibold mb-1">Nota importante:</p>
                  <p>Il tuo account sarà esaminato da un amministratore. Riceverai una notifica una volta approvato.</p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Registrazione in corso...</span>
                </>
              ) : (
                <>
                  <FiUserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Registrati</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              Hai già un account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold">
                Accedi qui
              </Link>
            </p>
          </div>
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

