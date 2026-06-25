import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FiShield, FiUsers, FiBookOpen, FiFileText, FiBarChart2,
    FiRefreshCw, FiTrash2, FiEye, FiPlay, FiLogOut, FiToggleLeft, FiToggleRight,
    FiAlertCircle, FiCheckCircle, FiClock, FiActivity, FiSearch, FiChevronRight,
    FiPackage, FiPlus, FiX, FiLink, FiEdit2
} from 'react-icons/fi';
// FiUsers, FiCheckCircle, FiBarChart2, FiActivity already imported above
import { MdCheckCircle, MdCancel } from 'react-icons/md';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';

const API_BASE = '/api';

function adminHeaders() {
    const token = localStorage.getItem('adminToken');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

async function adminFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}${path}`, { headers: adminHeaders(), ...opts });
    const data = await res.json().catch(() => ({ error: 'Unknown error' }));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
}

// ── Reusable UI ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color = '#4e9af1', sub }) {
    return (
        <div className="bg-[#10101e] border border-[#1e1e30] rounded-xl p-5 flex items-start gap-4">
            <div className="p-2.5 rounded-xl shrink-0" style={{ background: `${color}18` }}>
                <Icon size={20} style={{ color }} />
            </div>
            <div>
                <p className="text-2xl font-black text-white">{value ?? '—'}</p>
                <p className="text-xs text-[#666] mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-[#444] mt-1">{sub}</p>}
            </div>
        </div>
    );
}

function SectionHeader({ children, action }) {
    return (
        <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">{children}</h2>
            {action}
        </div>
    );
}

function Badge({ children, color = 'blue' }) {
    const colors = {
        blue: 'bg-[#4e9af1]/10 text-[#4e9af1] border-[#4e9af1]/20',
        green: 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/20',
        red: 'bg-[#f85149]/10 text-[#f85149] border-[#f85149]/20',
        orange: 'bg-[#f0a500]/10 text-[#f0a500] border-[#f0a500]/20',
        gray: 'bg-[#2a2a3a] text-[#666] border-[#2a2a3a]',
    };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[color]}`}>
            {children}
        </span>
    );
}

function Spinner() {
    return <div className="w-6 h-6 rounded-full border-2 border-[#1e1e30] border-t-[#ff4444] animate-spin" />;
}

function ScoreBar({ score }) {
    const color = score >= 80 ? '#3fb950' : score >= 50 ? '#f0a500' : '#f85149';
    return (
        <div className="flex items-center gap-2">
            <div className="w-20 bg-[#0d0d1a] rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
            </div>
            <span className="text-xs font-bold" style={{ color }}>{score}</span>
        </div>
    );
}

// ── Views ──────────────────────────────────────────────────────────────────────

