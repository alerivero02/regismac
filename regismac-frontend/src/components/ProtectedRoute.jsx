import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authAPI } from '../services/api';
import LoadingSpinner from './LoadingSpinner';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let timeoutId;
    let isMounted = true;

  const checkAuth = async () => {
    if (DEMO_MODE) {
      // En modo demo, consideramos siempre autenticado con usuario simulado
      setIsAuthenticated(true);
      setLoading(false);
      return;
    }
    try {
        // Timeout de seguridad: si la petición tarda más de 10 segundos, considerar no autenticado
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setIsAuthenticated(false);
            setLoading(false);
          }
        }, 10000);

      const user = await authAPI.getCurrentUser();
        
        // Limpiar timeout si la petición se completó
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // Verificar que el usuario existe, tiene los campos necesarios Y tiene contraseña
        if (isMounted) {
          if (user && user.id_usuario && user.tiene_password) {
        setIsAuthenticated(true);
        // Marcar que el usuario tiene sesion activa (para distinguir sesion expirada vs nunca logueado)
        sessionStorage.setItem('wasLoggedIn', 'true');
      } else {
            // Si no tiene contraseña, aún está autenticado pero el Layout mostrará el modal obligatorio
            const isAuth = user && user.id_usuario ? true : false;
            setIsAuthenticated(isAuth);
            if (isAuth) sessionStorage.setItem('wasLoggedIn', 'true');
          }
          setLoading(false);
      }
    } catch (error) {
        // Limpiar timeout si hubo error
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

      // Cualquier error (401, 403, red, etc.) significa que no está autenticado
        console.error('Error verificando autenticación:', error);
        if (isMounted) {
      setIsAuthenticated(false);
      setLoading(false);
    }
      }
  };

    checkAuth();

    // Cleanup
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Solo ejecutar una vez al montar el componente

  // Mostrar spinner de pantalla completa mientras carga
  if (loading) {
    return <LoadingSpinner message="Verifica autenticazione..." fullScreen={true} />;
  }

  // Redirigir al login si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

