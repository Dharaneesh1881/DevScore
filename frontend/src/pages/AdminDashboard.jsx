import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiShield, FiLogOut, FiPlus, FiTrash2, FiEdit2, FiRefreshCw, FiUsers, FiBookOpen, FiActivity } from 'react-icons/fi';
import {
  getPlatformAdminStats,
  getPlatformAdminIndustries,
  createPlatformAdminIndustry,
  updatePlatformAdminIndustry,
  deletePlatformAdminIndustry,
  getPlatformAdminIndustryAdmins,
  createPlatformAdminIndustryAdmin,
  deletePlatformAdminIndustryAdmin
} from '../api/index.js';

const TABS = ['Overview', 'Industries', 'Industry Admins'];

function StatCard({ label, value, color = '#4e9af1', sub }) {
  return (
    <div className="bg-[#10101e] border border-[#1e1e30] rounded-xl p-5">
      <p className="text-2xl font-black text-white">{value ?? '—'}</p>
      <p className="text-xs text-[#666] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#444] mt-1">{sub}</p>}
    </div>
  );
}

function Spinner() {
  return <div className="w-6 h-6 rounded-full border-2 border-[#1e1e30] border-t-[#ff4444] animate-spin mx-auto" />;
}

export default function AdminDashboard() {
  const navigate   = useNavigate();
  const [tab,      setTab]       = useState('Overview');
  const [stats,    setStats]     = useState(null);
  const [industries, setIndustries] = useState([]);
  const [admins,   setAdmins]    = useState([]);
  const [loading,  setLoading]   = useState(false);

  // Create/Edit modals
  const [indModal,   setIndModal]   = useState(false);
  const [editInd,    setEditInd]    = useState(null);
  const [indForm,    setIndForm]    = useState({ name: '', slug: '' });
  const [indError,   setIndError]   = useState('');
  const [indSaving,  setIndSaving]  = useState(false);

  const [adminModal,  setAdminModal]  = useState(false);
  const [adminForm,   setAdminForm]   = useState({ name: '', email: '', password: '', industryId: '' });
  const [adminError,  setAdminError]  = useState('');
  const [adminSaving, setAdminSaving] = useState(false);

  const adminToken = localStorage.getItem('adminToken');

  function logout() {
    localStorage.removeItem('adminToken');
    navigate('/platform-admin/login', { replace: true });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, inds, adms] = await Promise.all([
        getPlatformAdminStats(),
        getPlatformAdminIndustries(),
        getPlatformAdminIndustryAdmins()
      ]);
      setStats(s);
      setIndustries(inds);
      setAdmins(adms);
    } catch (e) {
      if (e.message.includes('403') || e.message.includes('401')) logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminToken) { navigate('/platform-admin/login', { replace: true }); return; }
    load();
  }, [adminToken, load, navigate]);

  // ── Industry CRUD ──────────────────────────────────────────────────────────

  function openCreateInd() {
    setIndForm({ name: '', slug: '' });
    setIndError('');
    setEditInd(null);
    setIndModal(true);
  }

  function openEditInd(ind) {
    setIndForm({ name: ind.name, slug: ind.slug });
    setIndError('');
    setEditInd(ind);
    setIndModal(true);
  }

  async function saveInd(e) {
    e.preventDefault();
    setIndSaving(true);
    setIndError('');
    try {
      if (editInd) {
        await updatePlatformAdminIndustry(editInd._id, { name: indForm.name, isActive: true });
      } else {
        await createPlatformAdminIndustry(indForm);
      }
      setIndModal(false);
      load();
    } catch (err) { setIndError(err.message); }
    finally { setIndSaving(false); }
  }

  async function deleteInd(id, name) {
    if (!confirm(`Delete industry "${name}" and ALL its data? This cannot be undone.`)) return;
    try { await deletePlatformAdminIndustry(id); load(); } catch (e) { alert(e.message); }
  }

  // ── Industry Admin CRUD ───────────────────────────────────────────────────

  function openCreateAdmin() {
    setAdminForm({ name: '', email: '', password: '', industryId: industries[0]?._id || '' });
    setAdminError('');
    setAdminModal(true);
  }

  async function saveAdmin(e) {
    e.preventDefault();
    setAdminSaving(true);
    setAdminError('');
    try {
      await createPlatformAdminIndustryAdmin(adminForm);
      setAdminModal(false);
      load();
    } catch (err) { setAdminError(err.message); }
    finally { setAdminSaving(false); }
  }

  async function deleteAdmin(id) {
    if (!confirm('Remove this industry admin?')) return;
    try { await deletePlatformAdminIndustryAdmin(id); load(); } catch (e) { alert(e.message); }
  }

  return (
    <div className="min-h-screen bg-[#080812] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e30] bg-[#10101e]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#ff4444]/20 border border-[#ff4444]/30 flex items-center justify-center">
            <FiShield size={14} className="text-[#ff4444]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Platform Admin</h1>
            <p className="text-[10px] text-[#555]">DevScore Management Console</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#888] border border-[#1e1e30] rounded-lg px-3 py-1.5 transition-colors">
            <FiRefreshCw size={11} /> Refresh
          </button>
          <button onClick={logout} className="flex items-center gap-1.5 text-xs text-[#ff4444]/80 hover:text-[#ff4444] transition-colors">
            <FiLogOut size={13} /> Logout
          </button>
        </div>
      </header>

      {/* Nav */}
      <div className="flex gap-1 px-6 pt-4 border-b border-[#1e1e30] pb-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
              ${tab === t ? 'border-[#ff4444] text-white' : 'border-transparent text-[#666] hover:text-[#888]'}`}>
            {t}
          </button>
        ))}
      </div>

      <main className="flex-1 px-6 py-6 max-w-6xl mx-auto w-full">
        {loading && <div className="py-20"><Spinner /></div>}

        {/* Overview */}
        {!loading && tab === 'Overview' && stats && (
          <div>
            <h2 className="text-lg font-bold text-white mb-5">Cross-Industry Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Industries" value={stats.totalIndustries} color="#ff4444" />
              <StatCard label="Total Teachers" value={stats.totals.teachers} color="#4e9af1" />
              <StatCard label="Total Students" value={stats.totals.students} color="#3fb950" />
              <StatCard label="Total Assignments" value={stats.totals.assignments} color="#a371f7" />
            </div>

            <h3 className="text-sm font-bold text-white mb-3">Per-Industry Breakdown</h3>
            <div className="overflow-x-auto rounded-xl border border-[#1e1e30]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e30] bg-[#10101e]">
                    {['Industry', 'Teachers', 'Students', 'Assignments', 'Completed', 'Avg Score'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] text-[#666] font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.perIndustry.map(ind => (
                    <tr key={ind.industryId} className="border-b border-[#1e1e30] hover:bg-[#10101e] transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{ind.name}</td>
                      <td className="px-4 py-3 text-[#aaa]">{ind.teachers}</td>
                      <td className="px-4 py-3 text-[#aaa]">{ind.students}</td>
                      <td className="px-4 py-3 text-[#aaa]">{ind.assignments}</td>
                      <td className="px-4 py-3 text-[#3fb950]">{ind.completed}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${ind.avgScore >= 50 ? 'text-[#3fb950]' : 'text-[#f0a500]'}`}>{ind.avgScore}%</span>
                      </td>
                    </tr>
                  ))}
                  {stats.perIndustry.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-[#555] text-sm">No industries yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Industries */}
        {!loading && tab === 'Industries' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Industries ({industries.length})</h2>
              <button onClick={openCreateInd}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ff4444] text-white text-sm font-semibold rounded-lg hover:bg-[#e03535] transition-colors">
                <FiPlus size={14} /> Add Industry
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {industries.map(ind => (
                <div key={ind._id} className="bg-[#10101e] border border-[#1e1e30] rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-white">{ind.name}</h3>
                      <p className="text-xs text-[#555] mt-0.5">{ind.slug}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ind.isActive ? 'border-[#3fb950]/20 text-[#3fb950] bg-[#3fb950]/10' : 'border-[#666]/20 text-[#666] bg-[#222]'}`}>
                      {ind.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {ind.stats && (
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      {[['Teachers', ind.stats.teachers, '#4e9af1'], ['Students', ind.stats.students, '#3fb950'], ['Assignments', ind.stats.assignments, '#a371f7']].map(([l, v, c]) => (
                        <div key={l} className="bg-[#0d0d1a] rounded-lg py-2">
                          <p className="text-sm font-bold" style={{ color: c }}>{v}</p>
                          <p className="text-[9px] text-[#555]">{l}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => openEditInd(ind)}
                      className="flex items-center gap-1 text-xs text-[#4e9af1] border border-[#4e9af1]/20 px-3 py-1.5 rounded-lg hover:bg-[#4e9af1]/10 transition-colors">
                      <FiEdit2 size={11} /> Edit
                    </button>
                    <button onClick={() => deleteInd(ind._id, ind.name)}
                      className="flex items-center gap-1 text-xs text-[#f85149] border border-[#f85149]/20 px-3 py-1.5 rounded-lg hover:bg-[#f85149]/10 transition-colors">
                      <FiTrash2 size={11} /> Delete
                    </button>
                  </div>
                </div>
              ))}
              {industries.length === 0 && (
                <div className="col-span-2 py-16 text-center text-[#555] text-sm">No industries yet. Create one to get started.</div>
              )}
            </div>
          </div>
        )}

        {/* Industry Admins */}
        {!loading && tab === 'Industry Admins' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Industry Admins ({admins.length})</h2>
              <button onClick={openCreateAdmin} disabled={industries.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#ff4444] text-white text-sm font-semibold rounded-lg hover:bg-[#e03535] disabled:opacity-40 transition-colors">
                <FiPlus size={14} /> Add Admin
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#1e1e30]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1e1e30] bg-[#10101e]">
                    {['Name', 'Email', 'Industry', 'Created', ''].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[10px] text-[#666] font-semibold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a._id} className="border-b border-[#1e1e30] hover:bg-[#10101e] transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{a.name}</td>
                      <td className="px-4 py-3 text-[#888]">{a.email}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-[#4e9af1]/20 text-[#4e9af1] bg-[#4e9af1]/10">
                          {a.industrySlug}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#555] text-xs">{new Date(a.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteAdmin(a._id)}
                          className="text-xs text-[#f85149] hover:underline flex items-center gap-1">
                          <FiTrash2 size={11} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {admins.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-[#555] text-sm">No industry admins yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Industry Modal */}
      {indModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#10101e] border border-[#1e1e30] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-white mb-4">{editInd ? 'Edit Industry' : 'Add Industry'}</h3>
            <form onSubmit={saveInd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1">Industry Name</label>
                <input value={indForm.name} onChange={e => setIndForm(f => ({ ...f, name: e.target.value }))} required
                  placeholder="e.g. KPRIET College"
                  className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#ff4444]/60" />
              </div>
              {!editInd && (
                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1">Slug (URL-safe ID)</label>
                  <input value={indForm.slug} onChange={e => setIndForm(f => ({ ...f, slug: e.target.value }))} required
                    placeholder="e.g. kpriet"
                    className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#ff4444]/60" />
                  <p className="text-[10px] text-[#555] mt-1">Lowercase letters, numbers, and hyphens only. Cannot be changed later.</p>
                </div>
              )}
              {indError && <p className="text-xs text-[#f85149]">{indError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIndModal(false)}
                  className="flex-1 py-2 border border-[#2a2a3a] rounded-lg text-sm text-[#666] hover:text-[#888] transition-colors">Cancel</button>
                <button type="submit" disabled={indSaving}
                  className="flex-1 py-2 bg-[#ff4444] text-white text-sm font-semibold rounded-lg hover:bg-[#e03535] disabled:opacity-50 transition-colors">
                  {indSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Modal */}
      {adminModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-[#10101e] border border-[#1e1e30] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-bold text-white mb-4">Add Industry Admin</h3>
            <form onSubmit={saveAdmin} className="space-y-3">
              {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[#888] mb-1">{label}</label>
                  <input type={type} value={adminForm[key]} onChange={e => setAdminForm(f => ({ ...f, [key]: e.target.value }))} required
                    className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg text-white text-sm placeholder-[#444] focus:outline-none focus:border-[#ff4444]/60" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-[#888] mb-1">Industry</label>
                <select value={adminForm.industryId} onChange={e => setAdminForm(f => ({ ...f, industryId: e.target.value }))} required
                  className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#2a2a3a] rounded-lg text-white text-sm focus:outline-none focus:border-[#ff4444]/60">
                  {industries.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                </select>
              </div>
              {adminError && <p className="text-xs text-[#f85149]">{adminError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAdminModal(false)}
                  className="flex-1 py-2 border border-[#2a2a3a] rounded-lg text-sm text-[#666] hover:text-[#888] transition-colors">Cancel</button>
                <button type="submit" disabled={adminSaving}
                  className="flex-1 py-2 bg-[#ff4444] text-white text-sm font-semibold rounded-lg hover:bg-[#e03535] disabled:opacity-50 transition-colors">
                  {adminSaving ? 'Saving…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
