import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis,
    LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { getLeaderboard } from '../api/index.js';
import { FiRefreshCw, FiUsers, FiAward, FiTrendingUp, FiBarChart2, FiCheckCircle, FiSearch } from 'react-icons/fi';
import { MdCheckCircle } from 'react-icons/md';

// ── Colour palette ────────────────────────────────────────────────────────────
const BLUE = '#4e9af1';
const GREEN = '#3fb950';
const AMBER = '#f0a500';
const RED = '#f85149';
const PURPLE = '#a371f7';

const SCORE_COLORS = [RED, AMBER, '#e8c84a', BLUE, GREEN];

// ── Tiny KPI card ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = BLUE, icon: Icon }) {
    return (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={18} style={{ color }} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider font-semibold truncate">{label}</p>
                <p className="text-2xl font-black text-[var(--text-strong)] leading-tight">{value}</p>
                {sub && <p className="text-[10px] text-[var(--text-faintest)] truncate">{sub}</p>}
            </div>
        </div>
    );
}

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs shadow-xl">
            {label !== undefined && <p className="text-[var(--text-muted)] mb-1 font-medium">{label}</p>}
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color || p.fill || BLUE }}>
                    {p.name}: <span className="font-bold text-[var(--text-strong)]">{p.value}</span>
                </p>
            ))}
        </div>
    );
}

// ── Section wrapper ────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className = '' }) {
    return (
        <div className={`bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-5 ${className}`}>
            <p className="text-sm font-bold text-[var(--text-strong)] mb-0.5">{title}</p>
            {subtitle && <p className="text-[11px] text-[var(--text-faint)] mb-4">{subtitle}</p>}
            {!subtitle && <div className="mb-4" />}
            {children}
        </div>
    );
}

