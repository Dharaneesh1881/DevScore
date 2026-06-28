import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';
import { LiveRunner } from '../components/LiveRunner.jsx';
import { MultiFileUpload } from '../components/MultiFileUpload.jsx';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { AnalyticsView } from '../components/AnalyticsView.jsx';
import { getAssignments, createAssignment, getAssignmentSubmissions, updateAssignmentTests, deleteAssignment, getLeaderboard, getTeacherStudentSubmission, getTeacherLibraryPolicies, createTeacherLibraryPolicy, updateTeacherLibraryPolicy, deleteTeacherLibraryPolicy, getTeacherProgress, deleteTeacherProgress, getTeacherAllSubmissions, toggleAssignment, setAssignmentLibraryPolicies, regenerateAssignmentBaseline, getTeacherStudents, createTeacherStudent, deleteTeacherStudent, getGroups, createGroup, updateGroup, deleteGroup } from '../api/index.js';
import { FiAward, FiRefreshCw, FiBookOpen, FiPlus, FiLogOut, FiChevronRight, FiBarChart2, FiList, FiPieChart, FiSun, FiMoon, FiPackage, FiActivity, FiFileText, FiTrash2, FiSearch, FiToggleLeft, FiToggleRight, FiEdit2, FiLink, FiX, FiUsers, FiCheckCircle, FiClock, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { MdCheckCircle } from 'react-icons/md';
import {
  hasHtmlFile,
  removeProjectFile,
  updateProjectFileContent,
  createStarterProject
} from '../utils/projectFiles.js';

function AssignmentCard({ a, onViewSubmissions, onEditTests, onDelete, deletingId, onToggle, togglingId, onManageLibraries, onRegenerate, regeneratingId, regenMsg }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDeleting = deletingId === a._id;
  const isToggling = togglingId === a._id;
  const isRegenerating = regeneratingId === a._id;

  return (
    <div className={`bg-[var(--bg-surface-alt)] border rounded-xl overflow-hidden transition-all duration-200 ${isDeleting ? 'border-[#f85149]/50 opacity-60' : 'border-[var(--border-color)]'}`}>
      {a.referenceScreenshotUrl && (
        <div className="relative">
          <img src={a.referenceScreenshotUrl} alt={a.title} className="w-full h-32 object-cover object-top border-b border-[var(--border-color)]" />
          {!confirmDelete && !isDeleting && (
            <button onClick={() => setConfirmDelete(true)} title="Delete assignment"
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--bg-surface)]/80 text-[#f85149] hover:bg-[#f85149]/20 transition-colors backdrop-blur-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h3 className="font-semibold text-[var(--text-strong)] text-sm truncate">{a.title}</h3>
            <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${a.isActive ? 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/30' : 'bg-[var(--bg-surface)] text-[var(--text-faint)] border-[var(--border-color)]'}`}>
              {a.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {!a.referenceScreenshotUrl && !confirmDelete && !isDeleting && (
            <button onClick={() => setConfirmDelete(true)} title="Delete assignment"
              className="shrink-0 p-1 rounded-lg text-[var(--text-faint)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>

        {a.description && <p className="text-xs text-[var(--text-faint)] mb-2 line-clamp-2">{a.description}</p>}

        {/* Library count + regen message */}
        {(a.allowedLibraryPolicyIds?.length > 0) && (
          <p className="text-[10px] text-[#a371f7] mb-1">{a.allowedLibraryPolicyIds.length} librar{a.allowedLibraryPolicyIds.length === 1 ? 'y' : 'ies'} linked</p>
        )}
        {regenMsg && (
          <p className={`text-[10px] mb-1 ${regenMsg.startsWith('✓') ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>{regenMsg}</p>
        )}

        {/* Icon action row */}
        <div className="flex items-center gap-1 mb-3">
          <button onClick={() => onManageLibraries(a)} title="Manage library policies"
            className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[#a371f7] hover:bg-[#a371f7]/10 transition-colors">
            <FiPackage size={14} />
          </button>
          <button onClick={() => onRegenerate(a._id)} disabled={isRegenerating} title="Regenerate reference screenshot"
            className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[#f0a500] hover:bg-[#f0a500]/10 transition-colors disabled:opacity-40">
            <FiRefreshCw size={14} className={isRegenerating ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => onToggle(a._id)} disabled={isToggling} title="Toggle active"
            className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-colors disabled:opacity-40">
            {a.isActive ? <FiToggleRight size={18} className="text-[#3fb950]" /> : <FiToggleLeft size={18} />}
          </button>
        </div>

        {/* Confirm delete banner */}
        {confirmDelete ? (
          <div className="mt-3 p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg">
            <p className="text-xs text-[#f85149] font-semibold mb-1">Delete this assignment?</p>
            <p className="text-[10px] text-[var(--text-muted)] mb-3">All student submissions and evaluation data will be permanently removed.</p>
            <div className="flex gap-2">
              <button onClick={() => { onDelete(a._id); setConfirmDelete(false); }} disabled={isDeleting}
                className="flex-1 py-1.5 text-xs font-bold bg-[#f85149] text-[var(--text-strong)] rounded-lg hover:bg-[#e03131] transition-colors disabled:opacity-50">
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-lg hover:border-[var(--text-faintest)] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => onViewSubmissions(a)} disabled={isDeleting}
              className="flex-1 py-1.5 text-xs font-semibold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda] transition-colors disabled:opacity-40">
              View Submissions
            </button>
            <button onClick={() => onEditTests(a)} disabled={isDeleting}
              className="flex-1 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] text-[#4e9af1] border border-[#4e9af1]/40 rounded-lg hover:border-[#4e9af1] transition-colors disabled:opacity-40">
              Edit Tests
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const EDIT_TESTS_PLACEHOLDER = `{
  "functionalityTests": [
    {
      "id": "fn-1",
      "name": "Counter increases on Add Task",
      "marks": 10,
      "steps": [
        { "action": "read",  "selector": "#counter",   "saveAs": "before" },
        { "action": "type",  "selector": "#taskInput", "value": "Learn JS" },
        { "action": "click", "selector": "#increment" },
        { "action": "read",  "selector": "#counter",   "saveAs": "after" }
      ],
      "assert": { "type": "incrementedBy", "from": "before", "to": "after", "by": 1 },
      "failHint": "Clicking Add Task should increase #counter by 1."
    }
  ],
  "interactionTests": [
    {
      "name": "Add Task button is clickable",
      "weight": 5,
      "steps": [
        { "action": "type",  "selector": "#taskInput", "value": "Test" },
        { "action": "click", "selector": "#increment" }
      ],
      "assert": { "type": "countEquals", "selector": "#taskList li", "value": 1 }
    }
  ]
}`;

function EditTestsView({ assignment, onBack }) {
  const [json, setJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [saveError, setSaveError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!json.trim()) { setJsonError('Paste the JSON object before saving.'); return; }

    let parsed;
    try {
      parsed = JSON.parse(json.trim());
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON — check your syntax.');
      return;
    }

    const payload = {};
    if (Array.isArray(parsed.functionalityTests)) payload.functionalityTests = parsed.functionalityTests;
    if (Array.isArray(parsed.interactionTests)) payload.interactionTests = parsed.interactionTests;

    if (!Object.keys(payload).length) {
      setJsonError('JSON must have "functionalityTests" and/or "interactionTests" arrays.');
      return;
    }

    setSaving(true); setSaveError('');
    try {
      const result = await updateAssignmentTests(assignment._id, payload);
      setSaved(result);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline mb-4 flex items-center gap-1">← Back</button>
      <h2 className="text-lg font-bold text-[var(--text-strong)] mb-1">Edit Tests — {assignment.title}</h2>
      <p className="text-sm text-[var(--text-faint)] mb-6">
        Paste a JSON object with <code className="text-[#4e9af1]">functionalityTests</code> and/or <code className="text-[#4e9af1]">interactionTests</code> arrays.
      </p>

      {saved ? (
        <div className="bg-[var(--bg-surface-alt)] border border-[#3fb950]/40 rounded-xl p-6">
          <p className="text-[#3fb950] font-semibold text-sm mb-2">Tests updated!</p>
          <p className="text-sm text-[var(--text-muted)]">Functionality tests saved: <span className="text-[var(--text-strong)] font-bold">{saved.functionalityTests}</span></p>
          <p className="text-sm text-[var(--text-muted)]">Interaction tests saved: <span className="text-[var(--text-strong)] font-bold">{saved.interactionTests}</span></p>
          <button onClick={onBack} className="mt-4 px-4 py-2 text-sm font-semibold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda]">Done</button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Tests JSON — <span className="text-[var(--text-faint)] font-normal">object with functionalityTests (40 marks) and interactionTests (15 marks)</span>
            </label>
            <textarea
              rows={20} value={json}
              onChange={e => { setJson(e.target.value); setJsonError(''); }}
              placeholder={EDIT_TESTS_PLACEHOLDER}
              className="w-full px-3 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-muted)] font-mono placeholder:text-[var(--border-color)] focus:outline-none focus:border-[#4e9af1] resize-y"
              spellCheck={false}
            />
            {jsonError && <p className="text-xs text-[#f85149] mt-1">{jsonError}</p>}
          </div>

          {saveError && <p className="text-xs text-[#f85149]">{saveError}</p>}
          <button
            type="submit" disabled={saving}
            className="px-6 py-2.5 bg-[#2f80ed] text-[var(--text-strong)] text-sm font-semibold rounded-lg hover:bg-[#1a6cda] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Tests'}
          </button>
        </form>
      )}
    </div>
  );
}

function LeaderboardView({ onBack, onStudentClick }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [lbSearch, setLbSearch]           = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [studentPage, setStudentPage]     = useState(1);
  const LB_PAGE_SIZE = 20;

  useEffect(() => {
    setStudentSearch('');
    setStudentPage(1);
  }, [activeTab]);

  const fetchData = () => {
    setLoading(true);
    getLeaderboard()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  const assignment = data[activeTab];

  const medalColor = (rank) =>
    rank === 1 ? '#f0c040' :
      rank === 2 ? '#b0b8c8' :
        rank === 3 ? '#cd7f32' : '#555';

  const MedalIcon = ({ rank }) => (
    rank <= 3
      ? <FiAward size={18} style={{ color: medalColor(rank) }} />
      : <span className="text-xs font-bold text-[var(--text-faint)]">#{rank}</span>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline">← Back</button>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Student Leaderboard</h2>
        <button onClick={fetchData} className="ml-auto text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] border border-[var(--border-color)] rounded px-2 py-1 transition-colors">↻ Refresh</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-[var(--text-faint)] text-center py-20">No assignment data yet. Students need to submit first.</p>
      ) : (() => {
        const filteredLb = data.filter(a => a.title.toLowerCase().includes(lbSearch.toLowerCase()));
        const filteredStudents = (assignment?.students ?? []).filter(s =>
          s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
          s.email.toLowerCase().includes(studentSearch.toLowerCase())
        );
        const totalStudentPages = Math.max(1, Math.ceil(filteredStudents.length / LB_PAGE_SIZE));
        const pagedStudents = filteredStudents.slice((studentPage - 1) * LB_PAGE_SIZE, studentPage * LB_PAGE_SIZE);
        return (
          <div className="flex gap-5">
            {/* Assignment sidebar */}
            <div className="w-56 shrink-0 flex flex-col gap-2">
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  value={lbSearch}
                  onChange={e => setLbSearch(e.target.value)}
                  placeholder="Search assignments…"
                  className="w-full pl-7 pr-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors"
                />
              </div>
              <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[70vh] scrollbar-thin">
                {filteredLb.length === 0 && (
                  <p className="text-[10px] text-[var(--text-faintest)] text-center pt-4">No matches</p>
                )}
                {filteredLb.map((a) => {
                  const i = data.indexOf(a);
                  return (
                    <button
                      key={a.assignmentId}
                      onClick={() => setActiveTab(i)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center justify-between gap-2 ${activeTab === i
                        ? 'bg-[#2f80ed]/20 border-[#4e9af1] text-[#4e9af1]'
                        : 'bg-[var(--bg-surface-alt)] border-[var(--border-color)] text-[var(--text-faint)] hover:border-[var(--text-faintest)] hover:text-[#bbb]'
                      }`}
                    >
                      <span className="text-xs font-medium truncate flex-1">{a.title}</span>
                      {a.completedCount > 0 && (
                        <span className={`shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === i ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[var(--bg-base)] text-[var(--text-faint)]'}`}>
                          {a.completedCount} <MdCheckCircle size={9} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Leaderboard content */}
            <div className="flex-1 min-w-0">
              {assignment && (
                <>
                  {/* Assignment stats bar */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Students', value: assignment.totalStudents, color: 'text-[var(--text-strong)]' },
                      { label: 'Completed', value: `${assignment.completedCount} / ${assignment.totalStudents}`, color: 'text-[#3fb950]' },
                      { label: 'Avg Score', value: `${assignment.avgScore}/100`, color: assignment.avgScore >= 50 ? 'text-[#3fb950]' : assignment.avgScore >= 30 ? 'text-[#f0a500]' : 'text-[#f85149]' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl p-4 text-center">
                        <p className={`text-xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-[var(--text-faint)] mt-1">{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Student search */}
                  {assignment.students.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 flex-wrap">
                      <div className="relative flex-1 min-w-[160px] max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <input
                          type="text"
                          value={studentSearch}
                          onChange={e => { setStudentSearch(e.target.value); setStudentPage(1); }}
                          placeholder="Search by name or email…"
                          className="w-full pl-9 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors"
                        />
                      </div>
                      <span className="text-xs text-[var(--text-faint)]">{filteredStudents.length} of {assignment.students.length} students</span>
                    </div>
                  )}

                  {/* Ranked table */}
                  {assignment.students.length === 0 ? (
                    <p className="text-[var(--text-faint)] text-sm text-center py-12">No submissions yet for this assignment.</p>
                  ) : filteredStudents.length === 0 ? (
                    <p className="text-[var(--text-faint)] text-sm text-center py-12">No students match your search.</p>
                  ) : (
                    <>
                      <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border-color)] text-left text-xs text-[var(--text-faint)]">
                              <th className="pb-3 pt-3 px-4 font-semibold w-12">Rank</th>
                              <th className="pb-3 pt-3 px-4 font-semibold">Student</th>
                              <th className="pb-3 pt-3 px-4 font-semibold">Status</th>
                              <th className="pb-3 pt-3 px-4 font-semibold">Attempts</th>
                              <th className="pb-3 pt-3 px-4 font-semibold">Best Score</th>
                              <th className="pb-3 pt-3 px-4 font-semibold w-40">Score Bar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedStudents.map((s) => (
                              <tr
                                key={s.studentId}
                                onClick={() => onStudentClick(assignment.assignmentId, s.studentId, 'leaderboard')}
                                className="border-b border-[#111122] hover:bg-[var(--bg-surface-alt)] transition-colors cursor-pointer group"
                              >
                                <td className="py-3 px-4 font-bold text-base">
                                  <MedalIcon rank={s.rank} />
                                </td>
                                <td className="py-3 px-4">
                                  <p className="font-semibold text-[var(--text-strong)] text-sm">{s.name}</p>
                                  <p className="text-[10px] text-[var(--text-faint)]">{s.email}</p>
                                </td>
                                <td className="py-3 px-4">
                                  {s.completed ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full">
                                      <MdCheckCircle size={10} /> Done
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--border-color)] text-[var(--text-faint)] rounded-full">In progress</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-[var(--text-muted)] text-xs">{s.attempts}</td>
                                <td className={`py-3 px-4 font-bold text-sm ${s.bestScore >= 80 ? 'text-[#3fb950]' : s.bestScore >= 50 ? 'text-[#f0a500]' : 'text-[#f85149]'}`}>{s.bestScore}/100</td>
                                <td className="py-3 px-4">
                                  <div className="w-full bg-[var(--bg-surface)] rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${s.bestScore >= 80 ? 'bg-[#3fb950]' : s.bestScore >= 50 ? 'bg-[#f0a500]' : 'bg-[#f85149]'}`}
                                      style={{ width: `${s.bestScore}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination */}
                      {totalStudentPages > 1 && (
                        <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-color)]">
                          <button
                            onClick={() => setStudentPage(p => Math.max(1, p - 1))}
                            disabled={studentPage === 1}
                            className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >← Prev</button>
                          <span className="text-xs text-[var(--text-faint)]">Page {studentPage} of {totalStudentPages}</span>
                          <button
                            onClick={() => setStudentPage(p => Math.min(totalStudentPages, p + 1))}
                            disabled={studentPage === totalStudentPages}
                            className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >Next →</button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function SubmissionsView({ assignment, onBack, onStudentClick }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssignmentSubmissions(assignment._id)
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assignment._id]);

  return (
    <div>
      <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline mb-4 flex items-center gap-1">
        ← Back
      </button>
      <h2 className="text-lg font-bold text-[var(--text-strong)] mb-1">{assignment.title}</h2>
      <p className="text-sm text-[var(--text-faint)] mb-6">Student submissions</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <p className="text-[var(--text-faint)] text-sm text-center py-12">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-left text-xs text-[var(--text-faint)]">
                <th className="pb-2 pr-4 font-semibold">Student ID</th>
                <th className="pb-2 pr-4 font-semibold">Completed</th>
                <th className="pb-2 pr-4 font-semibold">Attempts</th>
                <th className="pb-2 pr-4 font-semibold">Best Score</th>
                <th className="pb-2 pr-4 font-semibold">Linter/10</th>
                <th className="pb-2 pr-4 font-semibold">Func/40</th>
                <th className="pb-2 pr-4 font-semibold">Interact/15</th>
                <th className="pb-2 pr-4 font-semibold">Visual/20</th>
                <th className="pb-2 font-semibold">Perf/15</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => {
                const r = s.result;
                const scoreColor = s.bestScore >= 80 ? 'text-[#3fb950]' : s.bestScore >= 50 ? 'text-[#f0a500]' : 'text-[#f85149]';
                return (
                  <tr
                    key={s.submissionId ?? s.studentId}
                    onClick={() => onStudentClick(assignment._id, s.studentId, 'submissions')}
                    className="border-b border-[var(--bg-surface-alt)] hover:bg-[#202035] transition-colors cursor-pointer group"
                  >
                    <td className="py-2 pr-4 text-[var(--text-muted)] font-mono text-xs">{s.studentId?.slice(0, 8)}…</td>
                    <td className="py-2 pr-4">
                      {s.completed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#3fb950]/10 text-[#3fb950]">
                          <MdCheckCircle size={12} /> Done
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-faint)]">In progress</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-muted)] text-xs">{s.attempts ?? 1}</td>
                    <td className={`py-2 pr-4 font-bold ${scoreColor}`}>{s.bestScore ?? r?.totalScore ?? '—'}/100</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{r ? `${r.breakdown.linter?.score ?? '—'}` : '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{r ? `${r.breakdown.functionality?.score ?? '—'}` : '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{r ? `${r.breakdown.interaction?.score ?? '—'}` : '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{r ? `${r.breakdown.visual?.score ?? '—'}` : '—'}</td>
                    <td className="py-2 text-[var(--text-muted)]">{r ? `${r.breakdown.performance?.score ?? '—'}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentDetailView({ assignmentId, studentId, assignment, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStudentRunner, setShowStudentRunner] = useState(false);

  useEffect(() => {
    getTeacherStudentSubmission(assignmentId, studentId)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message || 'Failed to load code & score'); setLoading(false); });
  }, [assignmentId, studentId]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
    </div>
  );
  if (error) return (
    <div className="py-20 text-center">
      <p className="text-[#f85149] mb-4">{error}</p>
      <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline">← Go Back</button>
    </div>
  );
  if (!data) return null;

  return (
    <div className="flex min-h-[calc(100vh-180px)] flex-col">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start gap-3 shrink-0 px-1">
        <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline shrink-0">← Back</button>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[var(--text-strong)] leading-tight flex flex-wrap items-center gap-2">
            {data.student?.name || 'Student'}&apos;s Submission
            {data.completed ? (
              <span className="align-middle inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full">
                <MdCheckCircle size={10} /> Done
              </span>
            ) : (
              <span className="align-middle text-[10px] font-bold px-2 py-0.5 bg-[var(--border-color)] text-[var(--text-faint)] rounded-full">In progress</span>
            )}
          </h2>
          <p className="text-xs text-[var(--text-muted)] break-all">{data.student?.email || studentId}</p>
        </div>
      </div>

      {/* Two Pane Split */}
      <div className="flex min-h-0 flex-1 flex-col xl:flex-row overflow-hidden border border-[var(--border-color)] rounded-2xl bg-[var(--bg-base)] shadow-lg">
        {/* Left: Code */}
        <section className="flex min-h-[340px] min-w-0 flex-1 flex-col border-b xl:border-b-0 xl:border-r border-[var(--border-color)] bg-[var(--bg-surface)] xl:basis-[54%]">
          <div className="px-4 py-3 bg-[var(--bg-surface-alt)] border-b border-[var(--border-color)] flex justify-between items-center text-xs shrink-0">
            <span className="font-semibold text-[var(--text-strong)]">Submitted Code</span>
            <div className="flex items-center gap-3">
              <span className="text-[var(--text-muted)] font-mono">Attempts: {data.attempts ?? 1}</span>
              <button
                onClick={() => setShowStudentRunner(s => !s)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all
                  ${showStudentRunner
                    ? 'bg-[#f0a500]/15 border border-[#f0a500]/40 text-[#f0a500]'
                    : 'bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-strong)]'}`}
              >
                {showStudentRunner ? '◼ Close' : '▶ Run'}
              </button>
            </div>
          </div>
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className={showStudentRunner ? 'flex-1 min-w-0' : 'flex-1'}>
              <CodeEditor files={data.files} readOnly={true} />
            </div>
            {showStudentRunner && (
              <div className="flex-1 min-w-[280px] border-l border-[var(--border-color)]">
                <LiveRunner
                  files={data.files}
                  assignment={assignment}
                  isVisible={showStudentRunner}
                  onClose={() => setShowStudentRunner(false)}
                />
              </div>
            )}
          </div>
        </section>

        {/* Right: Results Panel */}
        <section className="min-h-[320px] flex-1 overflow-y-auto p-4 sm:p-5 bg-[var(--bg-surface)] custom-scrollbar xl:basis-[46%]">
          {data.result ? (
            <ResultsPanel status="done" result={data.result} />
          ) : (
            <div className="text-center py-16 text-[var(--text-faint)]">
              <FiRefreshCw size={36} className="mx-auto mb-3 text-[var(--text-faintest)]" />
              <p className="text-sm">No evaluation result found for this submission.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ── Assignment Library Manager Modal ─────────────────────────────────────────

function AssignmentLibraryManager({ assignment, allPolicies, onClose, onSave }) {
  const [selected, setSelected] = useState(new Set(assignment.allowedLibraryPolicyIds || []));
  const [saving, setSaving] = useState(false);

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await setAssignmentLibraryPolicies(assignment._id, Array.from(selected));
      onSave(assignment._id, Array.from(selected));
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const enabledPolicies = allPolicies.filter(p => p.enabled);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--text-strong)]">Assign Library Policies</h3>
          <button onClick={onClose} className="p-1 text-[var(--text-faint)] hover:text-[var(--text-strong)] transition-colors"><FiX size={16} /></button>
        </div>
        <p className="text-xs text-[var(--text-faint)] mb-1 font-medium truncate">{assignment.title}</p>
        <p className="text-xs text-[var(--text-faint)] mb-4">Only enabled, version-pinned libraries will be allowed in this assignment&apos;s sandbox.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto mb-5">
          {enabledPolicies.map(p => (
            <label key={p._id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected.has(p._id) ? 'border-[#4e9af1]/50 bg-[#4e9af1]/10' : 'border-[var(--border-color)] hover:border-[var(--text-faintest)]'}`}>
              <input type="checkbox" checked={selected.has(p._id)} onChange={() => toggle(p._id)} className="accent-[#4e9af1]" />
              <div>
                <span className="text-sm font-semibold text-[var(--text-strong)]">{p.name}</span>
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#4e9af1]/10 text-[#4e9af1] border border-[#4e9af1]/20">v{p.version}</span>
              </div>
            </label>
          ))}
          {enabledPolicies.length === 0 && (
            <p className="text-xs text-[var(--text-faint)] text-center py-6">No enabled library policies. Add some in the Libraries tab first.</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2 text-xs font-bold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda] transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2 text-xs font-semibold text-[var(--text-faint)] border border-[var(--border-color)] rounded-lg hover:border-[var(--text-faintest)] transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Teacher: Students View ────────────────────────────────────────────────────

function TeacherStudentsView() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name: '', email: '', password: '' });
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  const load = () => getTeacherStudents().then(setStudents).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try { await createTeacherStudent(form); setShowForm(false); load(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this student and all their submissions?')) return;
    try { await deleteTeacherStudent(id); load(); } catch (e) { alert(e.message); }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Students ({students.length})</h2>
        <button onClick={() => { setForm({ name: '', email: '', password: '' }); setError(''); setShowForm(true); }}
          className="px-4 py-2 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg hover:bg-[#1a6cda] transition-colors">
          + Add Student
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
              {['Name', 'Email', 'Joined', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-[var(--text-faint)] font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s._id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-surface)] transition-colors">
                <td className="px-4 py-3 font-medium text-[var(--text-strong)]">{s.name}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{s.email}</td>
                <td className="px-4 py-3 text-[var(--text-faint)] text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(s._id)} className="text-xs text-[#f85149] hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-[var(--text-faint)] text-sm">No students yet. Add one to get started.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-base font-semibold text-[var(--text-strong)] mb-4">Add Student</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              {[['Name', 'name', 'text'], ['Email', 'email', 'email'], ['Password', 'password', 'password']].map(([label, key, type]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">{label}</label>
                  <input type={type} required value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] focus:outline-none focus:border-[#4e9af1]" />
                </div>
              ))}
              {error && <p className="text-xs text-[#f85149]">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-muted)]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg hover:bg-[#1a6cda] disabled:opacity-50">{saving ? 'Saving…' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher: Groups View ──────────────────────────────────────────────────────

function TeacherGroupsView() {
  const [groups,   setGroups]   = useState([]);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [form, setForm]         = useState({ name: '', studentIds: [] });
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

  const load = async () => {
    setLoading(true);
    try { const [g, s] = await Promise.all([getGroups(), getTeacherStudents()]); setGroups(g); setStudents(s); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  function openCreate() { setForm({ name: '', studentIds: [] }); setError(''); setEditGroup(null); setShowForm(true); }
  function openEdit(g)  { setForm({ name: g.name, studentIds: [...g.studentIds] }); setError(''); setEditGroup(g); setShowForm(true); }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editGroup) await updateGroup(editGroup._id, form);
      else           await createGroup(form);
      setShowForm(false); load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this group?')) return;
    try { await deleteGroup(id); load(); } catch (e) { alert(e.message); }
  }

  function toggleStudent(id) {
    setForm(f => ({
      ...f,
      studentIds: f.studentIds.includes(id) ? f.studentIds.filter(s => s !== id) : [...f.studentIds, id]
    }));
  }

  const studentMap = Object.fromEntries(students.map(s => [s._id, s]));

  if (loading) return <div className="flex justify-center py-20"><div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Groups ({groups.length})</h2>
        <button onClick={openCreate} className="px-4 py-2 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg hover:bg-[#1a6cda] transition-colors">+ New Group</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(g => (
          <div key={g._id} className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-[var(--text-strong)]">{g.name}</h3>
              <span className="text-xs text-[var(--text-faint)]">{g.studentIds.length} students</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
              {g.studentIds.map(id => (
                <span key={id} className="text-[10px] px-2 py-0.5 rounded-full bg-[#4e9af1]/10 text-[#4e9af1] border border-[#4e9af1]/20">
                  {studentMap[id]?.name || id}
                </span>
              ))}
              {g.studentIds.length === 0 && <span className="text-xs text-[var(--text-faint)] italic">No students yet</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(g)} className="text-xs text-[#4e9af1] border border-[#4e9af1]/20 px-3 py-1.5 rounded-lg hover:bg-[#4e9af1]/10 transition-colors">Edit</button>
              <button onClick={() => handleDelete(g._id)} className="text-xs text-[#f85149] border border-[#f85149]/20 px-3 py-1.5 rounded-lg hover:bg-[#f85149]/10 transition-colors">Delete</button>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="col-span-2 py-16 text-center text-[var(--text-faint)] text-sm">No groups yet. Create a group to assign students to assignments.</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm max-h-[90vh] flex flex-col">
            <h3 className="text-base font-semibold text-[var(--text-strong)] mb-4">{editGroup ? 'Edit Group' : 'New Group'}</h3>
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1">Group Name</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] focus:outline-none focus:border-[#4e9af1]" />
              </div>
              <div className="flex-1 overflow-y-auto">
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">Students</label>
                {students.length === 0 && <p className="text-xs text-[var(--text-faint)]">No students available. Add students first.</p>}
                <div className="space-y-1">
                  {students.map(s => (
                    <label key={s._id} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--bg-surface)] transition-colors">
                      <input type="checkbox" checked={form.studentIds.includes(s._id)}
                        onChange={() => toggleStudent(s._id)}
                        className="w-3.5 h-3.5 accent-[#4e9af1]" />
                      <span className="text-sm text-[var(--text-strong)]">{s.name}</span>
                      <span className="text-xs text-[var(--text-faint)] ml-auto">{s.email}</span>
                    </label>
                  ))}
                </div>
              </div>
              {error && <p className="text-xs text-[#f85149]">{error}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-muted)]">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg hover:bg-[#1a6cda] disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Teacher: Library Policies View ────────────────────────────────────────────

function TeacherLibraryPoliciesView() {
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
    getTeacherLibraryPolicies().then(setPolicies).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.version.trim()) { setError('Name and version are required.'); return; }
    setSaving(true);
    try {
      const urls = form.cdnUrls.split('\n').map(u => u.trim()).filter(Boolean);
      const policy = await createTeacherLibraryPolicy({ name: form.name.trim(), version: form.version.trim(), cdnUrls: urls });
      setPolicies(prev => [...prev, policy].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: '', version: '', cdnUrls: '' });
      setShowForm(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id, currentEnabled) => {
    setTogglingId(id);
    try {
      const updated = await updateTeacherLibraryPolicy(id, { enabled: !currentEnabled });
      setPolicies(prev => prev.map(p => p._id === id ? updated : p));
    } catch (e) { alert(e.message); }
    finally { setTogglingId(null); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Remove library "${name}"? Assignments using it will lose this policy.`)) return;
    setDeletingId(id);
    try {
      await deleteTeacherLibraryPolicy(id);
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
      const updated = await updateTeacherLibraryPolicy(id, { name: editForm.name.trim(), version: editForm.version.trim(), cdnUrls: urls });
      setPolicies(prev => prev.map(p => p._id === id ? updated : p));
      setEditingId(null);
    } catch (e) { setEditError(e.message); }
    finally { setEditSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Library Policies ({policies.length})</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#4e9af1]/10 border border-[#4e9af1]/30 text-[#4e9af1] hover:bg-[#4e9af1]/20 transition-colors">
          <FiPlus size={12} /> Add Library
        </button>
      </div>

      <p className="text-xs text-[var(--text-faint)] mb-5">
        Define which CDN libraries students may load, pinned to exact versions.
      </p>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-[var(--bg-surface-alt)] border border-[#4e9af1]/30 rounded-xl p-5 mb-5 space-y-3">
          <p className="text-sm font-bold text-[var(--text-strong)] mb-1">New Library Policy</p>
          {error && <p className="text-xs text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-faint)] block mb-1">Library Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Bootstrap"
                className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1]" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-faint)] block mb-1">Fixed Version</label>
              <input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                placeholder="5.3.0"
                className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1]" />
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-faint)] block mb-1">Allowed CDN URL Prefixes <span className="text-[var(--text-faintest)]">(one per line)</span></label>
            <textarea value={form.cdnUrls} onChange={e => setForm(f => ({ ...f, cdnUrls: e.target.value }))}
              rows={4} placeholder={"https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/\nhttps://stackpath.bootstrapcdn.com/bootstrap/5.3.0/"}
              className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs font-mono text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-xs font-bold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda] transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Policy'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setError(''); }}
              className="px-4 py-2 text-xs font-semibold text-[var(--text-faint)] border border-[var(--border-color)] rounded-lg hover:border-[var(--text-faintest)] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map(p => (
            <div key={p._id} className={`bg-[var(--bg-surface-alt)] border rounded-xl p-4 transition-colors ${deletingId === p._id ? 'opacity-40' : 'border-[var(--border-color)]'}`}>
              {editingId === p._id ? (
                <div className="space-y-3">
                  {editError && <p className="text-xs text-[#f85149] bg-[#f85149]/10 border border-[#f85149]/20 rounded-lg px-3 py-2">{editError}</p>}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-[var(--text-faint)] block mb-1">Library Name</label>
                      <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] focus:outline-none focus:border-[#4e9af1]" />
                    </div>
                    <div>
                      <label className="text-xs text-[var(--text-faint)] block mb-1">Fixed Version</label>
                      <input value={editForm.version} onChange={e => setEditForm(f => ({ ...f, version: e.target.value }))}
                        className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] focus:outline-none focus:border-[#4e9af1]" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-faint)] block mb-1">Allowed CDN URL Prefixes <span className="text-[var(--text-faintest)]">(one per line)</span></label>
                    <textarea value={editForm.cdnUrls} onChange={e => setEditForm(f => ({ ...f, cdnUrls: e.target.value }))}
                      rows={4} className="w-full px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs font-mono text-[var(--text-strong)] focus:outline-none focus:border-[#4e9af1] resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditSave(p._id)} disabled={editSaving}
                      className="px-4 py-2 text-xs font-bold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda] transition-colors disabled:opacity-50">
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setEditingId(null); setEditError(''); }}
                      className="px-4 py-2 text-xs font-semibold text-[var(--text-faint)] border border-[var(--border-color)] rounded-lg hover:border-[var(--text-faintest)] transition-colors">
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
                      <span className="text-sm font-bold text-[var(--text-strong)]">{p.name}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#4e9af1]/10 text-[#4e9af1] border border-[#4e9af1]/20">v{p.version}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.enabled ? 'bg-[#3fb950]/10 text-[#3fb950] border-[#3fb950]/20' : 'bg-[var(--bg-surface)] text-[var(--text-faint)] border-[var(--border-color)]'}`}>
                        {p.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {p.cdnUrls?.length > 0 ? (
                      <div className="space-y-0.5">
                        {p.cdnUrls.map((url, i) => (
                          <p key={i} className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-faint)] truncate">
                            <FiLink size={9} className="shrink-0" />{url}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#f0a500]">No CDN URL prefixes defined.</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => startEdit(p)} title="Edit"
                      className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-colors">
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => handleToggle(p._id, p.enabled)} disabled={togglingId === p._id}
                      title={p.enabled ? 'Disable' : 'Enable'}
                      className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-colors">
                      {p.enabled ? <FiToggleRight size={18} className="text-[#3fb950]" /> : <FiToggleLeft size={18} />}
                    </button>
                    <button onClick={() => handleDelete(p._id, p.name)} disabled={deletingId === p._id}
                      className="p-1.5 rounded-lg text-[var(--text-faint)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {policies.length === 0 && (
            <div className="text-center py-16 text-[var(--text-faint)]">
              <FiPackage size={32} className="mx-auto mb-3 text-[var(--text-faintest)]" />
              <p className="text-sm">No library policies yet.</p>
              <p className="text-xs mt-1">Click &quot;Add Library&quot; to define the first approved CDN library.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Shared helpers for Progress/Submissions views ─────────────────────────────

function TScoreBar({ score }) {
  const color = score >= 80 ? '#3fb950' : score >= 50 ? '#f0a500' : '#f85149';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 bg-[var(--bg-base)] rounded-full h-1.5 overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

function TSortTh({ col, sortBy, sortDir, onSort, children, className = '' }) {
  const active = sortBy === col;
  return (
    <th className={`px-4 py-3 font-semibold text-left ${className}`}>
      <button onClick={() => onSort(col)} className="flex items-center gap-1 group text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors">
        {children}
        <span className={`text-[9px] transition-opacity ${active ? 'opacity-100 text-[#4e9af1]' : 'opacity-0 group-hover:opacity-60'}`}>
          {active ? (sortDir === 'asc' ? '▲' : '▼') : '▼'}
        </span>
      </button>
    </th>
  );
}

function TStatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
      <div className="p-2 rounded-lg shrink-0" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="text-lg font-black" style={{ color }}>{value}</p>
        <p className="text-[10px] text-[var(--text-faint)] mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function TPagination({ page, totalPages, total, pageSize, onPage }) {
  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-color)]">
      <p className="text-xs text-[var(--text-faint)]">{start}–{end} of {total} records</p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="p-1.5 rounded text-xs text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-base)] disabled:opacity-30 transition-colors">«</button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="p-1.5 rounded text-xs text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-base)] disabled:opacity-30 transition-colors">‹</button>
        <span className="px-3 py-1 text-xs text-[var(--text-strong)] font-medium bg-[var(--bg-base)] rounded border border-[var(--border-color)]">{page} / {totalPages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
          className="p-1.5 rounded text-xs text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-base)] disabled:opacity-30 transition-colors">›</button>
        <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
          className="p-1.5 rounded text-xs text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-base)] disabled:opacity-30 transition-colors">»</button>
      </div>
    </div>
  );
}

// ── Teacher: Progress Records View ────────────────────────────────────────────

function TeacherProgressView() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    Promise.all([getTeacherProgress(), getAssignments()])
      .then(([recs, asgns]) => {
        setRecords(recs);
        setAssignments(asgns);
        if (asgns.length > 0) setSelectedId(asgns[0]._id);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this progress record? The student will lose their best score for this assignment.')) return;
    setDeleting(id);
    try {
      await deleteTeacherProgress(id);
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

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Progress Records</h2>
        <p className="text-xs text-[var(--text-faint)] mt-0.5">Select an assignment to view student progress</p>
      </div>

      {assignments.length === 0 ? (
        <p className="text-[var(--text-faint)] text-sm text-center py-20">No assignments found.</p>
      ) : (
        <div className="flex gap-5">
          {/* Assignment list */}
          <div className="w-56 shrink-0 flex flex-col gap-1.5 overflow-y-auto max-h-[70vh] scrollbar-thin">
            {assignmentStats.map(a => (
              <button key={a._id} onClick={() => { setSelectedId(a._id); setSearch(''); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-start justify-between gap-2 ${selectedId === a._id
                  ? 'bg-[#2f80ed]/20 border-[#4e9af1] text-[#4e9af1]'
                  : 'bg-[var(--bg-surface-alt)] border-[var(--border-color)] text-[var(--text-faint)] hover:border-[var(--text-faintest)] hover:text-[#bbb]'}`}>
                <p className="text-xs font-medium truncate flex-1">{a.title}</p>
                {a.completed > 0 && (
                  <span className={`shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedId === a._id ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[var(--bg-base)] text-[var(--text-faint)]'}`}>
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
                <TStatCard icon={FiUsers}       label="Students"   value={selStats.total}                        color="#4e9af1" />
                <TStatCard icon={FiCheckCircle} label="Completed"  value={`${selStats.completed} / ${selStats.total}`} color="#3fb950" />
                <TStatCard icon={FiActivity}    label="Avg Score"  value={`${selStats.avg}/100`}                 color={selStats.avg >= 50 ? '#3fb950' : '#f85149'} />
              </div>
            )}

            <div className="relative mb-3">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search student or email…"
                className="w-full pl-8 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors" />
            </div>

            <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead className="bg-[var(--bg-base)]/50">
                    <tr className="border-b border-[var(--border-color)] text-xs">
                      <TSortTh col="name"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Student</TSortTh>
                      <TSortTh col="score"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Best Score</TSortTh>
                      <TSortTh col="attempts" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Attempts</TSortTh>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-faint)]">Status</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRecords.map(r => (
                      <tr key={r._id} className={`border-b border-[var(--bg-base)] hover:bg-[var(--bg-base)]/60 transition-colors ${deleting === r._id ? 'opacity-40' : ''}`}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[var(--text-strong)] text-sm">{r.studentName}</p>
                          <p className="text-[10px] text-[var(--text-faint)]">{r.studentEmail}</p>
                        </td>
                        <td className="px-4 py-3"><TScoreBar score={r.bestScore} /></td>
                        <td className="px-4 py-3 text-[var(--text-muted)] text-sm font-medium tabular-nums">{r.attempts}</td>
                        <td className="px-4 py-3">
                          {r.completed
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full"><MdCheckCircle size={10} /> Done</span>
                            : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-faint)] rounded-full"><FiClock size={9} /> In progress</span>}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDelete(r._id)} disabled={deleting === r._id}
                            className="p-1.5 rounded-lg text-[var(--text-faintest)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors" title="Delete record">
                            <FiTrash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {selectedRecords.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-16 text-[var(--text-faint)] text-sm">
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

// ── Teacher: Global Submissions View ─────────────────────────────────────────

function TeacherGlobalSubmissionsView({ onStudentClick }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  const fetchAll = () => {
    setLoading(true);
    Promise.all([getTeacherAllSubmissions(500), getAssignments()])
      .then(([d, asgns]) => {
        setSubmissions(d.submissions);
        setAssignments(asgns);
        if (asgns.length > 0) setSelectedId(asgns[0]._id);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { fetchAll(); }, []);

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

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">All Submissions</h2>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">Select an assignment to view its submissions</p>
        </div>
        <button onClick={fetchAll} disabled={loading}
          className="flex items-center gap-1.5 text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40">
          <FiRefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {assignments.length === 0 ? (
        <p className="text-[var(--text-faint)] text-sm text-center py-20">No assignments found.</p>
      ) : (
        <div className="flex gap-5">
          {/* Assignment list */}
          <div className="w-56 shrink-0 flex flex-col gap-1.5 overflow-y-auto max-h-[70vh] scrollbar-thin">
            {assignmentStats.map(a => (
              <button key={a._id} onClick={() => { setSelectedId(a._id); setSearch(''); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-start justify-between gap-2 ${selectedId === a._id
                  ? 'bg-[#2f80ed]/20 border-[#4e9af1] text-[#4e9af1]'
                  : 'bg-[var(--bg-surface-alt)] border-[var(--border-color)] text-[var(--text-faint)] hover:border-[var(--text-faintest)] hover:text-[#bbb]'}`}>
                <p className="text-xs font-medium truncate flex-1">{a.title}</p>
                {a.completed > 0 && (
                  <span className={`shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${selectedId === a._id ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[var(--bg-base)] text-[var(--text-faint)]'}`}>
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
                <TStatCard icon={FiUsers}       label="Students"   value={selStats.total}                         color="#4e9af1" />
                <TStatCard icon={FiCheckCircle} label="Completed"  value={`${selStats.completed} / ${selStats.total}`} color="#3fb950" />
                <TStatCard icon={FiActivity}    label="Avg Score"  value={`${selStats.avg}/100`}                  color={selStats.avg >= 50 ? '#3fb950' : '#f85149'} />
              </div>
            )}

            <div className="relative mb-3">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search student or email…"
                className="w-full pl-8 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors" />
            </div>

            <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead className="bg-[var(--bg-base)]/50">
                    <tr className="border-b border-[var(--border-color)] text-xs">
                      <TSortTh col="name"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Student</TSortTh>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-faint)]">Status</th>
                      <TSortTh col="score"    sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Best Score</TSortTh>
                      <TSortTh col="attempts" sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Attempts</TSortTh>
                      <TSortTh col="date"     sortBy={sortBy} sortDir={sortDir} onSort={handleSort}>Submitted</TSortTh>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSubs.map(s => (
                      <tr key={s.submissionId}
                        onClick={() => onStudentClick(s.assignmentId, s.studentId, 'allSubmissions')}
                        className="border-b border-[var(--bg-base)] hover:bg-[var(--bg-base)]/60 transition-colors cursor-pointer group">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-[var(--text-strong)] text-sm group-hover:text-[#4e9af1] transition-colors">{s.studentName}</p>
                          <p className="text-[10px] text-[var(--text-faint)]">{s.studentEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          {s.completed
                            ? <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full"><MdCheckCircle size={10} /> Done</span>
                            : <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-faint)] rounded-full"><FiClock size={9} /> In progress</span>}
                        </td>
                        <td className="px-4 py-3">
                          {s.bestScore != null ? <TScoreBar score={s.bestScore} /> : <span className="text-[var(--text-faintest)] text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)] text-sm font-medium tabular-nums">{s.attempts ?? 1}</td>
                        <td className="px-4 py-3 text-[var(--text-faint)] text-xs whitespace-nowrap">
                          {s.submittedAt ? new Date(s.submittedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                    {selectedSubs.length === 0 && (
                      <tr><td colSpan={5} className="text-center py-16 text-[var(--text-faint)] text-sm">
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

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState('list'); // 'list' | 'create' | 'submissions' | 'editTests' | 'leaderboard' | 'studentDetail'
  const [historyView, setHistoryView] = useState('list');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [regenMsgs, setRegenMsgs] = useState({});
  const [libraryModal, setLibraryModal] = useState(null); // assignment object
  const [allPolicies, setAllPolicies] = useState([]);

  // Assignment list search + pagination
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherPage, setTeacherPage]     = useState(1);
  const TEACHER_PAGE_SIZE = 12;

  // Create form state
  const [form, setForm] = useState({ title: '', description: '', timeoutMs: 30000, viewports: ['desktop'], groupIds: [] });
  const [createGroups, setCreateGroups] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [testsJson, setTestsJson] = useState('');
  const [testsJsonError, setTestsJsonError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState('');
  const [createFilesMessage, setCreateFilesMessage] = useState(null);
  const [showReferenceRunner, setShowReferenceRunner] = useState(false);

  useEffect(() => {
    if (view === 'list') {
      setLoading(true);
      getAssignments()
        .then(setAssignments)
        .catch(console.error)
        .finally(() => setLoading(false));
      getTeacherLibraryPolicies().then(setAllPolicies).catch(() => {});
    }
  }, [view]);

  const handleToggle = async (assignmentId) => {
    setTogglingId(assignmentId);
    try {
      const updated = await toggleAssignment(assignmentId);
      setAssignments(prev => prev.map(a => a._id === assignmentId ? { ...a, isActive: updated.isActive } : a));
    } catch (err) { alert(err.message); }
    finally { setTogglingId(null); }
  };

  const handleRegenerate = async (assignmentId) => {
    setRegeneratingId(assignmentId);
    setRegenMsgs(prev => ({ ...prev, [assignmentId]: '' }));
    try {
      const d = await regenerateAssignmentBaseline(assignmentId);
      setRegenMsgs(prev => ({ ...prev, [assignmentId]: `✓ Baseline regenerated (${d.screenshotCount} screenshots)` }));
      if (d.referenceScreenshotUrl) {
        setAssignments(prev => prev.map(a => a._id === assignmentId ? { ...a, referenceScreenshotUrl: d.referenceScreenshotUrl } : a));
      }
    } catch (err) {
      setRegenMsgs(prev => ({ ...prev, [assignmentId]: '✗ ' + err.message }));
    } finally { setRegeneratingId(null); }
  };

  const handleLibrarySave = (assignmentId, policyIds) => {
    setAssignments(prev => prev.map(a => a._id === assignmentId ? { ...a, allowedLibraryPolicyIds: policyIds } : a));
  };

  const handleDelete = async (assignmentId) => {
    setDeletingId(assignmentId);
    try {
      await deleteAssignment(assignmentId);
      setAssignments(prev => prev.filter(a => a._id !== assignmentId));
    } catch (err) {
      console.error('Delete failed:', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !hasHtmlFile(files)) {
      setCreateError('Title and at least one HTML file are required.');
      return;
    }

    // Parse tests JSON if provided
    let functionalityTests = [];
    let interactionTests = [];
    if (testsJson.trim()) {
      try {
        const parsed = JSON.parse(testsJson.trim());
        functionalityTests = Array.isArray(parsed.functionalityTests) ? parsed.functionalityTests : [];
        interactionTests = Array.isArray(parsed.interactionTests) ? parsed.interactionTests : [];
        setTestsJsonError('');
      } catch {
        setTestsJsonError('Invalid JSON — check the tests format.');
        return;
      }
    }

    setCreateError('');
    setCreating(true);
    try {
      const result = await createAssignment({
        ...form,
        files,
        functionalityTests,
        interactionTests,
        viewports: form.viewports,
        timeoutMs: form.timeoutMs,
        groupIds: form.groupIds
      });
      setCreateResult(result);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStudentClick = (assignmentId, studentId, fromView) => {
    setSelectedStudentId(studentId);
    setSelectedAssignmentId(assignmentId);
    setHistoryView(fromView);
    setView('studentDetail');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-56 shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col min-h-screen sticky top-0 h-screen">
        {/* Logo / Brand */}
        <div className="px-5 py-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2f80ed]/30 to-[#4e9af1]/10 border border-[#2f80ed]/30 flex items-center justify-center">
              <FiBookOpen size={14} className="text-[#4e9af1]" />
            </div>
            <div>
              <p className="text-[var(--text-strong)] text-sm font-bold leading-tight">Teacher</p>
              <p className="text-[var(--text-faintest)] text-[10px] truncate max-w-[100px]">{user?.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { id: 'list', icon: FiList, label: 'Assignments' },
            { id: 'students', icon: FiUsers, label: 'Students' },
            { id: 'groups', icon: FiCheckCircle, label: 'Groups' },
            { id: 'leaderboard', icon: FiBarChart2, label: 'Leaderboard' },
            { id: 'analytics', icon: FiPieChart, label: 'Analytics' },
            { id: 'allSubmissions', icon: FiFileText, label: 'All Submissions' },
            { id: 'progress', icon: FiActivity, label: 'Progress' },
            { id: 'libraries', icon: FiPackage, label: 'Libraries' },
            { id: 'create', icon: FiPlus, label: 'New Assignment' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'create') {
                  setView('create');
                  setCreateResult(null); setCreateError('');
                  setForm({ title: '', description: '', timeoutMs: 30000, viewports: ['desktop'], groupIds: [] });
                  const starter = createStarterProject([]);
                  setFiles(starter);
                  setSelectedFileName(starter[0]?.name || null);
                  setTestsJson(''); setTestsJsonError('');
                  setCreateFilesMessage(null);
                  getGroups().then(setCreateGroups).catch(() => {});
                } else {
                  setView(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${view === item.id
                ? 'bg-[#2f80ed]/10 text-[#4e9af1] border border-[#2f80ed]/25'
                : 'text-[var(--text-faint)] hover:text-[#bbb] hover:bg-[var(--bg-surface-alt)]'
                }`}
            >
              <item.icon size={16} />
              {item.label}
              {view === item.id && <FiChevronRight size={12} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-faint)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-all"
          >
            <FiLogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar — context title only */}
        <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-[var(--text-strong)] text-sm capitalize">
              {view === 'list' ? 'Assignments' :
                view === 'create' ? 'New Assignment' :
                  view === 'leaderboard' ? 'Leaderboard' :
                    view === 'analytics' ? 'Analytics' :
                      view === 'students' ? 'Students' :
                        view === 'groups' ? 'Groups' :
                          view === 'submissions' ? `Submissions — ${selectedAssignment?.title}` :
                            view === 'editTests' ? `Edit Tests — ${selectedAssignment?.title}` :
                              view === 'studentDetail' ? 'Student Submission' :
                                view === 'allSubmissions' ? 'All Submissions' :
                                  view === 'progress' ? 'Progress Records' :
                                    view === 'libraries' ? 'Library Policies' : view}
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-strong)] flex items-center justify-center transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* full-height views (no padding wrapper) */}
          {view === 'studentDetail' && selectedAssignmentId && selectedStudentId ? (
            <div className="px-4 py-6 sm:px-6 lg:px-8 sm:py-8">
              <StudentDetailView
                assignmentId={selectedAssignmentId}
                studentId={selectedStudentId}
                assignment={selectedAssignment}
                onBack={() => setView(historyView)}
              />
            </div>
          ) : (
            <div className="px-4 py-6 sm:px-6 lg:px-8 sm:py-8">

              {/* ── ANALYTICS VIEW ── */}
              {view === 'analytics' && (
                <AnalyticsView onBack={() => setView('list')} />
              )}

              {/* ── LIBRARIES VIEW ── */}
              {view === 'libraries' && (
                <TeacherLibraryPoliciesView />
              )}

              {/* ── PROGRESS VIEW ── */}
              {view === 'progress' && (
                <TeacherProgressView />
              )}

              {/* ── ALL SUBMISSIONS VIEW ── */}
              {view === 'allSubmissions' && (
                <TeacherGlobalSubmissionsView onStudentClick={handleStudentClick} />
              )}

              {/* ── LEADERBOARD VIEW ── */}
              {view === 'leaderboard' && (
                <LeaderboardView onBack={() => setView('list')} onStudentClick={handleStudentClick} />
              )}

              {/* ── SUBMISSIONS VIEW ── */}
              {view === 'submissions' && selectedAssignment && (
                <SubmissionsView assignment={selectedAssignment} onBack={() => setView('list')} onStudentClick={handleStudentClick} />
              )}

              {/* ── EDIT TESTS VIEW ── */}
              {view === 'editTests' && selectedAssignment && (
                <EditTestsView assignment={selectedAssignment} onBack={() => setView('list')} />
              )}

              {/* ── STUDENTS VIEW ── */}
              {view === 'students' && <TeacherStudentsView />}

              {/* ── GROUPS VIEW ── */}
              {view === 'groups' && <TeacherGroupsView />}

              {/* ── LIST VIEW ── */}
              {view === 'list' && (() => {
                const filteredTeacher = assignments.filter(a =>
                  a.title.toLowerCase().includes(teacherSearch.toLowerCase())
                );
                const totalTeacherPages = Math.max(1, Math.ceil(filteredTeacher.length / TEACHER_PAGE_SIZE));
                const pagedTeacher = filteredTeacher.slice((teacherPage - 1) * TEACHER_PAGE_SIZE, teacherPage * TEACHER_PAGE_SIZE);
                return (
                  <>
                    <div className="flex items-center gap-3 mb-6 flex-wrap">
                      <h2 className="text-xl font-bold text-[var(--text-strong)]">Your Assignments</h2>
                      <span className="text-xs text-[var(--text-faint)] ml-auto">{filteredTeacher.length} of {assignments.length}</span>
                    </div>
                    {loading ? (
                      <div className="flex justify-center py-20">
                        <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
                      </div>
                    ) : assignments.length === 0 ? (
                      <div className="text-center py-20 text-[var(--text-faint)]">
                        <p className="text-lg mb-2">No assignments yet.</p>
                        <p className="text-sm">Click &quot;New Assignment&quot; in the sidebar to create your first one.</p>
                      </div>
                    ) : (
                      <>
                        {/* Search toolbar */}
                        <div className="relative mb-5 max-w-sm">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                          </svg>
                          <input
                            type="text"
                            value={teacherSearch}
                            onChange={e => { setTeacherSearch(e.target.value); setTeacherPage(1); }}
                            placeholder="Search assignments…"
                            className="w-full pl-9 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors"
                          />
                        </div>

                        {filteredTeacher.length === 0 ? (
                          <p className="text-[var(--text-faint)] text-center py-20">No assignments match your search.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {pagedTeacher.map(a => (
                                <AssignmentCard
                                  key={a._id}
                                  a={a}
                                  onViewSubmissions={(assignment) => { setSelectedAssignment(assignment); setView('submissions'); }}
                                  onEditTests={(assignment) => { setSelectedAssignment(assignment); setView('editTests'); }}
                                  onDelete={handleDelete}
                                  deletingId={deletingId}
                                  onToggle={handleToggle}
                                  togglingId={togglingId}
                                  onManageLibraries={(assignment) => setLibraryModal(assignment)}
                                  onRegenerate={handleRegenerate}
                                  regeneratingId={regeneratingId}
                                  regenMsg={regenMsgs[a._id]}
                                />
                              ))}
                            </div>

                            {/* Pagination */}
                            {totalTeacherPages > 1 && (
                              <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-[var(--border-color)]">
                                <button
                                  onClick={() => setTeacherPage(p => Math.max(1, p - 1))}
                                  disabled={teacherPage === 1}
                                  className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >← Prev</button>
                                <span className="text-xs text-[var(--text-faint)]">Page {teacherPage} of {totalTeacherPages}</span>
                                <button
                                  onClick={() => setTeacherPage(p => Math.min(totalTeacherPages, p + 1))}
                                  disabled={teacherPage === totalTeacherPages}
                                  className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                >Next →</button>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </>
                );
              })()}

              {/* ── CREATE VIEW ── */}
              {view === 'create' && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setView('list')} className="text-[#4e9af1] text-sm hover:underline">← Back</button>
                    <h2 className="text-xl font-bold text-[var(--text-strong)]">Create Assignment</h2>
                  </div>

                  {createResult ? (
                    <div className="bg-[var(--bg-surface-alt)] border border-[#3fb950]/40 rounded-xl p-6">
                      <p className="text-[#3fb950] font-semibold text-sm mb-3">Assignment created successfully!</p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {[
                          ['DOM tests (auto)', createResult.testsGenerated?.dom],
                          ['Style tests (auto)', createResult.testsGenerated?.style],
                          ['Functionality tests', createResult.testsGenerated?.functionality],
                          ['Interaction tests', createResult.testsGenerated?.interaction],
                        ].map(([label, val]) => (
                          <p key={label} className="text-sm text-[var(--text-muted)]">
                            {label}: <span className="text-[var(--text-strong)] font-semibold">{val ?? 0}</span>
                          </p>
                        ))}
                      </div>
                      {createResult.referenceScreenshotUrl && (
                        <div>
                          <p className="text-xs text-[var(--text-faint)] mb-2">Reference screenshot:</p>
                          <img src={createResult.referenceScreenshotUrl} alt="Reference" className="w-full max-w-md rounded-lg border border-[var(--border-color)]" />
                        </div>
                      )}
                      <button onClick={() => setView('list')} className="mt-4 px-4 py-2 text-sm font-semibold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda]">
                        View all assignments
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreate} className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <div className="space-y-6">
                        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
                          <h3 className="text-sm font-semibold text-[var(--text-strong)] mb-4">Assignment Details</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Assignment title *</label>
                              <input
                                type="text"
                                required
                                value={form.title}
                                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--border-light)] focus:outline-none focus:border-[#4e9af1]"
                                placeholder="e.g. Quiz App Recreation"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                                Description
                                <span className="ml-1 text-[var(--text-faintest)] font-normal normal-case">— explain the assignment for students</span>
                              </label>
                              <textarea
                                value={form.description}
                                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                rows={12}
                                className="w-full px-3 py-3 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--border-light)] focus:outline-none focus:border-[#4e9af1] resize-y leading-relaxed"
                                placeholder={"Describe what students need to build.\n\nExample:\n1. Overview — what the app does\n2. Requirements — specific features expected\n3. Examples — any input/output examples\n4. Notes — constraints or hints"}
                              />
                            </div>

                            {/* Visual Test Viewports */}
                            <div>
                              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
                                Visual Test Viewports
                                <span className="ml-1 text-[var(--text-faintest)] font-normal">— which screen sizes to compare</span>
                              </label>
                              <div className="flex gap-4">
                                {[
                                  { id: 'desktop', label: 'Desktop (1280×720)' },
                                  { id: 'mobile',  label: 'Mobile (390×844)' }
                                ].map(({ id, label }) => (
                                  <label key={id} className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={(form.viewports ?? ['desktop']).includes(id)}
                                      onChange={e => setForm(f => ({
                                        ...f,
                                        viewports: e.target.checked
                                          ? [...(f.viewports ?? ['desktop']), id]
                                          : (f.viewports ?? ['desktop']).filter(v => v !== id)
                                      }))}
                                      className="accent-[#4e9af1]"
                                    />
                                    {label}
                                  </label>
                                ))}
                              </div>
                            </div>

                            {/* Evaluation Timeout */}
                            <div>
                              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                                Evaluation timeout per test (ms)
                                <span className="ml-1 text-[var(--text-faintest)] font-normal">— default 30 000</span>
                              </label>
                              <input
                                type="number"
                                min={5000}
                                max={120000}
                                step={1000}
                                value={form.timeoutMs ?? 30000}
                                onChange={e => setForm(f => ({ ...f, timeoutMs: Number(e.target.value) }))}
                                className="w-40 px-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] focus:outline-none focus:border-[#4e9af1]"
                              />
                            </div>

                            {/* Assign to Groups */}
                            <div>
                              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2">
                                Assign to Groups
                                <span className="ml-1 text-[var(--text-faintest)] font-normal">— only selected groups will see this assignment</span>
                              </label>
                              {createGroups.length === 0 ? (
                                <p className="text-xs text-[var(--text-faint)]">No groups yet. Create groups in the Groups tab first.</p>
                              ) : (
                                <div className="space-y-1">
                                  {createGroups.map(g => (
                                    <label key={g._id} className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer hover:bg-[var(--bg-base)] transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={(form.groupIds ?? []).includes(g._id)}
                                        onChange={e => setForm(f => ({
                                          ...f,
                                          groupIds: e.target.checked
                                            ? [...(f.groupIds ?? []), g._id]
                                            : (f.groupIds ?? []).filter(id => id !== g._id)
                                        }))}
                                        className="accent-[#4e9af1]"
                                      />
                                      <span className="text-sm text-[var(--text-strong)]">{g.name}</span>
                                      <span className="text-xs text-[var(--text-faint)] ml-auto">{g.studentIds.length} students</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </section>

                        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5">
                          <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                            Tests JSON
                            <span className="text-[var(--text-faint)] font-normal"> — functionalityTests (40 marks) and interactionTests (15 marks)</span>
                          </label>
                          <textarea rows={12} value={testsJson}
                            onChange={e => { setTestsJson(e.target.value); setTestsJsonError(''); }}
                            placeholder={EDIT_TESTS_PLACEHOLDER}
                            className="w-full px-3 py-2.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-muted)] font-mono placeholder:text-[var(--border-color)] focus:outline-none focus:border-[#4e9af1] resize-y"
                            spellCheck={false} />
                          {testsJsonError && <p className="text-xs text-[#f85149] mt-1">{testsJsonError}</p>}
                        </section>

                        <div className="flex flex-wrap items-center gap-3">
                          {createError && <p className="text-xs text-[#f85149]">{createError}</p>}
                          <button type="submit" disabled={creating}
                            className="px-6 py-2.5 bg-[#2f80ed] text-[var(--text-strong)] text-sm font-semibold rounded-lg hover:bg-[#1a6cda] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {creating ? 'Creating & capturing screenshot…' : 'Create Assignment'}
                          </button>
                        </div>
                      </div>

                      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col overflow-hidden" style={{ minHeight: '720px' }}>
                        {/* Header */}
                        <div className="shrink-0 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface)] flex items-center justify-between gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-[var(--text-muted)]">Reference code *</label>
                            <p className="text-xs text-[var(--text-faint)] mt-0.5">Upload the reference project files. The backend will bundle them into one self-contained page before baseline capture and evaluation.</p>
                          </div>
                          {files.some(f => f.type === 'html') && (
                            <button
                              type="button"
                              onClick={() => setShowReferenceRunner(s => !s)}
                              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                                ${showReferenceRunner
                                  ? 'bg-[#f0a500]/15 border border-[#f0a500]/40 text-[#f0a500]'
                                  : 'bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-strong)]'}`}
                            >
                              {showReferenceRunner ? '◼ Close Preview' : '▶ Preview Reference'}
                            </button>
                          )}
                        </div>

                        {/* File action buttons */}
                        <div className="shrink-0 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
                          <MultiFileUpload
                            files={files}
                            onChange={(nextFiles) => {
                              setFiles(nextFiles);
                              if (!nextFiles.some((file) => file.name === selectedFileName)) {
                                setSelectedFileName(nextFiles[0]?.name || null);
                              }
                            }}
                            onMessage={setCreateFilesMessage}
                            disabled={creating}
                            showDropZone={false}
                            showStartInEditor={false}
                          />
                          {createFilesMessage && (
                            <p className={`text-xs mt-2 ${createFilesMessage.tone === 'error' ? 'text-[#f85149]' : createFilesMessage.tone === 'success' ? 'text-[#3fb950]' : 'text-[var(--text-faint)]'}`}>
                              {createFilesMessage.message}
                            </p>
                          )}
                        </div>

                        {/* Editor + optional preview */}
                        <div className="flex flex-1 min-h-0 overflow-hidden">
                          <div className={`flex flex-col min-h-0 overflow-hidden ${showReferenceRunner ? 'flex-1 min-w-0' : 'flex-1'}`}>
                            <CodeEditor
                              files={files}
                              selectedFileName={selectedFileName}
                              onSelectFile={setSelectedFileName}
                              onChange={(fileName, value) => setFiles(updateProjectFileContent(files, fileName, value))}
                              onRemove={(fileName) => {
                                const nextFiles = removeProjectFile(files, fileName);
                                setFiles(nextFiles);
                                if (selectedFileName === fileName) {
                                  setSelectedFileName(nextFiles[0]?.name || null);
                                }
                              }}
                            />
                          </div>
                          {showReferenceRunner && (
                            <div className="flex-1 min-w-[280px] border-l border-[var(--border-color)]">
                              <LiveRunner
                                files={files}
                                assignment={null}
                                isVisible={showReferenceRunner}
                                onClose={() => setShowReferenceRunner(false)}
                              />
                            </div>
                          )}
                        </div>
                      </section>
                    </form>
                  )}
                </>
              )}

            </div>
          )}
        </main>
      </div>

      {/* Library policy modal */}
      {libraryModal && (
        <AssignmentLibraryManager
          assignment={libraryModal}
          allPolicies={allPolicies}
          onClose={() => setLibraryModal(null)}
          onSave={handleLibrarySave}
        />
      )}
    </div>
  );
}
