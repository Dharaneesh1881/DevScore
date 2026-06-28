import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getIndustryAdminStats,
  getIndustryAdminTeachers,
  createIndustryAdminTeacher,
  updateIndustryAdminTeacher,
  deleteIndustryAdminTeacher,
  getIndustryAdminStudents
} from '../api/index.js';

const TABS = ['Overview', 'Teachers', 'Students'];

export default function IndustryAdminDashboard() {
  const { user, logout } = useAuth();
  const [tab,      setTab]      = useState('Overview');
  const [stats,    setStats]    = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(false);

  const [showCreate, setShowCreate]   = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, st] = await Promise.all([
        getIndustryAdminStats(),
        getIndustryAdminTeachers(),
        getIndustryAdminStudents()
      ]);
      setStats(s);
      setTeachers(t);
      setStudents(st);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function openCreate() {
    setForm({ name: '', email: '', password: '' });
    setFormError('');
    setEditTeacher(null);
    setShowCreate(true);
  }

  function openEdit(t) {
    setForm({ name: t.name, email: t.email, password: '' });
    setFormError('');
    setEditTeacher(t);
    setShowCreate(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editTeacher) {
        const payload = { name: form.name, email: form.email };
        if (form.password) payload.password = form.password;
        await updateIndustryAdminTeacher(editTeacher._id, payload);
      } else {
        await createIndustryAdminTeacher(form);
      }
      setShowCreate(false);
      loadData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this teacher and all their assignments/submissions?')) return;
    try { await deleteIndustryAdminTeacher(id); loadData(); } catch (e) { alert(e.message); }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div>
          <h1 className="text-base font-bold text-[var(--text-strong)]">Industry Admin</h1>
          <p className="text-xs text-[var(--text-faint)]">{user?.industrySlug}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">{user?.email}</span>
          <button onClick={logout} className="text-xs text-[#f85149] hover:underline">Logout</button>
        </div>
      </header>

      {/* Nav */}
      <div className="flex gap-1 px-6 pt-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors
              ${tab === t ? 'bg-[#4e9af1]/15 text-[#4e9af1]' : 'text-[var(--text-muted)] hover:text-[var(--text-strong)]'}`}>
            {t}
          </button>
        ))}
      </div>

      <main className="flex-1 px-6 py-6 max-w-5xl mx-auto w-full">
        {loading && <p className="text-sm text-[var(--text-faint)]">Loading…</p>}

        {/* Overview */}
        {tab === 'Overview' && stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Teachers', stats.teachers, '#4e9af1'],
              ['Students', stats.students, '#3fb950'],
              ['Assignments', stats.assignments, '#a371f7'],
              ['Progress Records', stats.totalProgress, '#f0a500'],
              ['Completed', stats.completed, '#3fb950'],
              ['Avg Score', `${stats.avgScore}%`, '#4e9af1']
            ].map(([label, value, color]) => (
              <div key={label} className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl p-4">
                <p className="text-xs text-[var(--text-faint)] mb-1">{label}</p>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Teachers */}
        {tab === 'Teachers' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[var(--text-strong)]">Teachers ({teachers.length})</h2>
              <button onClick={openCreate}
                className="px-4 py-2 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg hover:bg-[#1a6cda] transition-colors">
                + Add Teacher
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
                    <th className="text-left px-4 py-3 text-xs text-[var(--text-faint)] font-semibold">Name</th>
                    <th className="text-left px-4 py-3 text-xs text-[var(--text-faint)] font-semibold">Email</th>
                    <th className="text-left px-4 py-3 text-xs text-[var(--text-faint)] font-semibold">Joined</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(t => (
                    <tr key={t._id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-surface)] transition-colors">
                      <td className="px-4 py-3 text-[var(--text-strong)] font-medium">{t.name}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{t.email}</td>
                      <td className="px-4 py-3 text-[var(--text-faint)] text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openEdit(t)} className="text-xs text-[#4e9af1] hover:underline">Edit</button>
                          <button onClick={() => handleDelete(t._id)} className="text-xs text-[#f85149] hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teachers.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-faint)] text-sm">No teachers yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Students */}
        {tab === 'Students' && (
          <div>
            <h2 className="text-base font-semibold text-[var(--text-strong)] mb-4">Students ({students.length})</h2>
            <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
                    <th className="text-left px-4 py-3 text-xs text-[var(--text-faint)] font-semibold">Name</th>
                    <th className="text-left px-4 py-3 text-xs text-[var(--text-faint)] font-semibold">Email</th>
                    <th className="text-left px-4 py-3 text-xs text-[var(--text-faint)] font-semibold">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s._id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-surface)] transition-colors">
                      <td className="px-4 py-3 text-[var(--text-strong)] font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{s.email}</td>
                      <td className="px-4 py-3 text-[var(--text-faint)] text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--text-faint)] text-sm">No students yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Create / Edit Teacher Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-[var(--text-strong)] mb-4">
              {editTeacher ? 'Edit Teacher' : 'Add Teacher'}
            </h3>
            <form onSubmit={handleSave} className="space-y-3">
              {[['Name', 'name', 'text', true], ['Email', 'email', 'email', true], ['Password', 'password', 'password', !editTeacher]].map(([label, key, type, required]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">{label}{!required && ' (leave blank to keep current)'}</label>
                  <input type={type} required={required} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] focus:outline-none focus:border-[#4e9af1]" />
                </div>
              ))}
              {formError && <p className="text-xs text-[#f85149]">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2 border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg hover:bg-[#1a6cda] disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
