import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Registros from './pages/Registros';
import Test from './pages/Test';
import Login from './pages/Login';
import Registro from './pages/Registro';
import AdminUsuarios from './pages/AdminUsuarios';
import Materiali from './pages/Materiali';
import OrdiniMateriali from './pages/OrdiniMateriali';
import Lotti from './pages/Lotti';
import ProtectedRoute from './components/ProtectedRoute';
import { healthAPI } from './services/api';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Componente para mantener la app activa en Render (solo en producción)
function KeepAlive() {
  useEffect(() => {
    // Solo hacer ping en producción (Render/Vercel)
    // En local, no es necesario y genera errores en consola
    const isProduction = window.location.hostname !== 'localhost' && 
                        window.location.hostname !== '127.0.0.1' &&
                        !window.location.hostname.match(/^192\.168\./);

    // En modo demo no hacemos ping al backend
    if (!isProduction || DEMO_MODE) {
      // En local, no hacer nada
      return;
    }

    // Función para hacer ping al servidor (sin bloquear, fire-and-forget)
    const pingServer = () => {
      // Usar fetch directamente sin await para no bloquear
      // Esto se ejecuta en background sin afectar la UI
      fetch(`${window.location.origin}/api/health`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-cache',
        keepalive: true // Mantener la conexión viva
      })
        .then(() => {
          // Solo loguear en producción si es necesario (comentado para reducir ruido)
          // console.log('✅ Ping enviado para mantener la app activa');
        })
        .catch(() => {
          // Ignorar errores silenciosamente para no bloquear la UI
        });
    };

    // Hacer ping inmediatamente al cargar (sin bloquear la renderización)
    // Usar setTimeout con 0 para que se ejecute después de que la UI se renderice
    setTimeout(pingServer, 0);

    // Hacer ping cada 1.5 minutos (90000 ms) para mantener el servicio activo
    // Esto es más frecuente para evitar que Render duerma el servicio
    // Render free plan duerme después de 15 minutos de inactividad
    const interval = setInterval(pingServer, 90 * 1000);

    // Limpiar intervalo al desmontar
    return () => clearInterval(interval);
  }, []);

  return null; // Este componente no renderiza nada
}

function App() {
  return (
    <Router>
      <KeepAlive />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        
        {/* Rutas protegidas que requieren autenticación */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="registros" element={<Registros />} />
          <Route path="test" element={<Test />} />
          <Route path="admin/usuarios" element={<AdminUsuarios />} />
          <Route path="materiali" element={<Materiali />} />
          <Route path="ordini-materiali" element={<OrdiniMateriali />} />
          <Route path="lotti" element={<Lotti />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App