// ── Assignment Sidebar ─────────────────────────────────────────────────────────
function AssignmentSidebar({ data, activeIdx, onSelect }) {
    const [search, setSearch] = useState('');

    const filtered = data
        .map((a, i) => ({ ...a, originalIdx: i }))
        .filter(a => a.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <aside className="w-64 shrink-0 flex flex-col border border-[var(--border-color)] rounded-xl bg-[var(--bg-surface)] overflow-hidden">
            {/* Sidebar header */}
            <div className="px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface-alt)] shrink-0">
                <p className="text-[10px] font-bold text-[var(--text-faint)] uppercase tracking-widest mb-2">
                    Questions / Assignments
                </p>
                <div className="relative">
                    <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-faintest)]" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search…"
                        className="w-full pl-7 pr-3 py-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors"
                    />
                </div>
                <p className="text-[10px] text-[var(--text-faintest)] mt-1.5">
                    {filtered.length} of {data.length} shown
                </p>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-1.5 space-y-0.5 px-2 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 320px)', minHeight: '200px' }}>
                {filtered.length === 0 ? (
                    <p className="text-[10px] text-[var(--text-faintest)] text-center py-6">No matches</p>
                ) : filtered.map((a) => {
                    const isActive = activeIdx === a.originalIdx;
                    const completionPct = a.totalStudents > 0
                        ? Math.round((a.completedCount / a.totalStudents) * 100)
                        : 0;
                    return (
                        <button
                            key={a.assignmentId}
                            onClick={() => onSelect(a.originalIdx)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all group ${
                                isActive
                                    ? 'bg-[#2f80ed]/15 border-[#4e9af1]/60 text-[#4e9af1]'
                                    : 'bg-transparent border-transparent text-[var(--text-faint)] hover:bg-[var(--bg-surface-alt)] hover:border-[var(--border-color)] hover:text-[var(--text-muted)]'
                            }`}
                        >
                            {/* Index badge + title */}
                            <div className="flex items-start gap-2">
                                <span className={`shrink-0 text-[9px] font-bold mt-0.5 w-5 text-center ${isActive ? 'text-[#4e9af1]' : 'text-[var(--text-faintest)]'}`}>
                                    Q{a.originalIdx + 1}
                                </span>
                                <p className="text-xs font-medium leading-tight line-clamp-2 flex-1">{a.title}</p>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-2 mt-1.5 pl-7">
                                {a.completedCount > 0 && (
                                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                        isActive ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[var(--bg-base)] text-[var(--text-faintest)]'
                                    }`}>
                                        <MdCheckCircle size={8} /> {a.completedCount}
                                    </span>
                                )}
                                <span className={`text-[9px] ${isActive ? 'text-[#4e9af1]/70' : 'text-[var(--text-faintest)]'}`}>
                                    {a.totalStudents} students
                                </span>
                                {a.totalStudents > 0 && (
                                    <span className={`text-[9px] ml-auto font-bold ${
                                        a.avgScore >= 70 ? 'text-[#3fb950]' : a.avgScore >= 40 ? 'text-[#f0a500]' : 'text-[#f85149]'
                                    }`}>
                                        avg {a.avgScore}
                                    </span>
                                )}
                            </div>

                            {/* Tiny progress bar */}
                            {a.totalStudents > 0 && (
                                <div className="mt-1.5 pl-7">
                                    <div className="w-full bg-[var(--bg-base)] rounded-full h-1 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all"
                                            style={{
                                                width: `${completionPct}%`,
                                                background: isActive ? GREEN : '#333'
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Footer count */}
            <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-surface-alt)] shrink-0">
                <p className="text-[9px] text-[var(--text-faintest)] text-center">
                    {data.length} total assignment{data.length !== 1 ? 's' : ''}
                </p>
            </div>
        </aside>
    );
}

// ── Student table with pagination ─────────────────────────────────────────────
function StudentTable({ students, title }) {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const PAGE_SIZE = 20;

    const filtered = students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <ChartCard
            title={`All Students — ${title}`}
            subtitle="Complete breakdown with scores, attempts, and status"
        >
            {students.length === 0 ? (
                <p className="text-[var(--text-faintest)] text-sm text-center py-8">No submissions yet</p>
            ) : (
                <>
                    {/* Search + count */}
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                        <div className="relative flex-1 min-w-[160px] max-w-xs">
                            <FiSearch size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search by name or email…"
                                className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors"
                            />
                        </div>
                        <span className="text-xs text-[var(--text-faint)]">{filtered.length} of {students.length} students</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-[var(--border-color)]">
                                    {['Rank', 'Student', 'Best Score', 'Attempts', 'Status', 'Progress'].map(h => (
                                        <th key={h} className="text-left pb-2.5 pr-4 text-[var(--text-faint)] font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paged.map((s) => (
                                    <tr key={s.studentId} className="border-b border-[var(--bg-surface-alt)] hover:bg-[var(--bg-surface-alt)]/50 transition-colors">
                                        <td className="py-2.5 pr-4">
                                            <span className="font-bold" style={{
                                                color: s.rank === 1 ? '#f0c040' : s.rank === 2 ? '#b0b8c8' : s.rank === 3 ? '#cd7f32' : '#555'
                                            }}>#{s.rank}</span>
                                        </td>
                                        <td className="py-2.5 pr-4">
                                            <p className="text-[var(--text-strong)] font-medium">{s.name}</p>
                                            <p className="text-[var(--text-faintest)] text-[10px]">{s.email}</p>
                                        </td>
                                        <td className="py-2.5 pr-4">
                                            <span className={`font-bold text-sm ${s.bestScore >= 70 ? 'text-[#3fb950]' : s.bestScore >= 40 ? 'text-[#f0a500]' : 'text-[#f85149]'}`}>
                                                {s.bestScore}
                                            </span>
                                            <span className="text-[var(--text-faintest)]">/100</span>
                                        </td>
                                        <td className="py-2.5 pr-4 text-[var(--text-muted)]">{s.attempts}</td>
                                        <td className="py-2.5 pr-4">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                s.completed
                                                    ? 'bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/30'
                                                    : 'bg-[#f0a500]/10 text-[#f0a500] border border-[#f0a500]/30'
                                            }`}>
                                                {s.completed ? 'Completed' : 'In Progress'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-4 min-w-[80px]">
                                            <div className="w-20 bg-[var(--bg-base)] rounded-full h-1.5 overflow-hidden">
                                                <div className="h-full rounded-full" style={{
                                                    width: `${s.bestScore}%`,
                                                    background: s.completed ? GREEN : s.bestScore >= 40 ? AMBER : RED
                                                }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >← Prev</button>
                            <span className="text-xs text-[var(--text-faint)]">Page {page} of {totalPages} · {filtered.length} students</span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >Next →</button>
                        </div>
                    )}
                </>
            )}
        </ChartCard>
    );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function AnalyticsView({ onBack }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeIdx, setActiveIdx] = useState(0);

    const fetch = () => {
        setLoading(true);
        getLeaderboard()
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetch(); }, []);

    const assignment = data[activeIdx];

    // Global KPIs
    const allStudents = new Set(data.flatMap(a => a.students.map(s => s.studentId)));
    const totalSubmitted = data.reduce((n, a) => n + a.totalStudents, 0);
    const totalCompleted = data.reduce((n, a) => n + a.completedCount, 0);
    const globalAvg = data.length
        ? Math.round(data.reduce((s, a) => s + a.avgScore, 0) / data.length)
        : 0;

    // Score-band histogram
    const bands = ['0–20', '21–40', '41–60', '61–80', '81–100'];
    const scoreHist = bands.map((band, i) => {
        const lo = i * 20 + (i > 0 ? 1 : 0);
        const hi = (i + 1) * 20;
        return {
            band,
            count: (assignment?.students || []).filter(s => s.bestScore >= lo && s.bestScore <= hi).length,
        };
    });

    // Completion donut
    const completed = assignment?.completedCount ?? 0;
    const attempted = (assignment?.totalStudents ?? 0) - completed;
    const donutData = [
        { name: 'Completed', value: completed, fill: GREEN },
        { name: 'In Progress', value: attempted, fill: AMBER },
    ].filter(d => d.value > 0);

    // Scatter: attempts vs score
    const scatterData = (assignment?.students || []).map(s => ({
        attempts: s.attempts,
        score: s.bestScore,
        name: s.name,
    }));

    // Per-assignment avg score bar
    const avgBars = data.map(a => ({
        name: a.title.length > 18 ? a.title.slice(0, 18) + '…' : a.title,
        avg: a.avgScore,
    }));

    // Top performers
    const topStudents = [...(assignment?.students || [])]
        .sort((a, b) => b.bestScore - a.bestScore)
        .slice(0, 8)
        .map(s => ({ name: s.name.split(' ')[0], score: s.bestScore, completed: s.completed }));

    // Radar
    const radarData = data.map(a => ({
        assignment: a.title.length > 12 ? a.title.slice(0, 12) + '…' : a.title,
        avgScore: a.avgScore,
        completionPct: a.totalStudents > 0
            ? Math.round((a.completedCount / a.totalStudents) * 100)
            : 0,
    }));

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
        </div>
    );

    if (data.length === 0) return (
        <div className="text-center py-20 text-[var(--text-faint)]">
            <FiBarChart2 size={40} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">No data yet. Students need to submit first.</p>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={onBack} className="text-[#4e9af1] text-sm hover:underline">← Back</button>
                <h2 className="text-xl font-bold text-[var(--text-strong)] flex-1">Class Analytics</h2>
                <button type="button" onClick={fetch}
                    className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 transition-colors">
                    <FiRefreshCw size={12} /> Refresh
                </button>
            </div>

            {/* Global KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KpiCard label="Total Students" value={allStudents.size} sub="unique across all" color={BLUE} icon={FiUsers} />
                <KpiCard label="Submissions" value={totalSubmitted} sub="total attempts" color={PURPLE} icon={FiBarChart2} />
                <KpiCard label="Completions" value={totalCompleted} sub="passed ≥70 score" color={GREEN} icon={FiCheckCircle} />
                <KpiCard label="Avg Class Score" value={`${globalAvg}/100`} sub="across all questions" color={AMBER} icon={FiTrendingUp} />
            </div>

            {/* Main two-column layout: sidebar + charts */}
            <div className="flex gap-5 items-start">

                {/* ── Left: Assignment Sidebar ── */}
                <AssignmentSidebar data={data} activeIdx={activeIdx} onSelect={setActiveIdx} />

                {/* ── Right: Chart area ── */}
                <div className="flex-1 min-w-0 space-y-4">

                    {/* Selected assignment header chip */}
                    {assignment && (
                        <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-surface)] border border-[#2f80ed]/30 rounded-xl">
                            <span className="text-[10px] font-bold text-[#4e9af1]/60 uppercase tracking-widest shrink-0">Q{activeIdx + 1}</span>
                            <p className="text-sm font-bold text-[var(--text-strong)] flex-1 truncate">{assignment.title}</p>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="text-center">
                                    <p className="text-xs font-bold text-[var(--text-strong)]">{assignment.totalStudents}</p>
                                    <p className="text-[9px] text-[var(--text-faintest)]">students</p>
                                </div>
                                <div className="text-center">
                                    <p className={`text-xs font-bold ${assignment.avgScore >= 70 ? 'text-[#3fb950]' : assignment.avgScore >= 40 ? 'text-[#f0a500]' : 'text-[#f85149]'}`}>
                                        {assignment.avgScore}/100
                                    </p>
                                    <p className="text-[9px] text-[var(--text-faintest)]">avg score</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs font-bold text-[#3fb950]">{assignment.completedCount}</p>
                                    <p className="text-[9px] text-[var(--text-faintest)]">completed</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Score histogram + Completion donut */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <ChartCard className="lg:col-span-2"
                            title="Score Distribution"
                            subtitle="Students grouped by score band (20-point intervals)">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={scoreHist} barCategoryGap="30%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                                    <XAxis dataKey="band" tick={{ fill: '#555', fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fill: '#555', fontSize: 11 }} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
                                    <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                                        {scoreHist.map((_, i) => (
                                            <Cell key={i} fill={SCORE_COLORS[i]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Completion Status" subtitle="Completed vs in progress">
                            {donutData.length === 0 ? (
                                <div className="flex items-center justify-center h-[200px] text-[var(--text-faintest)] text-sm">No submissions yet</div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={160}>
                                        <PieChart>
                                            <Pie data={donutData} dataKey="value" cx="50%" cy="50%"
                                                innerRadius={46} outerRadius={68} paddingAngle={4}>
                                                {donutData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                            </Pie>
                                            <Tooltip content={<ChartTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-col gap-1.5 mt-1">
                                        {donutData.map(d => (
                                            <div key={d.name} className="flex items-center gap-2 text-xs">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                                                <span className="text-[var(--text-muted)]">{d.name}</span>
                                                <span className="ml-auto font-bold text-[var(--text-strong)]">{d.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </ChartCard>
                    </div>

                    {/* Avg score per question + Scatter */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <ChartCard title="Average Score — All Questions" subtitle="Difficulty overview across the question bank">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={avgBars} layout="vertical" barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" horizontal={false} />
                                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#555', fontSize: 11 }} />
                                    <YAxis type="category" dataKey="name" width={100} tick={{ fill: '#888', fontSize: 10 }} />
                                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#ffffff08' }} />
                                    <Bar dataKey="avg" name="Avg Score" fill={BLUE} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Attempts vs Score" subtitle="Do more attempts lead to higher scores?">
                            {scatterData.length === 0 ? (
                                <div className="flex items-center justify-center h-[200px] text-[var(--text-faintest)] text-sm">No data</div>
                            ) : (
                                <ResponsiveContainer width="100%" height={200}>
                                    <ScatterChart>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
                                        <XAxis dataKey="attempts" name="Attempts" type="number" allowDecimals={false}
                                            tick={{ fill: '#555', fontSize: 11 }}
                                            label={{ value: 'Attempts', fill: '#555', fontSize: 10, position: 'insideBottom', offset: -2 }} />
                                        <YAxis dataKey="score" name="Score" domain={[0, 100]}
                                            tick={{ fill: '#555', fontSize: 11 }}
                                            label={{ value: 'Score', fill: '#555', fontSize: 10, angle: -90, position: 'insideLeft' }} />
                                        <ZAxis range={[60, 60]} />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs shadow-xl">
                                                        <p className="text-[var(--text-strong)] font-bold mb-1">{d.name}</p>
                                                        <p className="text-[var(--text-muted)]">Attempts: <span className="text-[var(--text-strong)]">{d.attempts}</span></p>
                                                        <p className="text-[var(--text-muted)]">Score: <span className="text-[var(--text-strong)]">{d.score}/100</span></p>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Scatter data={scatterData} fill={PURPLE} fillOpacity={0.8} />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            )}
                        </ChartCard>
                    </div>

                    {/* Top performers */}
                    <ChartCard title="Top Performers" subtitle={`Highest scoring students in "${assignment?.title}"`}>
                        {topStudents.length === 0 ? (
                            <p className="text-[var(--text-faintest)] text-sm text-center py-8">No submissions yet</p>
                        ) : (
                            <div className="space-y-2">
                                {topStudents.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-[11px] font-bold w-4 text-right shrink-0" style={{
                                            color: i === 0 ? '#f0c040' : i === 1 ? '#b0b8c8' : i === 2 ? '#cd7f32' : '#555'
                                        }}>
                                            #{i + 1}
                                        </span>
                                        <span className="text-xs text-[var(--text-muted)] w-20 truncate shrink-0">{s.name}</span>
                                        <div className="flex-1 bg-[var(--bg-base)] rounded-full h-2 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${s.score}%`, background: s.completed ? GREEN : BLUE }}
                                            />
                                        </div>
                                        <span className={`text-xs font-bold w-10 text-right shrink-0 ${s.completed ? 'text-[#3fb950]' : 'text-[var(--text-strong)]'}`}>
                                            {s.score}
                                        </span>
                                        {s.completed && <FiCheckCircle size={12} className="text-[#3fb950] shrink-0" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ChartCard>

                    {/* Radar (multi-assignment overview) */}
                    {radarData.length >= 3 && (
                        <ChartCard title="Class Overview Radar"
                            subtitle="Average score and completion rate across all assignments">
                            <ResponsiveContainer width="100%" height={280}>
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#2a2a4a" />
                                    <PolarAngleAxis dataKey="assignment" tick={{ fill: '#555', fontSize: 11 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#444', fontSize: 10 }} />
                                    <Radar name="Avg Score" dataKey="avgScore" stroke={BLUE} fill={BLUE} fillOpacity={0.15} />
                                    <Radar name="Completion %" dataKey="completionPct" stroke={GREEN} fill={GREEN} fillOpacity={0.15} />
                                    <Legend wrapperStyle={{ fontSize: 11, color: '#888' }} />
                                    <Tooltip content={<ChartTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    )}

                    {/* Full student table with search + pagination */}
                    <StudentTable
                        students={assignment?.students || []}
                        title={assignment?.title || ''}
                    />
                </div>
            </div>
        </div>
    );
}
