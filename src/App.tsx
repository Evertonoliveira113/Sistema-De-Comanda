import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { useAuth } from './hooks/useAuth';
import Login from './pages/login/Login';
import ForgotPassword from './pages/login/ForgotPassword';
import ResetPassword from './pages/login/ResetPassword';
import Dashboard from './pages/dashboard/Dashboard';
import Comandas from './pages/comandas/Comandas';
import ComandaAtiva from './pages/comandas/ComandaAtiva';
import Historico from './pages/comandas/Historico';
import Produtos from './pages/produtos/Produtos';
import Categorias from './pages/categorias/Categorias';
import Estoque from './pages/admin/Estoque';
import Usuarios from './pages/admin/Usuarios';
import Relatorios from './pages/admin/Relatorios';

// Componente para redirecionamento baseado no role
function RoleBasedRedirect() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirecionar baseado no role
  const redirectPath = profile?.role === 'admin' ? '/dashboard' : '/comandas';
  return <Navigate to={redirectPath} replace />;
}

export default function App() {
  // Configura logout automático após 2 horas de inatividade global
  useInactivityTimeout(2 * 60 * 60 * 1000);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/comandas" element={
            <ProtectedRoute>
              <Comandas />
            </ProtectedRoute>
          } />

          <Route path="/comandas/:id" element={
            <ProtectedRoute>
              <ComandaAtiva />
            </ProtectedRoute>
          } />

          <Route path="/historico" element={
            <ProtectedRoute>
              <Historico />
            </ProtectedRoute>
          } />

          {/* Admin Only Routes */}
          <Route path="/produtos" element={
            <ProtectedRoute adminOnly>
              <Produtos />
            </ProtectedRoute>
          } />

          <Route path="/categorias" element={
            <ProtectedRoute adminOnly>
              <Categorias />
            </ProtectedRoute>
          } />

          <Route path="/estoque" element={
            <ProtectedRoute adminOnly>
              <Estoque />
            </ProtectedRoute>
          } />

          <Route path="/usuarios" element={
            <ProtectedRoute adminOnly>
              <Usuarios />
            </ProtectedRoute>
          } />

          <Route path="/relatorios" element={
            <ProtectedRoute adminOnly>
              <Relatorios />
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="/" element={<RoleBasedRedirect />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
