import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiLogIn, FiAlertCircle, FiMail, FiLock } from 'react-icons/fi';
import { authAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Notification from '../components/Notification';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar si ya está autenticado
    checkAuth();
    
    // Verificar si hay error en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const solicitudEnviada = urlParams.get('solicitud_enviada');
    const sessionExpired = urlParams.get('sessionExpired') || sessionStorage.getItem('sessionExpired');
    
    // Limpiar sessionStorage
    if (sessionExpired) {
      sessionStorage.removeItem('sessionExpired');
    }
    
    if (sessionExpired) {
      setNotification({
        show: true,
        message: 'Sessione scaduta. Effettua nuovamente il login.',
        type: 'error'
      });
    } else if (solicitudEnviada === 'true') {
      setNotification({
        show: true,
        message: 'La tua richiesta di accesso è stata inviata. Un amministratore esaminerà la tua richiesta e ti notificherà quando sarà approvata.',
        type: 'info'
      });
    } else if (errorParam === 'auth_failed') {
      setError('Errore durante l\'autenticazione con Google. Riprova.');
    } else if (errorParam === 'redirect_uri_mismatch') {
      setError('Errore di configurazione OAuth. Il redirect_uri non corrisponde. Contatta l\'amministratore.');
    } else if (errorParam === 'oauth_config_error') {
      setError('Errore di configurazione OAuth. Verifica che il tipo di applicazione in Google Cloud Console sia "Web application" e che le URL di callback siano configurate correttamente.');
    } else if (errorParam === 'rechazado') {
      setError('Il tuo account è stato rifiutato. Contatta l\'amministratore per maggiori informazioni.');
    }
  }, []);

  const checkAuth = async () => {
    try {
      const user = await authAPI.getCurrentUser();
      if (user) {
        // Limpiar consola al iniciar sesión
        console.clear();
        navigate('/', { replace: true });
      }
    } catch (err) {
      // No autenticado, mostrar página de login
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(formData.email, formData.password);
      if (response.usuario) {
        // Limpiar consola al iniciar sesión exitosamente
        console.clear();
        showNotification('Accesso effettuato con successo', 'success');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      }
    } catch (err) {
      setError(err.message || 'Errore durante l\'accesso');
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setError(null);
    authAPI.loginGoogle();
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ ...notification, show: false }), 5000);
  };

  if (loading && !formData.email) {
    return <LoadingSpinner message="Reindirizzamento a Google..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4 sm:p-6 lg:p-8" style={{ width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}>
      <div className="max-w-md w-full" style={{ width: '100%', maxWidth: '28rem' }}>
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 border border-gray-100" style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-4 sm:mb-6">
              <div className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-lg">
                <FiLogIn className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
              Accedi
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Accedi al tuo account per continuare
            </p>
          </div>

          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 sm:gap-3">
              <FiAlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
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
                Password
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
                  placeholder="••••••••"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 sm:py-3 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Accesso in corso...</span>
                </>
              ) : (
                <>
                  <FiLogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Accedi</span>
                </>
              )}
            </button>
          </form>

          <div className="relative mb-4 sm:mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 bg-white text-gray-500">Oppure continua con</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-semibold text-gray-700 text-sm sm:text-base"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continua con Google
          </button>

          <div className="mt-4 sm:mt-6 text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              Non hai un account?{' '}
              <Link to="/registro" className="text-primary-600 hover:text-primary-700 font-semibold">
                Registrati qui
              </Link>
            </p>
          </div>

          <p className="mt-3 sm:mt-4 text-xs text-gray-500 text-center px-2">
            Accedendo, accetti i nostri termini di servizio e la politica sulla privacy
          </p>
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
