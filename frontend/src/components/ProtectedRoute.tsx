import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-msg">Carregando…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