function OverviewView({ stats, loading, onRefresh }) {
    if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
    if (!stats) return null;

    const dist = stats.scoreDistribution;
    const distMax = Math.max(...Object.values(dist), 1);

    return (
        <div>
            <SectionHeader action={
                <button onClick={onRefresh} className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#888] border border-[#1e1e30] rounded-lg px-3 py-1.5 transition-colors">
                    <FiRefreshCw size={12} /> Refresh
                </button>
            }>
                Platform Overview
            </SectionHeader>

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={FiBookOpen} label="Assignments" value={stats.assignments} color="#4e9af1" />
                <StatCard icon={FiUsers} label="Users" value={stats.users} color="#a371f7" />
                <StatCard icon={FiFileText} label="Submissions" value={stats.submissions} color="#f0a500" />
                <StatCard icon={FiBarChart2} label="Evaluations" value={stats.evalRuns} color="#3fb950" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <StatCard icon={FiCheckCircle} label="Completed" value={stats.completedCount} sub={`out of ${stats.totalProgress} submissions`} color="#3fb950" />
                <StatCard icon={FiActivity} label="Avg Score" value={`${stats.avgScore}/100`} color={stats.avgScore >= 50 ? '#3fb950' : '#f85149'} />
                <StatCard icon={FiUsers} label="Completion Rate" value={`${stats.totalProgress ? Math.round(stats.completedCount / stats.totalProgress * 100) : 0}%`} color="#4e9af1" />
            </div>

            {/* Score distribution chart */}
            <div className="bg-[#10101e] border border-[#1e1e30] rounded-xl p-6">
                <h3 className="text-sm font-bold text-white mb-5">Score Distribution</h3>
                <div className="flex items-end gap-3 h-36">
                    {Object.entries(dist).map(([range, count]) => {
                        const pct = Math.round((count / distMax) * 100);
                        const color = range.startsWith('81') ? '#3fb950'
                            : range.startsWith('61') ? '#4e9af1'
                                : range.startsWith('41') ? '#f0a500'
                                    : range.startsWith('21') ? '#f0a500'
                                        : '#f85149';
                        return (
                            <div key={range} className="flex-1 flex flex-col items-center gap-2">
                                <span className="text-xs text-[#666]">{count}</span>
                                <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(pct, 4)}%`, background: color, opacity: 0.8 }} />
                                <span className="text-[9px] text-[#555]">{range}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

function UsersView() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState(null);

    useEffect(() => {
        adminFetch('/admin/users').then(setUsers).finally(() => setLoading(false));
    }, []);

    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`Delete user "${userName}" and all their progress? This cannot be undone.`)) return;
        setDeleting(userId);
        try {
            await adminFetch(`/admin/users/${userId}`, { method: 'DELETE' });
            setUsers(prev => prev.filter(u => u._id !== userId));
        } catch (e) { alert(e.message); }
        finally { setDeleting(null); }
    };

    const filtered = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <SectionHeader>Users ({users.length})</SectionHeader>
            <div className="relative mb-4">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
                    className="w-full pl-9 pr-4 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#ff4444]/50 transition-colors" />
            </div>
            {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
                <div className="bg-[#10101e] border border-[#1e1e30] rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#1e1e30] text-left text-xs text-[#555]">
                                <th className="px-4 py-3 font-semibold">Name</th>
                                <th className="px-4 py-3 font-semibold">Email</th>
                                <th className="px-4 py-3 font-semibold">Role</th>
                                <th className="px-4 py-3 font-semibold">Joined</th>
                                <th className="px-4 py-3 font-semibold w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(u => (
                                <tr key={u._id} className={`border-b border-[#0d0d1a] hover:bg-[#0d0d1a] transition-colors ${deleting === u._id ? 'opacity-40' : ''}`}>
                                    <td className="px-4 py-3 font-semibold text-white">{u.name}</td>
                                    <td className="px-4 py-3 text-[#888]">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <Badge color={u.role === 'teacher' ? 'blue' : u.role === 'student' ? 'green' : 'orange'}>{u.role}</Badge>
                                    </td>
                                    <td className="px-4 py-3 text-[#666] text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => handleDelete(u._id, u.name)} disabled={deleting === u._id}
                                            className="p-1.5 rounded-lg text-[#555] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors">
                                            <FiTrash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && <p className="text-[#555] text-sm text-center py-10">No users found.</p>}
                </div>
            )}
        </div>
    );
}

function AssignmentsView() {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [allPolicies, setAllPolicies] = useState([]);
    const [libraryModal, setLibraryModal] = useState(null); // { assignmentId, policyIds }
    const [regenerating, setRegenerating] = useState(null);
    const [regenMsg, setRegenMsg] = useState({});

    useEffect(() => {
        adminFetch('/admin/assignments').then(setAssignments).finally(() => setLoading(false));
        adminFetch('/admin/library-policies').then(setAllPolicies).catch(() => {});
    }, []);

    const handleToggle = async (id) => {
        setToggling(id);
        try {
            const updated = await adminFetch(`/admin/assignments/${id}/toggle`, { method: 'PATCH' });
            setAssignments(prev => prev.map(a => a._id === id ? { ...a, isActive: updated.isActive } : a));
        } catch (e) { alert(e.message); }
        finally { setToggling(null); }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete assignment "${title}" and ALL its data? This is irreversible.`)) return;
        setDeleting(id);
        try {
            await adminFetch(`/admin/assignments/${id}`, { method: 'DELETE' });
            setAssignments(prev => prev.filter(a => a._id !== id));
        } catch (e) { alert(e.message); }
        finally { setDeleting(null); }
    };

    const handleRegenerate = async (id) => {
        setRegenerating(id);
        setRegenMsg(prev => ({ ...prev, [id]: '' }));
        try {
            const d = await adminFetch(`/admin/assignments/${id}/regenerate-baseline`, { method: 'POST' });
            setRegenMsg(prev => ({ ...prev, [id]: `✓ Baseline regenerated (${d.screenshotCount} screenshots)` }));
            // Update the thumbnail in the list
            if (d.referenceScreenshotUrl) {
                setAssignments(prev => prev.map(a =>
                    a._id === id ? { ...a, referenceScreenshotUrl: d.referenceScreenshotUrl } : a
                ));
            }
        } catch (e) {
            setRegenMsg(prev => ({ ...prev, [id]: '✗ ' + e.message }));
        }
        finally { setRegenerating(null); }
    };

    return (
        <div>
            <SectionHeader>Assignments ({assignments.length})</SectionHeader>
            {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
                <div className="space-y-3">
                    {assignments.map(a => (
                        <div key={a._id} className={`bg-[#10101e] border border-[#1e1e30] rounded-xl p-4 ${deleting === a._id ? 'opacity-40' : ''}`}>
                            <div className="flex items-start gap-4">
                                {a.referenceScreenshotUrl && (
                                    <img src={a.referenceScreenshotUrl} alt={a.title} className="w-20 h-14 object-cover rounded-lg border border-[#1e1e30] shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <h3 className="text-sm font-bold text-white">{a.title}</h3>
                                        <Badge color={a.isActive ? 'green' : 'gray'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                                    </div>
                                    {a.description && <p className="text-xs text-[#666] mb-2 line-clamp-1">{a.description}</p>}
                                    <div className="flex gap-4 text-xs text-[#555]">
                                        <span>{a.stats?.count ?? 0} students</span>
                                        <span>{a.stats?.completed ?? 0} completed</span>
                                        <span>avg {Math.round(a.stats?.avgScore ?? 0)}/100</span>
                                        <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {(a.allowedLibraryPolicyIds?.length > 0) && (
                                        <p className="text-[10px] text-[#a371f7] mt-1">{a.allowedLibraryPolicyIds.length} librar{a.allowedLibraryPolicyIds.length === 1 ? 'y' : 'ies'} linked</p>
                                    )}
                                    {regenMsg[a._id] && (
                                        <p className={`text-[10px] mt-1 ${regenMsg[a._id].startsWith('✓') ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>{regenMsg[a._id]}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => setLibraryModal({ assignmentId: a._id, policyIds: a.allowedLibraryPolicyIds || [] })}
                                        title="Manage library policies"
                                        className="p-1.5 rounded-lg text-[#555] hover:text-[#a371f7] hover:bg-[#a371f7]/10 transition-colors">
                                        <FiPackage size={15} />
                                    </button>
                                    <button onClick={() => handleRegenerate(a._id)} disabled={regenerating === a._id}
                                        title="Regenerate reference screenshot (use after linking library policies)"
                                        className="p-1.5 rounded-lg text-[#555] hover:text-[#f0a500] hover:bg-[#f0a500]/10 transition-colors disabled:opacity-40">
                                        {regenerating === a._id ? <Spinner /> : <FiRefreshCw size={14} />}
                                    </button>
                                    <button onClick={() => handleToggle(a._id)} disabled={toggling === a._id}
                                        className="p-1.5 rounded-lg text-[#555] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-colors" title="Toggle active">
                                        {a.isActive ? <FiToggleRight size={18} className="text-[#3fb950]" /> : <FiToggleLeft size={18} />}
                                    </button>
                                    <button onClick={() => handleDelete(a._id, a.title)} disabled={deleting === a._id}
                                        className="p-1.5 rounded-lg text-[#555] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors">
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {assignments.length === 0 && <p className="text-[#555] text-center py-10">No assignments found.</p>}
                </div>
            )}

            {libraryModal && (
                <AssignmentLibraryManager
                    assignmentId={libraryModal.assignmentId}
                    currentPolicyIds={libraryModal.policyIds}
                    allPolicies={allPolicies}
                    onClose={() => setLibraryModal(null)}
                    onSave={(policyIds) => setAssignments(prev =>
                        prev.map(a => a._id === libraryModal.assignmentId ? { ...a, allowedLibraryPolicyIds: policyIds } : a)
                    )}
                />
            )}
        </div>
    );
}

// ── Admin shared table helpers ────────────────────────────────────────────────

function ASortTh({ col, sortBy, sortDir, onSort, children, className = '' }) {
    const active = sortBy === col;
    return (
        <th className={`px-4 py-3 text-left ${className}`}>
            <button onClick={() => onSort(col)} className="flex items-center gap-1 group text-[#555] hover:text-[#888] transition-colors text-xs font-semibold">
                {children}
                <span className={`text-[9px] transition-opacity ${active ? 'opacity-100 text-[#ff4444]' : 'opacity-0 group-hover:opacity-50'}`}>
                    {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
                </span>
            </button>
        </th>
    );
}

function APagination({ page, totalPages, total, pageSize, onPage }) {
    const start = Math.min((page - 1) * pageSize + 1, total);
    const end = Math.min(page * pageSize, total);
    return (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e1e30]">
            <p className="text-xs text-[#555]">{start}–{end} of {total} records</p>
            <div className="flex items-center gap-1">
                <button onClick={() => onPage(1)} disabled={page === 1} className="p-1.5 rounded text-xs text-[#555] hover:text-white hover:bg-[#1a1a28] disabled:opacity-30 transition-colors">«</button>
                <button onClick={() => onPage(page - 1)} disabled={page === 1} className="p-1.5 rounded text-xs text-[#555] hover:text-white hover:bg-[#1a1a28] disabled:opacity-30 transition-colors">‹</button>
                <span className="px-3 py-1 text-xs text-white font-medium bg-[#0d0d1a] rounded border border-[#1e1e30]">{page} / {totalPages}</span>
                <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="p-1.5 rounded text-xs text-[#555] hover:text-white hover:bg-[#1a1a28] disabled:opacity-30 transition-colors">›</button>
                <button onClick={() => onPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded text-xs text-[#555] hover:text-white hover:bg-[#1a1a28] disabled:opacity-30 transition-colors">»</button>
            </div>
        </div>
    );
}

function AStatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-[#10101e] border border-[#1e1e30] rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
            </div>
            <div>
                <p className="text-lg font-black" style={{ color }}>{value}</p>
                <p className="text-[10px] text-[#555] mt-0.5">{label}</p>
            </div>
        </div>
    );
}

// ── Submissions View ──────────────────────────────────────────────────────────

function SubmissionsView() {
    const [submissions, setSubmissions] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [replaying, setReplaying] = useState(null);
    const [replayMsg, setReplayMsg] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('score');
    const [sortDir, setSortDir] = useState('desc');

    const fetchSubmissions = useCallback(() => {
        setLoading(true);
        Promise.all([adminFetch('/admin/submissions?limit=500'), adminFetch('/admin/assignments')])
            .then(([d, asgns]) => {
                setSubmissions(d.submissions);
                setAssignments(asgns);
                if (asgns.length > 0) setSelectedId(prev => prev || asgns[0]._id);
            })
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

    const viewDetail = async (submissionId) => {
        setLoadingDetail(true); setDetail(null);
        try { const d = await adminFetch(`/admin/submissions/${submissionId}`); setDetail(d); }
        finally { setLoadingDetail(false); }
    };

    const handleReplay = async (submissionId) => {
        setReplaying(submissionId); setReplayMsg('');
        try { const d = await adminFetch(`/admin/submissions/${submissionId}/replay`, { method: 'POST' }); setReplayMsg(d.message); }
        catch (e) { setReplayMsg(e.message); }
        finally { setReplaying(null); }
    };

    const byAssignment = useMemo(() => {
        const map = {};
        for (const s of submissions) {
            if (!map[s.assignmentId]) map[s.assignmentId] = [];
            map[s.assignmentId].push(s);
        }
        return map;
    }, [submissions]);

    const assignmentStats = useMemo(() => assignments.map(a => {
        const subs = byAssignment[a._id] || [];
        const completed = subs.filter(s => s.completed).length;
        const scored = subs.filter(s => s.bestScore != null);
        const avg = scored.length ? Math.round(scored.reduce((s, r) => s + r.bestScore, 0) / scored.length) : 0;
        return { ...a, total: subs.length, completed, avg };
    }), [assignments, byAssignment]);

    const selectedSubs = useMemo(() => {
        const subs = byAssignment[selectedId] || [];
        let res = search
            ? subs.filter(s => {
                const q = search.toLowerCase();
                return (s.studentName || '').toLowerCase().includes(q) || (s.studentEmail || '').toLowerCase().includes(q);
            })
            : [...subs];
        return res.sort((a, b) => {
            if (sortBy === 'name') return sortDir === 'asc' ? (a.studentName || '').localeCompare(b.studentName || '') : (b.studentName || '').localeCompare(a.studentName || '');
            if (sortBy === 'score') return sortDir === 'asc' ? (a.bestScore ?? -1) - (b.bestScore ?? -1) : (b.bestScore ?? -1) - (a.bestScore ?? -1);
            if (sortBy === 'attempts') return sortDir === 'asc' ? (a.attempts ?? 0) - (b.attempts ?? 0) : (b.attempts ?? 0) - (a.attempts ?? 0);
            if (sortBy === 'date') return sortDir === 'asc' ? new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0) : new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
            return 0;
        });
    }, [byAssignment, selectedId, search, sortBy, sortDir]);

    const handleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const selStats = assignmentStats.find(a => a._id === selectedId);

    // ── Detail view ────────────────────────────────────────────────────────────
    if (detail || loadingDetail) {
        return (
            <div>
                <button onClick={() => { setDetail(null); setReplayMsg(''); }} className="text-[#ff4444] text-sm hover:underline mb-5 flex items-center gap-1">
                    ← Back to submissions
                </button>
                {loadingDetail ? <div className="flex justify-center py-20"><Spinner /></div> : (
                    <div>
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-white">{detail.student?.name || 'Unknown'} — Submission</h3>
                                <p className="text-xs text-[#666]">{detail.student?.email} · ID: {detail.submission.submissionId}</p>
                            </div>
                            <button onClick={() => handleReplay(detail.submission.submissionId)} disabled={replaying === detail.submission.submissionId}
                                className="flex items-center gap-2 px-4 py-2 bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] text-xs font-semibold rounded-lg hover:bg-[#ff4444]/20 transition-colors disabled:opacity-50">
                                <FiPlay size={12} /> {replaying === detail.submission.submissionId ? 'Replaying…' : 'Replay Evaluation'}
                            </button>
                        </div>
                        {replayMsg && <div className="mb-4 px-3 py-2 bg-[#3fb950]/10 border border-[#3fb950]/20 rounded-lg text-[#3fb950] text-xs">{replayMsg}</div>}
                        <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-220px)] border border-[#1e1e30] rounded-xl overflow-hidden">
                            <section className="flex flex-col md:w-[48%] border-b md:border-b-0 md:border-r border-[#1e1e30]">
                                <div className="px-4 py-2.5 bg-[#10101e] border-b border-[#1e1e30] text-xs text-white font-semibold shrink-0">Submitted Code</div>
                                <CodeEditor files={detail.submission.files} readOnly={true} />
                            </section>
                            <section className="flex-1 overflow-y-auto p-4 bg-[#0d0d1a]">
                                {detail.evalRun ? (
                                    <>
                                        <ResultsPanel status="done" result={detail.evalRun} />
                                        {detail.evalRun?.breakdown?.timing && (
                                            <div className="mt-4 rounded-xl border border-[#1e1e30] overflow-hidden">
                                                <div className="px-4 py-2 border-b border-[#1e1e30] text-[10px] text-[#555] font-semibold uppercase tracking-wider">Evaluation Timing</div>
                                                <table className="w-full text-xs">
                                                    <tbody>
                                                        {['linter','lighthouse','functionality','interaction','visual'].map(k => (
                                                            <tr key={k} className="border-b border-[#0d0d1a]">
                                                                <td className="px-4 py-2 text-[#666] capitalize">{k}</td>
                                                                <td className="px-4 py-2 text-right font-mono text-[#888]">{detail.evalRun.breakdown.timing[k] != null ? `${detail.evalRun.breakdown.timing[k]} ms` : '—'}</td>
                                                            </tr>
                                                        ))}
                                                        <tr className="border-t border-[#1e1e30]">
                                                            <td className="px-4 py-2 text-white font-bold">Total</td>
                                                            <td className="px-4 py-2 text-right font-mono font-bold text-white">{detail.evalRun.breakdown.timing.total != null ? `${detail.evalRun.breakdown.timing.total} ms` : '—'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-center py-16 text-[#555]">
                                        <FiClock size={32} className="mx-auto mb-3 text-[#333]" />
                                        <p className="text-sm">No evaluation result yet.</p>
                                        <p className="text-xs mt-1">Use &quot;Replay Evaluation&quot; to run it.</p>
                                    </div>
                                )}
                            </section>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ── List view ──────────────────────────────────────────────────────────────
    if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-white">All Submissions</h2>
                    <p className="text-xs text-[#555] mt-0.5">Select an assignment to view its submissions</p>
                </div>
                <button onClick={fetchSubmissions} disabled={loading}
                    className="flex items-center gap-1.5 text-xs text-[#666] hover:text-[#888] border border-[#1e1e30] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40">
                    <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {assignments.length === 0 ? (
                <p className="text-[#555] text-sm text-center py-20">No assignments found.</p>
            ) : (
                <div className="flex gap-5">
                    {/* Assignment list */}
                    <div className="w-52 shrink-0 flex flex-col gap-1.5 overflow-y-auto max-h-[70vh]">
                        {assignmentStats.map(a => (
                            <button key={a._id} onClick={() => { setSelectedId(a._id); setSearch(''); }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-start justify-between gap-2 ${selectedId === a._id
                                    ? 'bg-[#ff4444]/10 border-[#ff4444]/50 text-[#ff4444]'
                                    : 'bg-[#10101e] border-[#1e1e30] text-[#666] hover:border-[#2a2a3a] hover:text-[#999]'}`}>
                                <p className="text-xs font-medium truncate flex-1">{a.title}</p>
                                {a.completed > 0 && (
                                    <span className={`shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedId === a._id ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#0d0d1a] text-[#555]'}`}>
                                        {a.completed} <MdCheckCircle size={9} />
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Selected assignment content */}
                    <div className="flex-1 min-w-0">
                        {selStats && (
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <AStatCard icon={FiUsers}       label="Students"  value={selStats.total}                          color="#4e9af1" />
                                <AStatCard icon={FiCheckCircle} label="Completed" value={`${selStats.completed} / ${selStats.total}`} color="#3fb950" />
                                <AStatCard icon={FiActivity}    label="Avg Score" value={`${selStats.avg}/100`}                   color={selStats.avg >= 50 ? '#3fb950' : '#f85149'} />
                            </div>
                        )}

                        <div className="relative mb-3">
                            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or email…"
                                className="w-full pl-8 pr-3 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#ff4444]/50 transition-colors" />
                        </div>

                        <div className="bg-[#10101e] border border-[#1e1e30] rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[540px]">
                                    <thead className="bg-[#080812]/60">
                                        <tr className="border-b border-[#1e1e30] text-xs">
                                            <ASortTh col="name"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Student</ASortTh>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#555]">Status</th>
                                            <ASortTh col="score"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Score</ASortTh>
                                            <ASortTh col="attempts" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Attempts</ASortTh>
                                            <ASortTh col="date"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Submitted</ASortTh>
                                            <th className="px-4 py-3 w-20 text-xs font-semibold text-[#555]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedSubs.map(s => (
                                            <tr key={s.submissionId} className="border-b border-[#0d0d1a] hover:bg-[#0d0d1a] transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-white">{s.studentName}</p>
                                                    <p className="text-[10px] text-[#555]">{s.studentEmail}</p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {s.completed
                                                        ? <Badge color="green"><MdCheckCircle size={10} /> Done</Badge>
                                                        : <Badge color="gray">In progress</Badge>}
                                                </td>
                                                <td className="px-4 py-3">{s.bestScore != null ? <ScoreBar score={s.bestScore} /> : <span className="text-[#444] text-xs">—</span>}</td>
                                                <td className="px-4 py-3 text-[#888] text-sm font-medium tabular-nums">{s.attempts ?? 1}</td>
                                                <td className="px-4 py-3 text-[#666] text-xs whitespace-nowrap">
                                                    {s.submittedAt ? new Date(s.submittedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        <button onClick={() => viewDetail(s.submissionId)} className="p-1.5 rounded text-[#555] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-colors" title="View detail"><FiEye size={13} /></button>
                                                        <button onClick={() => handleReplay(s.submissionId)} disabled={replaying === s.submissionId}
                                                            className="p-1.5 rounded text-[#555] hover:text-[#ff4444] hover:bg-[#ff4444]/10 transition-colors disabled:opacity-40" title="Replay evaluation">
                                                            {replaying === s.submissionId ? <Spinner /> : <FiPlay size={13} />}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedSubs.length === 0 && (
                                            <tr><td colSpan={6} className="text-center py-16 text-[#555] text-sm">
                                                {search ? 'No students match your search.' : 'No submissions for this assignment yet.'}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ProgressView() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('score');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => {
        Promise.all([adminFetch('/admin/progress'), adminFetch('/admin/assignments')])
            .then(([recs, asgns]) => {
                setRecords(recs);
                setAssignments(asgns);
                if (asgns.length > 0) setSelectedId(asgns[0]._id);
            }).finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this progress record? The student will lose their best score for this assignment.')) return;
        setDeleting(id);
        try {
            await adminFetch(`/admin/progress/${id}`, { method: 'DELETE' });
            setRecords(prev => prev.filter(r => r._id !== id));
        } catch (e) { alert(e.message); }
        finally { setDeleting(null); }
    };

    const byAssignment = useMemo(() => {
        const map = {};
        for (const r of records) {
            if (!map[r.assignmentId]) map[r.assignmentId] = [];
            map[r.assignmentId].push(r);
        }
        return map;
    }, [records]);

    const assignmentStats = useMemo(() => assignments.map(a => {
        const recs = byAssignment[a._id] || [];
        const completed = recs.filter(r => r.completed).length;
        const avg = recs.length ? Math.round(recs.reduce((s, r) => s + r.bestScore, 0) / recs.length) : 0;
        return { ...a, total: recs.length, completed, avg };
    }), [assignments, byAssignment]);

    const selectedRecords = useMemo(() => {
        const recs = byAssignment[selectedId] || [];
        let res = search
            ? recs.filter(r => {
                const q = search.toLowerCase();
                return (r.studentName || '').toLowerCase().includes(q) || (r.studentEmail || '').toLowerCase().includes(q);
            })
            : [...recs];
        return res.sort((a, b) => {
            if (sortBy === 'name') return sortDir === 'asc' ? (a.studentName || '').localeCompare(b.studentName || '') : (b.studentName || '').localeCompare(a.studentName || '');
            if (sortBy === 'score') return sortDir === 'asc' ? a.bestScore - b.bestScore : b.bestScore - a.bestScore;
            if (sortBy === 'attempts') return sortDir === 'asc' ? a.attempts - b.attempts : b.attempts - a.attempts;
            return 0;
        });
    }, [byAssignment, selectedId, search, sortBy, sortDir]);

    const handleSort = (col) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('desc'); }
    };

    const selStats = assignmentStats.find(a => a._id === selectedId);

    if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-lg font-bold text-white">Progress Records</h2>
                <p className="text-xs text-[#555] mt-0.5">Select an assignment to view student progress</p>
            </div>

            {assignments.length === 0 ? (
                <p className="text-[#555] text-sm text-center py-20">No assignments found.</p>
            ) : (
                <div className="flex gap-5">
                    {/* Assignment list */}
                    <div className="w-52 shrink-0 flex flex-col gap-1.5 overflow-y-auto max-h-[70vh]">
                        {assignmentStats.map(a => (
                            <button key={a._id} onClick={() => { setSelectedId(a._id); setSearch(''); }}
                                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-start justify-between gap-2 ${selectedId === a._id
                                    ? 'bg-[#ff4444]/10 border-[#ff4444]/50 text-[#ff4444]'
                                    : 'bg-[#10101e] border-[#1e1e30] text-[#666] hover:border-[#2a2a3a] hover:text-[#999]'}`}>
                                <p className="text-xs font-medium truncate flex-1">{a.title}</p>
                                {a.completed > 0 && (
                                    <span className={`shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedId === a._id ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#0d0d1a] text-[#555]'}`}>
                                        {a.completed} <MdCheckCircle size={9} />
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Selected assignment content */}
                    <div className="flex-1 min-w-0">
                        {selStats && (
                            <div className="grid grid-cols-3 gap-3 mb-4">
                                <AStatCard icon={FiUsers}       label="Students"  value={selStats.total}                          color="#4e9af1" />
                                <AStatCard icon={FiCheckCircle} label="Completed" value={`${selStats.completed} / ${selStats.total}`} color="#3fb950" />
                                <AStatCard icon={FiActivity}    label="Avg Score" value={`${selStats.avg}/100`}                   color={selStats.avg >= 50 ? '#3fb950' : '#f85149'} />
                            </div>
                        )}

                        <div className="relative mb-3">
                            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student or email…"
                                className="w-full pl-8 pr-3 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#ff4444]/50 transition-colors" />
                        </div>

                        <div className="bg-[#10101e] border border-[#1e1e30] rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[480px]">
                                    <thead className="bg-[#080812]/60">
                                        <tr className="border-b border-[#1e1e30] text-xs">
                                            <ASortTh col="name"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Student</ASortTh>
                                            <ASortTh col="score"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Best Score</ASortTh>
                                            <ASortTh col="attempts" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Attempts</ASortTh>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#555]">Status</th>
                                            <th className="px-4 py-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedRecords.map(r => (
                                            <tr key={r._id} className={`border-b border-[#0d0d1a] hover:bg-[#0d0d1a] transition-colors ${deleting === r._id ? 'opacity-40' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <p className="font-semibold text-white">{r.studentName}</p>
                                                    <p className="text-[10px] text-[#555]">{r.studentEmail}</p>
                                                </td>
                                                <td className="px-4 py-3"><ScoreBar score={r.bestScore} /></td>
                                                <td className="px-4 py-3 text-[#888] text-sm font-medium tabular-nums">{r.attempts}</td>
                                                <td className="px-4 py-3">
                                                    {r.completed
                                                        ? <Badge color="green"><MdCheckCircle size={10} /> Done</Badge>
                                                        : <Badge color="gray">In progress</Badge>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => handleDelete(r._id)} disabled={deleting === r._id}
                                                        className="p-1.5 rounded text-[#444] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors">
                                                        <FiTrash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedRecords.length === 0 && (
                                            <tr><td colSpan={5} className="text-center py-16 text-[#555] text-sm">
                                                {search ? 'No students match your search.' : 'No progress records for this assignment yet.'}
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Library Policies ──────────────────────────────────────────────────────────

function LibraryPoliciesView() {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({ name: '', version: '', cdnUrls: '' });
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', version: '', cdnUrls: '' });
    const [editSaving, setEditSaving] = useState(false);
    const [editError, setEditError] = useState('');

    const load = () => {
        setLoading(true);
        adminFetch('/admin/library-policies').then(setPolicies).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim() || !form.version.trim()) { setError('Name and version are required.'); return; }
        setSaving(true);
        try {
            const urls = form.cdnUrls.split('\n').map(u => u.trim()).filter(Boolean);
            const policy = await adminFetch('/admin/library-policies', {
                method: 'POST',
                body: JSON.stringify({ name: form.name.trim(), version: form.version.trim(), cdnUrls: urls })
            });
            setPolicies(prev => [...prev, policy].sort((a, b) => a.name.localeCompare(b.name)));
            setForm({ name: '', version: '', cdnUrls: '' });
            setShowForm(false);
        } catch (e) { setError(e.message); }
        finally { setSaving(false); }
    };

    const handleToggle = async (id, currentEnabled) => {
        setTogglingId(id);
        try {
            const updated = await adminFetch(`/admin/library-policies/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ enabled: !currentEnabled })
            });
            setPolicies(prev => prev.map(p => p._id === id ? updated : p));
        } catch (e) { alert(e.message); }
        finally { setTogglingId(null); }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Remove library "${name}" from the system? Assignments using it will lose this policy.`)) return;
        setDeletingId(id);
        try {
            await adminFetch(`/admin/library-policies/${id}`, { method: 'DELETE' });
            setPolicies(prev => prev.filter(p => p._id !== id));
        } catch (e) { alert(e.message); }
        finally { setDeletingId(null); }
    };

    const startEdit = (p) => {
        setEditingId(p._id);
        setEditForm({ name: p.name, version: p.version, cdnUrls: (p.cdnUrls || []).join('\n') });
        setEditError('');
    };

    const handleEditSave = async (id) => {
        if (!editForm.name.trim() || !editForm.version.trim()) { setEditError('Name and version are required.'); return; }
        setEditSaving(true);
        try {
            const urls = editForm.cdnUrls.split('\n').map(u => u.trim()).filter(Boolean);
            const updated = await adminFetch(`/admin/library-policies/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: editForm.name.trim(), version: editForm.version.trim(), cdnUrls: urls })
            });
            setPolicies(prev => prev.map(p => p._id === id ? updated : p));
            setEditingId(null);
        } catch (e) { setEditError(e.message); }
        finally { setEditSaving(false); }
    };

    return (
        <div>
            <SectionHeader action={
                <button onClick={() => setShowForm(s => !s)}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#4e9af1]/10 border border-[#4e9af1]/30 text-[#4e9af1] hover:bg-[#4e9af1]/20 transition-colors">
                    <FiPlus size={12} /> Add Library
                </button>
            }>
                Library Policies ({policies.length})
            </SectionHeader>

            <p className="text-xs text-[#555] mb-5">
                Define which CDN libraries students may load, pinned to exact versions.
                URL-prefix matching ensures Bootstrap 5.3.0 is allowed but 5.2 is blocked.
            </p>

            {/* Add form */}
            {showForm && (
                <form onSubmit={handleAdd} className="bg-[#10101e] border border-[#4e9af1]/30 rounded-xl p-5 mb-5 space-y-3">
                    <p className="text-sm font-bold text-white mb-1">New Library Policy</p>
                    {error && <p className="text-xs text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/20 rounded-lg px-3 py-2">{error}</p>}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-[#666] block mb-1">Library Name</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="Bootstrap"
                                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#4e9af1]/50" />
                        </div>
                        <div>
                            <label className="text-xs text-[#666] block mb-1">Fixed Version</label>
                            <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                                placeholder="5.3.0"
                                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-sm text-white placeholder-[#444] focus:outline-none focus:border-[#4e9af1]/50" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-[#666] block mb-1">Allowed CDN URL Prefixes <span className="text-[#444]">(one per line)</span></label>
                        <textarea value={form.cdnUrls} onChange={e => setForm(f => ({ ...f, cdnUrls: e.target.value }))}
                            rows={4} placeholder={"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/\nhttps://stackpath.bootstrapcdn.com/bootstrap/5.3.0/"}
                            className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-xs font-mono text-white placeholder-[#333] focus:outline-none focus:border-[#4e9af1]/50 resize-none" />
                        <p className="text-[10px] text-[#444] mt-1">Any CDN URL that starts with one of these prefixes is allowed. Wrong versions are blocked automatically.</p>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button type="submit" disabled={saving}
                            className="px-4 py-2 text-xs font-bold bg-[#4e9af1] text-white rounded-lg hover:bg-[#3a85e0] transition-colors disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save Policy'}
                        </button>
                        <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                            className="px-4 py-2 text-xs font-semibold text-[#666] border border-[#1e1e30] rounded-lg hover:border-[#333] transition-colors">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {loading ? <div className="flex justify-center py-20"><Spinner /></div> : (
                <div className="space-y-3">
                    {policies.map(p => (
                        <div key={p._id} className={`bg-[#10101e] border rounded-xl p-4 transition-colors ${deletingId === p._id ? 'opacity-40' : 'border-[#1e1e30]'}`}>
                            {editingId === p._id ? (
                                <div className="space-y-3">
                                    {editError && <p className="text-xs text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/20 rounded-lg px-3 py-2">{editError}</p>}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-[#666] block mb-1">Library Name</label>
                                            <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-sm text-white focus:outline-none focus:border-[#4e9af1]/50" />
                                        </div>
                                        <div>
                                            <label className="text-xs text-[#666] block mb-1">Fixed Version</label>
                                            <input value={editForm.version} onChange={e => setEditForm(f => ({ ...f, version: e.target.value }))}
                                                className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-sm text-white focus:outline-none focus:border-[#4e9af1]/50" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-[#666] block mb-1">Allowed CDN URL Prefixes <span className="text-[#444]">(one per line)</span></label>
                                        <textarea value={editForm.cdnUrls} onChange={e => setEditForm(f => ({ ...f, cdnUrls: e.target.value }))}
                                            rows={4}
                                            className="w-full px-3 py-2 bg-[#0d0d1a] border border-[#1e1e30] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[#4e9af1]/50 resize-none" />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleEditSave(p._id)} disabled={editSaving}
                                            className="px-4 py-2 text-xs font-bold bg-[#4e9af1] text-white rounded-lg hover:bg-[#3a85e0] transition-colors disabled:opacity-50">
                                            {editSaving ? 'Saving…' : 'Save'}
                                        </button>
                                        <button onClick={() => { setEditingId(null); setEditError(''); }}
                                            className="px-4 py-2 text-xs font-semibold text-[#666] border border-[#1e1e30] rounded-lg hover:border-[#333] transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-[#4e9af1]/10 shrink-0">
                                        <FiPackage size={16} className="text-[#4e9af1]" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <span className="text-sm font-bold text-white">{p.name}</span>
                                            <Badge color="blue">v{p.version}</Badge>
                                            <Badge color={p.enabled ? 'green' : 'gray'}>{p.enabled ? 'Enabled' : 'Disabled'}</Badge>
                                        </div>
                                        {p.cdnUrls?.length > 0 ? (
                                            <div className="space-y-0.5">
                                                {p.cdnUrls.map((url, i) => (
                                                    <p key={i} className="flex items-center gap-1 text-[10px] font-mono text-[#555] truncate">
                                                        <FiLink size={9} className="shrink-0 text-[#444]" />
                                                        {url}
                                                    </p>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-[#f0a500]">No CDN URL prefixes defined — add URLs to enforce version.</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={() => startEdit(p)} title="Edit"
                                            className="p-1.5 rounded-lg text-[#555] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-colors">
                                            <FiEdit2 size={14} />
                                        </button>
                                        <button onClick={() => handleToggle(p._id, p.enabled)} disabled={togglingId === p._id}
                                            title={p.enabled ? 'Disable' : 'Enable'}
                                            className="p-1.5 rounded-lg text-[#555] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-colors">
                                            {p.enabled ? <FiToggleRight size={18} className="text-[#3fb950]" /> : <FiToggleLeft size={18} />}
                                        </button>
                                        <button onClick={() => handleDelete(p._id, p.name)} disabled={deletingId === p._id}
                                            className="p-1.5 rounded-lg text-[#555] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors">
                                            <FiTrash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                    {policies.length === 0 && (
                        <div className="text-center py-16 text-[#555]">
                            <FiPackage size={32} className="mx-auto mb-3 text-[#333]" />
                            <p className="text-sm">No library policies yet.</p>
                            <p className="text-xs mt-1">Click &quot;Add Library&quot; to define the first approved CDN library.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Assignment Library Policy Binding ─────────────────────────────────────────

function AssignmentLibraryManager({ assignmentId, currentPolicyIds, allPolicies, onClose, onSave }) {
    const [selected, setSelected] = useState(new Set(currentPolicyIds || []));
    const [saving, setSaving] = useState(false);

    const toggle = (id) => setSelected(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });

    const handleSave = async () => {
        setSaving(true);
        try {
            await adminFetch(`/admin/assignments/${assignmentId}/library-policies`, {
                method: 'PATCH',
                body: JSON.stringify({ policyIds: Array.from(selected) })
            });
            onSave(Array.from(selected));
            onClose();
        } catch (e) { alert(e.message); }
        finally { setSaving(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#10101e] border border-[#1e1e30] rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">Assign Library Policies</h3>
                    <button onClick={onClose} className="p-1 text-[#555] hover:text-white transition-colors"><FiX size={16} /></button>
                </div>
                <p className="text-xs text-[#555] mb-4">Only enabled, version-pinned libraries will be allowed in this assignment's sandbox.</p>
                <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
                    {allPolicies.filter(p => p.enabled).map(p => (
                        <label key={p._id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected.has(p._id) ? 'border-[#4e9af1]/50 bg-[#4e9af1]/10' : 'border-[#1e1e30] hover:border-[#2a2a3a]'}`}>
                            <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggle(p._id)} className="accent-[#4e9af1]" />
                            <div>
                                <span className="text-sm font-semibold text-white">{p.name}</span>
                                <Badge color="blue" className="ml-2">v{p.version}</Badge>
                            </div>
                        </label>
                    ))}
                    {allPolicies.filter(p => p.enabled).length === 0 && (
                        <p className="text-xs text-[#555] text-center py-6">No enabled library policies. Add some in the Libraries tab first.</p>
                    )}
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={saving}
                        className="flex-1 py-2 text-xs font-bold bg-[#4e9af1] text-white rounded-lg hover:bg-[#3a85e0] transition-colors disabled:opacity-50">
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={onClose}
                        className="flex-1 py-2 text-xs font-semibold text-[#666] border border-[#1e1e30] rounded-lg hover:border-[#333] transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

const NAV_ITEMS = [
    { id: 'overview', icon: FiBarChart2, label: 'Overview' },
    { id: 'assignments', icon: FiBookOpen, label: 'Assignments' },
    { id: 'libraries', icon: FiPackage, label: 'Libraries' },
    { id: 'users', icon: FiUsers, label: 'Users' },
    { id: 'submissions', icon: FiFileText, label: 'Submissions' },
    { id: 'progress', icon: FiActivity, label: 'Progress' },
];

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Verify admin auth on mount
    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) { navigate('/admin'); return; }
    }, [navigate]);

    const fetchStats = useCallback(() => {
        setStatsLoading(true);
        adminFetch('/admin/stats')
            .then(setStats)
            .catch(() => navigate('/admin'))
            .finally(() => setStatsLoading(false));
    }, [navigate]);

    useEffect(() => { fetchStats(); }, [fetchStats]);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/admin');
    };

    return (
        <div className="min-h-screen bg-[#080812] flex">
            {/* ── Sidebar ── */}
            <aside className="w-56 shrink-0 bg-[#0a0a16] border-r border-[#1e1e30] flex flex-col">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-[#1e1e30]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff4444]/30 to-[#ff6b35]/20 border border-[#ff4444]/30 flex items-center justify-center">
                            <FiShield size={14} className="text-[#ff4444]" />
                        </div>
                        <div>
                            <p className="text-white text-sm font-bold leading-tight">Admin Panel</p>
                            <p className="text-[#444] text-[10px]">Management Console</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-1">
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === item.id
                                    ? 'bg-[#ff4444]/10 text-[#ff4444] border border-[#ff4444]/20'
                                    : 'text-[#666] hover:text-[#bbb] hover:bg-[#1a1a28]'
                                }`}
                        >
                            <item.icon size={16} />
                            {item.label}
                            {activeTab === item.id && <FiChevronRight size={12} className="ml-auto" />}
                        </button>
                    ))}
                </nav>

                {/* Stats summary in sidebar */}
                {stats && (
                    <div className="px-4 py-4 border-t border-[#1e1e30] space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-[#555]">Assignments</span>
                            <span className="text-white font-bold">{stats.assignments}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-[#555]">Users</span>
                            <span className="text-white font-bold">{stats.users}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-[#555]">Submissions</span>
                            <span className="text-white font-bold">{stats.submissions}</span>
                        </div>
                    </div>
                )}

                {/* Logout */}
                <div className="px-3 pb-4">
                    <button onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#666] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-all">
                        <FiLogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className="flex-1 overflow-y-auto">
                {/* Top bar */}
                <header className="sticky top-0 z-10 bg-[#080812]/90 backdrop-blur border-b border-[#1e1e30] px-8 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-white font-bold capitalize">{activeTab}</h1>
                        <p className="text-xs text-[#555]">WebProjectEvaluation — Administration</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff4444]/10 border border-[#ff4444]/20 rounded-full text-[#ff4444] text-xs font-bold">
                            <FiShield size={11} />
                            Admin
                        </div>
                    </div>
                </header>

                <div className="px-8 py-8 max-w-5xl">
                    {activeTab === 'overview' &&
                        <OverviewView stats={stats} loading={statsLoading} onRefresh={fetchStats} />}
                    {activeTab === 'assignments' && <AssignmentsView />}
                    {activeTab === 'libraries' && <LibraryPoliciesView />}
                    {activeTab === 'users' && <UsersView />}
                    {activeTab === 'submissions' && <SubmissionsView />}
                    {activeTab === 'progress' && <ProgressView />}
                </div>
            </main>
        </div>
    );
}
