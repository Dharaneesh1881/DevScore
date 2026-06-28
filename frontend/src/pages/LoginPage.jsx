import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { login, industryAdminLogin } from '../api/index.js';

export default function LoginPage() {
  const { login: authLogin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const industrySlug = location.state?.industrySlug || '';
  const industryName = location.state?.industryName || industrySlug;

  const [form, setForm]           = useState({ email: '', password: '' });
  const [loginAs, setLoginAs]     = useState('user');   // 'user' | 'industry_admin'
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!industrySlug) {
    // Redirect back to industry selection if somehow reached without a slug
    navigate('/', { replace: true });
    return null;
  }

  const roleDestination = (role) => ({
    teacher:        '/teacher',
    student:        '/student',
    industry_admin: '/industry-admin',
    platform_admin: '/platform-admin/dashboard'
  })[role] || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let token, user;
      if (loginAs === 'industry_admin') {
        ({ token, user } = await industryAdminLogin(form.email, form.password));
        if (user.industrySlug !== industrySlug) {
          throw new Error('This account does not belong to the selected organisation.');
        }
      } else {
        ({ token, user } = await login(form.email, form.password, industrySlug));
      }
      authLogin(token, user);
      navigate(roleDestination(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate('/', { replace: true })}
          className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] mb-6 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Change organisation
        </button>

        <h1 className="text-2xl font-bold text-[var(--text-strong)] text-center mb-1">
          {industryName || industrySlug}
        </h1>
        <p className="text-sm text-[var(--text-faint)] text-center mb-6">Sign in to your account</p>

        {/* Role toggle */}
        <div className="flex rounded-lg border border-[var(--border-color)] overflow-hidden mb-6">
          {[['user', 'Student / Teacher'], ['industry_admin', 'Admin']].map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setLoginAs(val)}
              className={`flex-1 py-2 text-xs font-semibold transition-colors
                ${loginAs === val
                  ? 'bg-[#4e9af1] text-white'
                  : 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-strong)]'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)]
                         placeholder:text-[var(--border-light)] focus:outline-none focus:border-[#4e9af1]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)]
                           placeholder:text-[var(--border-light)] focus:outline-none focus:border-[#4e9af1] pr-10"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword
                  ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-[#f85149]">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg
                       hover:bg-[#1a6cda] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
