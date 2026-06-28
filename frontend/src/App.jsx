import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import IndustrySelectPage from './pages/IndustrySelectPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import TeacherDashboard from './pages/TeacherDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import IndustryAdminDashboard from './pages/IndustryAdminDashboard.jsx';
import './App.css';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

function roleHome(role) {
  return {
    teacher:        '/teacher',
    student:        '/student',
    industry_admin: '/industry-admin',
    platform_admin: '/platform-admin/dashboard'
  }[role] || '/';
}

function PlatformAdminGuard({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) return <Navigate to="/platform-admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Phase 1: Industry selection */}
            <Route path="/" element={<IndustrySelectPage />} />

            {/* Phase 2: Role login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Tenant role dashboards */}
            <Route path="/teacher" element={
              <ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>
            } />
            <Route path="/student" element={
              <ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>
            } />
            <Route path="/industry-admin" element={
              <ProtectedRoute role="industry_admin"><IndustryAdminDashboard /></ProtectedRoute>
            } />

            {/* Platform admin — separate auth via adminToken in localStorage */}
            <Route path="/platform-admin/login" element={<AdminLogin />} />
            <Route path="/platform-admin/dashboard" element={
              <PlatformAdminGuard><AdminDashboard /></PlatformAdminGuard>
            } />

            {/* Legacy admin redirect */}
            <Route path="/admin" element={<Navigate to="/platform-admin/login" replace />} />
            <Route path="/admin/dashboard" element={<Navigate to="/platform-admin/dashboard" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
