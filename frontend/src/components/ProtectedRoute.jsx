import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleHome = (role) => ({
  teacher:        '/teacher',
  student:        '/student',
  industry_admin: '/industry-admin',
  platform_admin: '/platform-admin/dashboard'
}[role] || '/');

export function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-base)]">
        <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (role && user.role !== role) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return children;
}
