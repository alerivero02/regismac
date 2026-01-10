import { useState } from 'react';
import { FiLock, FiX, FiEye, FiEyeOff } from 'react-icons/fi';
import { usuariosAPI } from '../services/api';
import Notification from './Notification';

export default function EstablecerPasswordModal({ show, onClose, onSuccess, required = false }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ ...notification, show: false }), 5000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Tutti i campi sono obbligatori');
      return;
    }

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      setError('Le password non corrispondono');
      return;
    }

    setLoading(true);
    try {
      await usuariosAPI.establecerPassword(password);
      showNotification('Password impostata con successo! Ora puoi accedere con email e password.', 'success');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Errore nell\'impostazione della password');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <>
      <div 
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          animation: 'backdropFadeIn 0.2s ease-out'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && !required) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
          style={{ 
            animation: 'modalAppear 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            willChange: 'transform, opacity'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-5 sm:px-6 py-3 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Imposta una Password
            </h2>
            {!required && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <FiX className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Contenido */}
          <div className="px-5 sm:px-6 py-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">
              {required 
                ? "È necessario impostare una password per continuare. Questa sarà la password che userai per accedere in futuro."
                : "Imposta una password per accedere con email e password."}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nuova Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="input-field pl-10 pr-10"
                      placeholder="Minimo 6 caratteri"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Conferma Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="input-field pl-10 pr-10"
                      placeholder="Conferma la password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end pt-3">
                {!required && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition-colors"
                  >
                    Salta per ora
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className={`${required ? 'w-full' : ''} btn-primary flex items-center justify-center gap-2 px-4 py-2.5`}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Impostazione...</span>
                    </>
                  ) : (
                    <>
                      <FiLock className="w-4 h-4" />
                      <span>Imposta Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Notification
        show={notification.show}
        message={notification.message}
        type={notification.type}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </>
  );
}

