import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getIndustries } from '../api/index.js';

export default function IndustrySelectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  // Already logged-in users skip this page
  useEffect(() => {
    if (!user) return;
    const dest = {
      teacher:        '/teacher',
      student:        '/student',
      industry_admin: '/industry-admin',
      platform_admin: '/platform-admin/dashboard'
    }[user.role] || '/login';
    navigate(dest, { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    getIndustries()
      .then(setIndustries)
      .catch(() => setError('Could not load industry list.'))
      .finally(() => setLoading(false));
  }, []);

  function choose(slug) {
    navigate('/login', { state: { industrySlug: slug } });
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-[var(--text-strong)] text-center mb-2">DevScore</h1>
        <p className="text-sm text-[var(--text-faint)] text-center mb-10">
          Select your organisation to continue
        </p>

        {loading && (
          <p className="text-center text-[var(--text-muted)] text-sm">Loading…</p>
        )}
        {error && (
          <p className="text-center text-[#f85149] text-sm">{error}</p>
        )}

        {!loading && !error && (
          <>
            {industries.length > 4 && (
              <div className="relative mb-5">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search organisations…"
                  autoFocus
                  className="w-full pl-9 pr-9 py-2.5 bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-strong)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[#4e9af1] transition-colors"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors"
                    aria-label="Clear search"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            )}

            {(() => {
              const filtered = query.trim()
                ? industries.filter(ind =>
                    ind.name.toLowerCase().includes(query.toLowerCase()) ||
                    ind.slug.toLowerCase().includes(query.toLowerCase())
                  )
                : industries;

              if (industries.length === 0) {
                return <p className="text-center text-[var(--text-muted)] text-sm">No organisations available.</p>;
              }
              if (filtered.length === 0) {
                return <p className="text-center text-[var(--text-muted)] text-sm">No organisations match "{query}".</p>;
              }
              return (
                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {filtered.map(ind => (
                    <button
                      key={ind._id}
                      onClick={() => choose(ind.slug)}
                      className="w-full flex items-center gap-4 px-5 py-4 bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl
                                 hover:border-[#4e9af1] hover:bg-[var(--bg-surface)] transition-colors text-left group"
                    >
                      <span className="w-10 h-10 rounded-lg bg-[#4e9af1]/10 flex items-center justify-center text-lg font-bold text-[#4e9af1] shrink-0 group-hover:bg-[#4e9af1]/20 transition-colors">
                        {ind.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-strong)]">{ind.name}</p>
                        <p className="text-xs text-[var(--text-faint)]">{ind.slug}</p>
                      </div>
                      <svg className="ml-auto text-[var(--text-faint)] group-hover:text-[#4e9af1] transition-colors shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              );
            })()}
          </>
        )}

        <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
          <button
            onClick={() => navigate('/platform-admin/login')}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-[var(--border-color)] rounded-xl
                       text-xs text-[var(--text-muted)] hover:border-[#f85149] hover:text-[#f85149] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Platform Administrator Login
          </button>
        </div>
      </div>
    </div>
  );
}
