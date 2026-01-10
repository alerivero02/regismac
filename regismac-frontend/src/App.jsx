import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App
