import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';
import { MultiFileUpload } from '../components/MultiFileUpload.jsx';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { LiveRunner } from '../components/LiveRunner.jsx';
import { GeminiChatbot } from '../components/GeminiChatbot.jsx';
import { getAssignments, submitCode, getResult, getStudentProgress, getBestCode, getStudentLeaderboard, getAssignmentPreview, getAssignmentLibraries, socket } from '../api/index.js';
import { FiAward, FiFlag, FiTarget, FiZap, FiArrowLeft, FiBarChart2, FiLogOut, FiCode, FiSun, FiMoon, FiRefreshCcw, FiMenu, FiSettings, FiRotateCcw, FiClock } from 'react-icons/fi';
import { MdCheckCircle } from 'react-icons/md';
import {
  hasHtmlFile,
  removeProjectFile,
  setProjectMainFile,
  updateProjectFileContent,
  normalizeProjectFiles,
  createStarterProject
} from '../utils/projectFiles.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const RESULT_BUCKETS = [
  { key: 'linter',        label: 'Linter Quality',  max: 10 },
  { key: 'functionality', label: 'Functionality',   max: 40 },
  { key: 'interaction',   label: 'Interaction',     max: 15 },
  { key: 'visual',        label: 'Visual Match',    max: 20 },
  { key: 'performance',   label: 'Performance',     max: 15 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getActiveLanguage(files, selectedFileName) {
  if (!files || files.length === 0) return 'HTML';
  const name = selectedFileName || files[0]?.name || '';
  const ext  = name.split('.').pop().toLowerCase();
  return { html: 'HTML', css: 'CSS', js: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript' }[ext] || ext.toUpperCase();
}

function calcTestStats(result) {
  if (!result) return { passed: 0, failed: 0, total: 0 };
  const fnTests  = result?.breakdown?.functionality?.tests || [];
  const intTests = result?.breakdown?.interaction?.tests  || [];
  const all      = [...fnTests, ...intTests];
  const passed   = all.filter(t => t.passed).length;
  return { passed, failed: all.length - passed, total: all.length };
}

function scoreColor(pct) {
  return pct >= 80 ? '#3fb950' : pct >= 50 ? '#f0a500' : '#f85149';
}

// ── Leaderboard view ──────────────────────────────────────────────────────────
const MEDAL = {
  1: { emoji: '🥇', color: '#f0c040', bg: 'bg-[#f0c040]/10', border: 'border-[#f0c040]/30', barH: 96 },
  2: { emoji: '🥈', color: '#b0b8c8', bg: 'bg-[#b0b8c8]/10', border: 'border-[#b0b8c8]/30', barH: 72 },
  3: { emoji: '🥉', color: '#cd7f32', bg: 'bg-[#cd7f32]/10', border: 'border-[#cd7f32]/30', barH: 52 },
};

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#3fb950' : score >= 50 ? '#f0a500' : '#f85149';
  return (
    <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}<span className="text-[10px] font-normal opacity-60">/100</span></span>
  );
}

function Avatar({ name, size = 36, ring }) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hue = [...(name || '')].reduce((h, c) => h + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white shrink-0 ${ring ? 'ring-2 ring-offset-1 ring-[#4e9af1]' : ''}`}
      style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hue},55%,48%)`, ringOffset: 'var(--bg-surface)' }}
    >
      {initials}
    </div>
  );
}

function StudentLeaderboardView({ currentUser, onBack }) {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [assignSearch, setAssignSearch] = useState('');

  useEffect(() => {
    getStudentLeaderboard()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const assignment = data[activeTab];

  const podiumOrder = top3 => {
    const byRank = r => top3.find(s => s.rank === r) || null;
    return [byRank(2), byRank(1), byRank(3)].filter(Boolean);
  };

  const isMe = name => name === currentUser?.name;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <div className="w-10 h-10 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 gap-3">
        <FiFlag size={40} className="text-[var(--text-faintest)]" />
        <p className="text-[var(--text-faint)] text-sm">No assignments available yet.</p>
      </div>
    );
  }

  const filteredAssigns = data.filter(a => a.title.toLowerCase().includes(assignSearch.toLowerCase()));

  return (
    <div className="flex gap-4" style={{ minHeight: 0 }}>

      {/* Assignment sidebar */}
      <div className="w-52 shrink-0 flex flex-col gap-2">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={assignSearch}
            onChange={e => setAssignSearch(e.target.value)}
            placeholder="Search assignments…"
            className="w-full pl-7 pr-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-0.5 overflow-y-auto max-h-[70vh] scrollbar-thin pr-0.5">
          {filteredAssigns.length === 0 && (
            <p className="text-[10px] text-[var(--text-faintest)] text-center pt-4">No matches</p>
          )}
          {filteredAssigns.map((a) => {
            const i = data.indexOf(a);
            return (
              <button
                key={a.assignmentId}
                onClick={() => setActiveTab(i)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                  activeTab === i
                    ? 'bg-[#4e9af1]/15 border-[#4e9af1] text-[#4e9af1]'
                    : 'bg-[var(--bg-surface-alt)] border-[var(--border-color)] text-[var(--text-faint)] hover:border-[#4e9af1]/40 hover:text-[var(--text-muted)]'
                }`}
              >
                <span className="text-xs font-medium truncate flex-1">{a.title}</span>
                {a.myRank && (
                  <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    a.myRank.completed ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#f0a500]/15 text-[#f0a500]'
                  }`}>
                    #{a.myRank.rank}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Leaderboard content */}
      <div className="flex-1 min-w-0 flex flex-col gap-6">

      {assignment && (
        assignment.totalStudents === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 rounded-2xl border border-dashed border-[var(--border-color)]">
            <FiFlag size={36} className="text-[var(--text-faintest)]" />
            <p className="text-sm text-[var(--text-faint)]">No submissions yet — be the first!</p>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="text-xs text-[var(--text-faint)]">Participants</p>
                  <p className="text-base font-bold text-[var(--text-strong)]">{assignment.totalStudents}</p>
                </div>
              </div>
              {assignment.top3[0] && (
                <>
                  <div className="w-px h-8 bg-[var(--border-color)] mx-1" />
                  <div>
                    <p className="text-xs text-[var(--text-faint)]">Top score</p>
                    <p className="text-base font-bold text-[#3fb950]">{assignment.top3.find(s=>s.rank===1)?.bestScore ?? '—'}/100</p>
                  </div>
                </>
              )}
              {assignment.myRank && (
                <>
                  <div className="w-px h-8 bg-[var(--border-color)] mx-1" />
                  <div className="ml-auto text-right">
                    <p className="text-xs text-[var(--text-faint)]">Your rank</p>
                    <p className="text-base font-bold text-[#4e9af1]">#{assignment.myRank.rank}</p>
                  </div>
                </>
              )}
            </div>

            {/* Podium */}
            {assignment.top3.length > 0 && (
              <div className="flex items-end justify-center gap-4 pt-4">
                {podiumOrder(assignment.top3).map(s => {
                  const m = MEDAL[s.rank];
                  const me = isMe(s.name);
                  return (
                    <div key={s.rank} className="flex flex-col items-center gap-2 flex-1 max-w-[120px]">
                      <Avatar name={s.name} size={me ? 44 : 38} ring={me} />
                      <p className={`text-[11px] font-semibold text-center leading-tight truncate w-full px-1 ${me ? 'text-[#4e9af1]' : 'text-[var(--text-strong)]'}`}>
                        {s.name}{me ? ' (You)' : ''}
                      </p>
                      <ScoreBadge score={s.bestScore} />
                      {s.completed && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-[#3fb950]/10 text-[#3fb950] rounded-full">
                          <MdCheckCircle size={9} /> Done
                        </span>
                      )}
                      <div
                        className={`w-full rounded-t-xl border ${m.bg} ${m.border} flex items-center justify-center`}
                        style={{ height: m.barH }}
                      >
                        <span className="text-2xl">{m.emoji}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ranking table */}
            <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
              <div className="px-4 py-2.5 bg-[var(--bg-surface-alt)] border-b border-[var(--border-color)] flex items-center gap-2">
                <FiBarChart2 size={13} className="text-[#4e9af1]" />
                <span className="text-[11px] font-bold text-[var(--text-strong)] uppercase tracking-wider">Rankings</span>
              </div>
              <div className="divide-y divide-[var(--border-color)]">
                {assignment.top3.sort((a,b) => a.rank - b.rank).map(s => {
                  const m = MEDAL[s.rank];
                  const me = isMe(s.name);
                  return (
                    <div
                      key={s.rank}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${me ? 'bg-[#4e9af1]/8' : 'hover:bg-[var(--bg-surface-alt)]'}`}
                    >
                      <span className="text-lg w-6 text-center shrink-0">{m.emoji}</span>
                      <Avatar name={s.name} size={30} ring={me} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${me ? 'text-[#4e9af1]' : 'text-[var(--text-strong)]'}`}>
                          {s.name}{me ? ' (You)' : ''}
                        </p>
                      </div>
                      <ScoreBadge score={s.bestScore} />
                      {s.completed && (
                        <MdCheckCircle size={15} className="text-[#3fb950] shrink-0" />
                      )}
                    </div>
                  );
                })}

                {/* My rank row if outside top 3 */}
                {assignment.myRank && assignment.myRank.rank > 3 && (
                  <>
                    <div className="px-4 py-1.5 bg-[var(--bg-surface-alt)]">
                      <p className="text-[10px] text-[var(--text-faintest)] text-center">· · ·</p>
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3 bg-[#4e9af1]/8">
                      <span className="text-sm font-bold text-[#4e9af1] w-6 text-center shrink-0">#{assignment.myRank.rank}</span>
                      <Avatar name={currentUser?.name} size={30} ring />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#4e9af1] truncate">{currentUser?.name} (You)</p>
                      </div>
                      <ScoreBadge score={assignment.myRank.bestScore} />
                      {assignment.myRank.completed && (
                        <MdCheckCircle size={15} className="text-[#3fb950] shrink-0" />
                      )}
                    </div>
                  </>
                )}

                {/* Not submitted */}
                {!assignment.myRank && (
                  <div className="px-4 py-4 flex items-center gap-3 bg-[var(--bg-surface-alt)]/50">
                    <FiZap size={15} className="text-[var(--text-faintest)] shrink-0" />
                    <p className="text-xs text-[var(--text-faint)]">Submit your code to appear on the leaderboard</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
      </div>
    </div>
  );
}

// ── Assignment card (grid view) ───────────────────────────────────────────────
function AssignmentCard({ a, progress, onStart }) {
  const p           = progress[a._id];
  const isCompleted = p?.completed;
  const hasTried    = p?.attempts > 0;

  return (
    <div className={`bg-[var(--bg-surface-alt)] border rounded-xl overflow-hidden flex flex-col transition-colors ${isCompleted ? 'border-[#3fb950]/40' : 'border-[var(--border-color)]'}`}>
      {a.referenceScreenshotUrl && (
        <div className="relative">
          <img src={a.referenceScreenshotUrl} alt={a.title} className="w-full h-36 object-cover object-top border-b border-[var(--border-color)]" />
          {isCompleted ? (
            <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-[#3fb950]/20 border border-[#3fb950]/50 text-[#3fb950] text-[10px] font-bold rounded-full backdrop-blur-sm">
              <MdCheckCircle size={12} /> Completed
            </span>
          ) : hasTried ? (
            <span className="absolute top-2 right-2 px-2 py-0.5 bg-[#f0a500]/10 border border-[#f0a500]/40 text-[#f0a500] text-[10px] font-bold rounded-full backdrop-blur-sm">
              Best: {p.bestScore}/100
            </span>
          ) : null}
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-[var(--text-strong)] text-sm leading-snug">{a.title}</h3>
          {!a.referenceScreenshotUrl && isCompleted && (
            <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/40 text-[#3fb950] rounded-full">
              <MdCheckCircle size={10} /> Completed
            </span>
          )}
          {!a.referenceScreenshotUrl && !isCompleted && hasTried && (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-[#f0a500]/10 border border-[#f0a500]/30 text-[#f0a500] rounded-full">{p.bestScore}/100</span>
          )}
        </div>
        {hasTried && (
          <p className="text-[10px] text-[var(--text-faint)] mb-3">{p.attempts} attempt{p.attempts !== 1 ? 's' : ''} · Best: <span className={isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]'}>{p.bestScore}/100</span></p>
        )}
        <button
          type="button"
          onClick={() => onStart(a)}
          className={`mt-auto w-full py-2 text-xs font-semibold rounded-lg transition-colors ${isCompleted
            ? 'bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 hover:bg-[#3fb950]/30'
            : 'bg-[#2f80ed] text-white hover:bg-[#1a6cda]'
            }`}
        >
          {isCompleted ? 'Resubmit' : hasTried ? 'Try Again' : 'Start Assignment'}
        </button>
      </div>
    </div>
  );
}

function formatReferenceShotLabel(shot, fallbackIndex) {
  if (!shot) return `Page ${fallbackIndex + 1}`;
  if (shot.captureLabel) return `${shot.pageName} · ${shot.captureLabel}`;
  return shot.pageName || `Page ${fallbackIndex + 1}`;
}

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user, logout }       = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [view, setView]        = useState('list');

  const [assignments, setAssignments]           = useState([]);
  const [loadingList, setLoadingList]           = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [progress, setProgress]                 = useState({});

  // Submission state
  const [files, setFiles]                       = useState([]);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [submissionId, setSubmissionId]         = useState(null);
  const [status, setStatus]                     = useState(null);
  const [result, setResult]                     = useState(null);
  const [submitError, setSubmitError]           = useState('');
  const [filesMessage, setFilesMessage]         = useState(null);
  const [loadingCode, setLoadingCode]           = useState(false);
  const [codePrefilled, setCodePrefilled]       = useState(false);
  const [confirmDialog, setConfirmDialog]       = useState(null); // { title, message, onConfirm } | null

  // Panel state
  const [showResults, setShowResults]           = useState(false);
  const [infoTab, setInfoTab]                   = useState('description');
  const [activeShot, setActiveShot]             = useState(0);
  const [lightbox, setLightbox]                 = useState(null);
  const [showRunner, setShowRunner]             = useState(false);
  const [showTargetOutput, setShowTargetOutput] = useState(false);
  const [targetFullscreen, setTargetFullscreen] = useState(false);
  const [targetStopped, setTargetStopped]       = useState(false);
  const [editorWidth, setEditorWidth]           = useState(null);
  const [descWidth, setDescWidth]               = useState(null);
  const [resultsWidth, setResultsWidth]         = useState(420);
  const codeAreaRef                             = useRef(null);
  const mainAreaRef                             = useRef(null);
  const resultsAreaRef                          = useRef(null);
  const isDragging                              = useRef(false);
  const isDescDragging                          = useRef(false);
  const isResultsDragging                       = useRef(false);
  const [availableLibraries, setAvailableLibraries] = useState([]);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState([]);
  const [targetHtml, setTargetHtml]             = useState('');
  const [targetLoading, setTargetLoading]       = useState(false);
  const [bottomTab, setBottomTab]               = useState('testcase');
  const [showSettings, setShowSettings]         = useState(false);
  const [editorSettings, setEditorSettings]     = useState({ fontSize: 'medium', autoComplete: true, readOnly: false, editorTheme: 'dark' });

  // Question list search/filter/pagination
  const [qSearch, setQSearch]       = useState('');
  const [qFilter, setQFilter]       = useState('all');
  const [gridSearch, setGridSearch] = useState('');
  const [gridFilter, setGridFilter] = useState('all');
  const [gridPage, setGridPage]     = useState(1);
  const GRID_PAGE_SIZE = 12;

  // Sidebar resize / collapse
  const [sidebarWidth, setSidebarWidth]       = useState(240);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isSidebarDragging                     = useRef(false);

  const startSidebarResize = useCallback((e) => {
    e.preventDefault();
    isSidebarDragging.current = true;
    document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = 'none'; });
    const onMove = (ev) => {
      if (!isSidebarDragging.current) return;
      const newWidth = ev.clientX;
      setSidebarWidth(Math.min(Math.max(newWidth, 160), 400));
      if (newWidth < 80) setSidebarCollapsed(true);
      else setSidebarCollapsed(false);
    };
    const onUp = () => {
      isSidebarDragging.current = false;
      document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = ''; });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const startResize = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = 'none'; });
    const onMove = (ev) => {
      if (!isDragging.current || !codeAreaRef.current) return;
      const rect = codeAreaRef.current.getBoundingClientRect();
      const newWidth = ev.clientX - rect.left;
      const min = 280;
      const max = rect.width - 280;
      setEditorWidth(Math.min(Math.max(newWidth, min), max));
    };
    const onUp = () => {
      isDragging.current = false;
      document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = ''; });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  const startResultsResize = useCallback((e) => {
    e.preventDefault();
    isResultsDragging.current = true;
    document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = 'none'; });
    const startX = e.clientX;
    const startWidth = resultsAreaRef.current?.offsetWidth ?? resultsWidth;
    const onMove = (ev) => {
      if (!isResultsDragging.current) return;
      const delta = startX - ev.clientX;
      const newWidth = startWidth + delta;
      setResultsWidth(Math.min(Math.max(newWidth, 280), window.innerWidth - 400));
    };
    const onUp = () => {
      isResultsDragging.current = false;
      document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = ''; });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [resultsWidth]);

  const startDescResize = useCallback((e) => {
    e.preventDefault();
    isDescDragging.current = true;
    document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = 'none'; });
    const onMove = (ev) => {
      if (!isDescDragging.current || !mainAreaRef.current) return;
      const rect = mainAreaRef.current.getBoundingClientRect();
      const newWidth = ev.clientX - rect.left;
      setDescWidth(Math.min(Math.max(newWidth, 220), rect.width - 400));
    };
    const onUp = () => {
      isDescDragging.current = false;
      document.querySelectorAll('iframe').forEach(f => { f.style.pointerEvents = ''; });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  useEffect(() => {
    getAssignments()
      .then(setAssignments)
      .catch(console.error)
      .finally(() => setLoadingList(false));
    getStudentProgress().then(setProgress).catch(console.error);

    const interval = setInterval(() => {
      getAssignments()
        .then(fresh => {
          setAssignments(fresh);
          setSelectedAssignment(prev =>
            prev ? (fresh.find(a => a._id === prev._id) ?? prev) : null
          );
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleStart = async (assignment) => {
    setSelectedAssignment(assignment);
    setFiles([]);
    setSelectedFileName(null);
    setSubmissionId(null);
    setStatus(null);
    setResult(null);
    setSubmitError('');
    setFilesMessage(null);
    setCodePrefilled(false);
    setShowResults(false);
    setInfoTab('description');
    setActiveShot(0);
    setLightbox(null);
    setShowRunner(false);
    setShowTargetOutput(false);
    setEditorWidth(null);
    setTargetHtml('');
    setAvailableLibraries([]);
    setSelectedLibraryIds([]);
    setBottomTab('testcase');

    getAssignmentLibraries(assignment._id)
      .then(libs => setAvailableLibraries(Array.isArray(libs) ? libs : []))
      .catch(() => {});

    const p = progress[assignment._id];
    if (p?.attempts > 0) {
      setLoadingCode(true);
      try {
        const bestCode = await getBestCode(assignment._id);
        if (bestCode.files?.length > 0) {
          setFiles(bestCode.files);
          setSelectedFileName(bestCode.files[0].name);
          setCodePrefilled(true);
        }
      } catch (err) {
        console.error('Failed to load best code:', err.message);
      } finally {
        setLoadingCode(false);
      }
    }
  };

  const handleResetToDefault = () => {
    setConfirmDialog({
      title: 'Are you sure?',
      message: 'Your current code will be discarded and reset to the default code!',
      confirmLabel: 'Confirm',
      onConfirm: () => {
        const starterFiles = createStarterProject([]);
        setFiles(starterFiles);
        setSelectedFileName(starterFiles[0]?.name || null);
        setCodePrefilled(false);
      },
    });
  };

  const handleRetrieveLastSubmitted = () => {
    const p = selectedAssignment ? progress[selectedAssignment._id] : null;
    if (!p?.attempts) {
      setConfirmDialog({
        title: 'No Submission Found',
        message: 'You have not submitted any code for this assignment yet.',
        confirmLabel: null,
      });
      return;
    }
    setConfirmDialog({
      title: 'Are you sure?',
      message: 'Your code will be discarded and replaced with your last submission\'s code!',
      confirmLabel: 'Confirm',
      onConfirm: async () => {
        setLoadingCode(true);
        try {
          const bestCode = await getBestCode(selectedAssignment._id);
          if (bestCode.files?.length > 0) {
            setFiles(bestCode.files);
            setSelectedFileName(bestCode.files[0].name);
            setCodePrefilled(true);
          }
        } catch (err) {
          console.error('Failed to retrieve code:', err.message);
        } finally {
          setLoadingCode(false);
        }
      },
    });
  };

  const handleViewTargetOutput = async () => {
    if (showTargetOutput) { setShowTargetOutput(false); return; }
    if (targetHtml)        { setShowTargetOutput(true);  return; }
    setTargetLoading(true);
    try {
      const { html } = await getAssignmentPreview(selectedAssignment._id);
      setTargetHtml(html);
      setShowTargetOutput(true);
    } catch (err) {
      console.error('Failed to load target output:', err);
    } finally {
      setTargetLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!hasHtmlFile(files)) {
      setSubmitError('Upload at least one HTML file before submitting.');
      return;
    }
    setSubmitError('');
    setResult(null);
    setSubmissionId(null);
    setStatus('pending');
    setShowResults(false);
    try {
      const { submissionId: id } = await submitCode({ files, assignmentId: selectedAssignment._id, selectedLibraryIds });
      setSubmissionId(id);
    } catch (err) {
      setSubmitError(err.message);
      setStatus(null);
    }
  };

  useEffect(() => {
    if (!submissionId) return;
    const handler = async ({ submissionId: doneId }) => {
      if (doneId !== submissionId) return;
      const data = await getResult(doneId);
      if (data.status === 'done') {
        setStatus('done');
        setResult(data.result);
        setBottomTab('output');
        setShowResults(true);
        getStudentProgress().then(setProgress).catch(console.error);
      } else setStatus(data.status);
    };
    socket.on('evaluation:complete', handler);

    const poll = setInterval(async () => {
      try {
        const data = await getResult(submissionId);
        if (data.status === 'done') {
          clearInterval(poll);
          setStatus('done');
          setResult(data.result);
          setBottomTab('output');
          setShowResults(true);
        }
      } catch { /* ignore */ }
    }, 3000);

    return () => {
      socket.off('evaluation:complete', handler);
      clearInterval(poll);
    };
  }, [submissionId]);

  const handleFileChange = useCallback((fileName, value) => {
    setFiles((current) => updateProjectFileContent(current, fileName, value));
  }, []);

  const isEvaluating = status === 'pending' || status === 'processing';
  const testStats    = calcTestStats(result);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex overflow-hidden">

      {/* ── Q-STRIP SIDEBAR ── */}
      <aside
        className="shrink-0 bg-[var(--bg-surface-alt)] border-r border-[var(--border-color)] flex flex-col h-full overflow-hidden transition-[width] duration-200"
        style={{ width: sidebarCollapsed ? 44 : sidebarWidth }}
      >
        {/* Logo / toggle */}
        <div className={`px-3 py-3 border-b border-[var(--border-color)] flex items-center shrink-0 ${sidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
          <button
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2f80ed]/30 to-[#4e9af1]/10 border border-[#2f80ed]/30 flex items-center justify-center shrink-0 hover:border-[#4e9af1]/60 hover:from-[#2f80ed]/50 transition-all"
          >
            {sidebarCollapsed
              ? <svg className="w-3.5 h-3.5 text-[#4e9af1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              : <svg className="w-3.5 h-3.5 text-[#4e9af1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
          </button>
          {!sidebarCollapsed && <span className="text-xs font-bold text-[var(--text-strong)] truncate">Questions</span>}
        </div>

        {/* Search + filter — hidden when collapsed */}
        {!sidebarCollapsed && (
          <div className="px-2 pt-2.5 pb-1.5 space-y-1.5 shrink-0 border-b border-[var(--border-color)]">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                value={qSearch}
                onChange={e => setQSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-7 pr-2 py-1.5 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-md text-xs text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors"
              />
            </div>
            <div className="flex gap-1">
              {[['all', 'All'], ['done', 'Done'], ['pending', 'Pending']].map(([f, label]) => (
                <button
                  key={f}
                  onClick={() => setQFilter(f)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-semibold border transition-colors ${
                    qFilter === f
                      ? 'bg-[#4e9af1]/15 border-[#4e9af1] text-[#4e9af1]'
                      : 'bg-[var(--bg-base)] border-[var(--border-color)] text-[var(--text-faint)] hover:border-[var(--text-faintest)]'
                  }`}
                >{label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Question list — hidden when collapsed */}
        {!sidebarCollapsed && (
          <div className="flex-1 overflow-y-auto scrollbar-thin py-1.5 px-2 space-y-0.5">
            {loadingList ? (
              <div className="flex justify-center pt-4">
                <div className="w-5 h-5 rounded-full border-2 border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
              </div>
            ) : (() => {
              const filteredSidebarQ = assignments.filter((a, _i) => {
                const p = progress[a._id];
                const matchText = a.title.toLowerCase().includes(qSearch.toLowerCase());
                const matchFilter = qFilter === 'all' ? true : qFilter === 'done' ? p?.completed : !p?.completed;
                return matchText && matchFilter;
              });
              if (filteredSidebarQ.length === 0) {
                return <p className="text-[10px] text-[var(--text-faintest)] text-center pt-6">No matches</p>;
              }
              return filteredSidebarQ.map((a) => {
                const globalIdx = assignments.indexOf(a);
                const p           = progress[a._id];
                const isCompleted = p?.completed;
                const isActive    = selectedAssignment?._id === a._id;
                return (
                  <button
                    key={a._id}
                    onClick={() => handleStart(a)}
                    title={a.title}
                    className={`relative w-full text-left px-2.5 py-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-[#2f80ed]/20 border border-[#4e9af1]/50'
                        : isCompleted
                          ? 'border border-[#3fb950]/20 hover:bg-[#3fb950]/10'
                          : 'border border-transparent hover:bg-[var(--bg-surface)] '
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] font-black shrink-0 ${isActive ? 'text-[#4e9af1]' : isCompleted ? 'text-[#3fb950]' : 'text-[var(--text-faint)]'}`}>
                        Q{globalIdx + 1}
                      </span>
                      <span className={`text-[11px] font-medium truncate flex-1 ${isActive ? 'text-[#4e9af1]' : isCompleted ? 'text-[#3fb950]' : 'text-[var(--text-muted)]'}`}>
                        {a.title}
                      </span>
                      {isCompleted && (
                        <span className="shrink-0 w-4 h-4 bg-[#3fb950]/20 rounded-full flex items-center justify-center text-[8px] text-[#3fb950] font-black">✓</span>
                      )}
                      {p?.bestScore != null && !isCompleted && (
                        <span className="shrink-0 text-[9px] font-bold text-[#f0a500]">{p.bestScore}</span>
                      )}
                    </div>
                  </button>
                );
              });
            })()}
          </div>
        )}

        {/* Spacer when collapsed so bottom icons sit at the bottom */}
        {sidebarCollapsed && <div className="flex-1" />}

        {/* Bottom icons */}
        <div className="border-t border-[var(--border-color)] px-1.5 py-2.5 space-y-0.5 shrink-0">
          <button
            onClick={() => { setSelectedAssignment(null); setView('leaderboard'); }}
            title="Leaderboard"
            className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all ${
              !selectedAssignment && view === 'leaderboard'
                ? 'text-[#4e9af1] bg-[#4e9af1]/10'
                : 'text-[var(--text-faint)] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10'
            }`}
          >
            <FiBarChart2 size={14} className="shrink-0" />
            {!sidebarCollapsed && <span className="text-xs font-medium">Leaderboard</span>}
          </button>
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[var(--text-faint)] hover:text-[#bbb] hover:bg-[var(--bg-surface-alt)] transition-all"
          >
            {theme === 'dark' ? <FiSun size={14} className="shrink-0" /> : <FiMoon size={14} className="shrink-0" />}
            {!sidebarCollapsed && <span className="text-xs font-medium">{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
          </button>
          <button
            onClick={logout}
            title="Sign Out"
            className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[var(--text-faint)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-all"
          >
            <FiLogOut size={14} className="shrink-0" />
            {!sidebarCollapsed && <span className="text-xs font-medium">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* ── SIDEBAR DRAG HANDLE ── */}
      <div
        onMouseDown={startSidebarResize}
        className="w-1 shrink-0 cursor-col-resize hover:bg-[#4e9af1]/40 active:bg-[#4e9af1]/60 transition-colors"
      />

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">

        {/* ── Leaderboard view ── */}
        {!selectedAssignment && view === 'leaderboard' && (
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-6 py-3 flex items-center gap-3">
              <button onClick={() => setView('list')} className="text-[var(--text-faint)] hover:text-[#4e9af1] transition-colors">
                <FiArrowLeft size={16} />
              </button>
              <span className="text-base font-bold text-[var(--text-strong)]">🏆 Leaderboard</span>
              <span className="ml-auto text-xs font-medium text-[#4e9af1] truncate max-w-[140px]">{user?.name}</span>
            </div>
            <main className="px-6 py-6 max-w-xl mx-auto">
              <StudentLeaderboardView currentUser={user} onBack={() => setView('list')} />
            </main>
          </div>
        )}

        {/* ── Assignment list ── */}
        {!selectedAssignment && view === 'list' && (() => {
          const filteredGrid = assignments.filter(a => {
            const p = progress[a._id];
            const matchText = a.title.toLowerCase().includes(gridSearch.toLowerCase());
            const matchFilter = gridFilter === 'all' ? true : gridFilter === 'done' ? p?.completed : !p?.completed;
            return matchText && matchFilter;
          });
          const totalGridPages = Math.max(1, Math.ceil(filteredGrid.length / GRID_PAGE_SIZE));
          const pagedAssignments = filteredGrid.slice((gridPage - 1) * GRID_PAGE_SIZE, gridPage * GRID_PAGE_SIZE);
          return (
            <div className="flex-1 overflow-y-auto">
              <div className="sticky top-0 z-10 bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-6 py-3 flex items-center gap-3">
                <h1 className="font-bold text-[var(--text-strong)] text-sm">Available Assignments</h1>
                <span className="ml-auto text-xs text-[#4e9af1] font-medium">{user?.name}</span>
              </div>
              <main className="px-8 py-8">
                {loadingList ? (
                  <div className="flex justify-center py-20">
                    <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
                  </div>
                ) : assignments.length === 0 ? (
                  <p className="text-[var(--text-faint)] text-center py-20">No assignments available yet.</p>
                ) : (
                  <>
                    {/* Search + filter toolbar */}
                    <div className="flex flex-wrap items-center gap-3 mb-6">
                      <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-faint)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                        </svg>
                        <input
                          type="text"
                          value={gridSearch}
                          onChange={e => { setGridSearch(e.target.value); setGridPage(1); }}
                          placeholder="Search assignments…"
                          className="w-full pl-9 pr-3 py-2 bg-[var(--bg-base)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--text-faintest)] focus:outline-none focus:border-[#4e9af1] transition-colors"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        {[['all', 'All'], ['done', 'Completed'], ['pending', 'Pending']].map(([f, label]) => (
                          <button
                            key={f}
                            onClick={() => { setGridFilter(f); setGridPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                              gridFilter === f
                                ? 'bg-[#4e9af1]/15 border-[#4e9af1] text-[#4e9af1]'
                                : 'bg-[var(--bg-surface-alt)] border-[var(--border-color)] text-[var(--text-faint)] hover:border-[var(--text-faintest)]'
                            }`}
                          >{label}</button>
                        ))}
                      </div>
                      <span className="text-xs text-[var(--text-faint)] ml-auto">{filteredGrid.length} of {assignments.length} assignments</span>
                    </div>

                    {filteredGrid.length === 0 ? (
                      <p className="text-[var(--text-faint)] text-center py-20">No assignments match your search.</p>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {pagedAssignments.map(a => (
                            <AssignmentCard key={a._id} a={a} progress={progress} onStart={handleStart} />
                          ))}
                        </div>

                        {/* Pagination footer */}
                        {totalGridPages > 1 && (
                          <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-[var(--border-color)]">
                            <button
                              onClick={() => setGridPage(p => Math.max(1, p - 1))}
                              disabled={gridPage === 1}
                              className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >← Prev</button>
                            <span className="text-xs text-[var(--text-faint)]">Page {gridPage} of {totalGridPages}</span>
                            <button
                              onClick={() => setGridPage(p => Math.min(totalGridPages, p + 1))}
                              disabled={gridPage === totalGridPages}
                              className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-muted)] hover:text-[var(--text-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >Next →</button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </main>
            </div>
          );
        })()}

        {/* ── Editor view ── */}
        {selectedAssignment && (() => {
          const p           = progress[selectedAssignment._id];
          const isCompleted = p?.completed;

          return (
            <div className="flex flex-1 min-h-0 overflow-hidden" ref={mainAreaRef}>

              {/* ── DESCRIPTION PANEL ── */}
              <aside
                className="shrink-0 flex flex-col overflow-hidden border-r border-[var(--border-color)] bg-[var(--bg-surface)]"
                style={{ width: descWidth ?? 360 }}
              >
                {/* Tab bar — pill buttons matching reference design */}
                <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
                  {/* Back to assignments */}
                  <button
                    onClick={() => setSelectedAssignment(null)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-faint)] hover:text-[#4e9af1] transition-colors self-start"
                  >
                    <FiArrowLeft size={13} />
                    Back to Assignments
                  </button>
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => setInfoTab('description')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      infoTab === 'description'
                        ? 'bg-[#2563eb] text-white shadow-sm'
                        : 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-strong)]'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Description
                  </button>
                  <button
                    onClick={() => setInfoTab('progress')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      infoTab === 'progress'
                        ? 'bg-[#2563eb] text-white shadow-sm'
                        : 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-strong)]'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Submission{p?.attempts > 0 ? ` (${p.attempts})` : ''}
                  </button>
                  </div>
                </div>

                {/* Description tab */}
                {infoTab === 'description' && (
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-6 pt-5 pb-8">

                      {/* Title */}
                      <h2 className="text-xl font-bold text-[var(--text-strong)] mb-2 leading-tight">
                        {selectedAssignment.title}
                      </h2>

                      {/* Points badge */}
                      <div className="flex items-center mb-5">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-[#fef3c7] border border-[#fde68a] text-[#92400e]">
                          <svg className="w-4 h-4 text-[#f59e0b]" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                          {p?.bestScore ?? 0} Points
                        </span>
                      </div>

                      {/* Reference Screenshots Gallery */}
                      {(() => {
                        const pageShots = (selectedAssignment.referencePageScreenshots?.length > 0)
                          ? selectedAssignment.referencePageScreenshots
                          : (selectedAssignment.referenceScreenshots?.length > 0)
                            ? selectedAssignment.referenceScreenshots.map((url, index) => ({
                                pageName: `Reference ${index + 1}`, url, isMain: index === 0
                              }))
                            : selectedAssignment.referenceScreenshotUrl
                              ? [{ pageName: 'Main page', url: selectedAssignment.referenceScreenshotUrl, isMain: true }]
                              : [];

                        if (pageShots.length === 0) return null;

                        return (
                          <div className="mb-5">
                            <div
                              className="relative rounded-lg border border-[var(--border-color)] overflow-hidden group bg-black"
                              style={{ height: '170px' }}
                            >
                              <img
                                src={pageShots[activeShot]?.url}
                                alt={`Reference state ${activeShot + 1}`}
                                className="w-full h-full object-cover object-top cursor-zoom-in"
                                onClick={() => setLightbox(pageShots[activeShot]?.url)}
                              />
                              <span className="absolute top-2 left-2 text-[10px] font-bold text-[var(--text-strong)] bg-black/60 px-2 py-0.5 rounded-full">
                                {formatReferenceShotLabel(pageShots[activeShot], activeShot)}
                              </span>
                              <a
                                href={pageShots[activeShot]?.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 text-[10px] font-semibold text-[var(--text-strong)] bg-black/60 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                              >
                                ↗ Full size
                              </a>
                              {pageShots.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setActiveShot(i => (i - 1 + pageShots.length) % pageShots.length)}
                                    className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-[var(--text-strong)] flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
                                  >‹</button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveShot(i => (i + 1) % pageShots.length)}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-[var(--text-strong)] flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
                                  >›</button>
                                </>
                              )}
                            </div>

                            {pageShots.length > 1 && (
                              <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-thin">
                                {pageShots.map((shot, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => setActiveShot(i)}
                                    className={`shrink-0 relative overflow-hidden rounded border transition-all ${
                                      activeShot === i
                                        ? 'border-[#4e9af1] ring-1 ring-[#4e9af1]/40'
                                        : 'border-[var(--border-color)] opacity-60 hover:opacity-90'
                                    }`}
                                    style={{ width: '60px', height: '40px' }}
                                  >
                                    <img src={shot.url} alt={`Page ${i + 1}`} className="w-full h-full object-cover object-top" />
                                    <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold text-[var(--text-strong)] bg-black/60 leading-tight py-0.5">
                                      {shot.captureLabel || shot.pageName || `${i + 1}`}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <p className="text-[10px] text-[var(--text-faintest)] mt-1.5">
                              Reference design · {pageShots.length} page{pageShots.length !== 1 ? 's' : ''}
                            </p>

                            {lightbox && (
                              <div
                                className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                                onClick={() => setLightbox(null)}
                              >
                                <img
                                  src={lightbox}
                                  alt="Full size reference"
                                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                  onClick={e => e.stopPropagation()}
                                />
                                <button
                                  type="button"
                                  onClick={() => setLightbox(null)}
                                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 text-sm"
                                >✕</button>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Description prose */}
                      {selectedAssignment.description ? (
                        <div
                          className="text-sm text-[var(--text-muted)] leading-[1.8] whitespace-pre-line"
                          style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
                        >
                          {selectedAssignment.description}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--text-faintest)] italic">No description provided.</p>
                      )}

                      {/* Library picker */}
                      {availableLibraries.length > 0 && (
                        <div className="mt-5 pt-4 border-t border-[var(--border-color)]">
                          <p className="text-[11px] font-semibold text-[var(--text-faint)] uppercase tracking-wider mb-2">
                            Available Libraries
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {availableLibraries.map(lib => (
                              <label
                                key={lib.id}
                                className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer select-none hover:text-[var(--text-strong)] transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  className="accent-[#4e9af1]"
                                  checked={selectedLibraryIds.includes(lib.id)}
                                  onChange={e => setSelectedLibraryIds(ids =>
                                    e.target.checked ? [...ids, lib.id] : ids.filter(id => id !== lib.id)
                                  )}
                                />
                                <span className="font-medium">{lib.name}</span>
                                <span className="text-[var(--text-faintest)]">v{lib.version}</span>
                              </label>
                            ))}
                          </div>
                          <p className="text-[10px] text-[var(--text-faintest)] mt-2">
                            Selected libraries will be available when your code runs.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Submission / Progress tab */}
                {infoTab === 'progress' && (
                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    {p?.attempts > 0 ? (
                      <div className="flex flex-col gap-6">
                        <div className="text-center py-4">
                          <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider mb-1">Best Score</p>
                          <p className={`text-4xl font-black ${isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]'}`}>
                            {p.bestScore}
                            <span className="text-xl text-[var(--text-faintest)] font-normal">/100</span>
                          </p>
                          <p className={`text-xs font-semibold mt-1 ${isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]'}`}>
                            {isCompleted ? '✓ Completed' : 'In Progress'}
                          </p>
                        </div>
                        <div>
                          <div className="w-full bg-[var(--bg-surface-alt)] rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${p.bestScore}%`, background: isCompleted ? '#3fb950' : '#f0a500' }}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-3">
                          {[
                            { label: 'Submissions', value: p.attempts },
                            { label: 'Best Score',  value: `${p.bestScore}/100` },
                            { label: 'Status',      value: isCompleted ? 'Completed' : 'In Progress' },
                          ].map(row => (
                            <div key={row.label} className="flex justify-between items-center border-b border-[var(--bg-surface-alt)] pb-3">
                              <span className="text-sm text-[var(--text-faint)]">{row.label}</span>
                              <span className={`text-sm font-semibold ${row.label === 'Status' ? (isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]') : 'text-[var(--text-strong)]'}`}>
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-[var(--text-faintest)] leading-relaxed">
                          Resubmit anytime — only your best score is saved.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                        <p className="text-[var(--text-faint)] text-sm font-medium">No submissions yet</p>
                        <p className="text-[#333] text-xs">Write your solution and hit Submit.</p>
                      </div>
                    )}
                  </div>
                )}
              </aside>

              {/* Desc/Editor drag handle */}
              <div
                onMouseDown={startDescResize}
                className="w-1.5 shrink-0 cursor-col-resize bg-[var(--border-color)] hover:bg-[#4e9af1] active:bg-[#4e9af1] transition-colors z-10"
                title="Drag to resize"
              />

              {/* ── EDITOR + TOOLBAR + BOTTOM ── */}
              <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

                {/* ── TOOLBAR ── */}
                <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
                  {/* Language pill */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-lg text-xs font-semibold text-[var(--text-muted)] select-none">
                    {getActiveLanguage(files, selectedFileName)}
                    <svg className="w-3 h-3 ml-0.5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M6 9l6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="w-px h-5 bg-[var(--border-color)]" />

                  {/* Icon buttons */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={toggleTheme}
                      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                      className="w-8 h-8 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-surface-alt)] flex items-center justify-center transition-all"
                    >
                      {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
                    </button>
                    <button
                      onClick={() => { setShowRunner(false); setTimeout(() => setShowRunner(true), 60); }}
                      disabled={!hasHtmlFile(files) || !showRunner}
                      title="Reload preview"
                      className="w-8 h-8 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-surface-alt)] flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <FiRefreshCcw size={14} />
                    </button>
                    <button
                      onClick={handleViewTargetOutput}
                      disabled={targetLoading}
                      title={showTargetOutput ? 'Close target output' : 'View target output'}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm disabled:opacity-40 ${
                        showTargetOutput
                          ? 'text-[#4e9af1] bg-[#4e9af1]/10'
                          : 'text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-surface-alt)]'
                      }`}
                    >
                      {targetLoading
                        ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                        : '🎯'}
                    </button>
                    <button
                      onClick={() => setShowSettings(true)}
                      title="Editor settings"
                      className="w-8 h-8 rounded-lg text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--bg-surface-alt)] flex items-center justify-center transition-all"
                    >
                      <FiSettings size={14} />
                    </button>
                    <button
                      onClick={handleResetToDefault}
                      disabled={!selectedAssignment || loadingCode}
                      title="Reset to default code definition"
                      className="w-8 h-8 rounded-lg text-[var(--text-faint)] hover:text-[#f0a500] hover:bg-[#f0a500]/10 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <FiRotateCcw size={14} />
                    </button>
                    <button
                      onClick={handleRetrieveLastSubmitted}
                      disabled={!selectedAssignment || loadingCode}
                      title="Retrieve last submitted code"
                      className="w-8 h-8 rounded-lg text-[var(--text-faint)] hover:text-[#3fb950] hover:bg-[#3fb950]/10 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <FiClock size={14} />
                    </button>
                  </div>

                  <div className="flex-1" />

                  {/* Score badge after evaluation */}
                  {status === 'done' && result && (
                    <button
                      onClick={() => setShowResults(s => !s)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        showResults
                          ? 'bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/30'
                          : 'bg-[var(--bg-surface-alt)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-strong)]'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                      {result.totalScore}/100
                    </button>
                  )}

                  {submitError && (
                    <p className="text-xs text-[#f85149] max-w-[180px] truncate">{submitError}</p>
                  )}

                  {/* ▶ Run */}
                  <button
                    onClick={() => setShowRunner(s => !s)}
                    disabled={!hasHtmlFile(files) || loadingCode}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      showRunner
                        ? 'bg-[#166534] border border-[#4ade80]/30 text-[#4ade80] hover:bg-[#14532d]'
                        : 'bg-[#16a34a] text-white hover:bg-[#15803d] shadow-[0_0_14px_rgba(22,163,74,0.25)]'
                    }`}
                  >
                    {showRunner ? '◼ Stop' : '▶ Run'}
                  </button>

                  {/* ☁ Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={isEvaluating || loadingCode}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-all shadow-[0_0_14px_rgba(37,99,235,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {isEvaluating ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Evaluating…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Submit
                      </>
                    )}
                  </button>
                </div>

                {/* ── CODE AREA (editor + side panels) ── */}
                <div className="flex-1 min-h-0 flex overflow-hidden" ref={codeAreaRef}>

                  {/* Main editor column */}
                  <div
                    className="flex flex-col overflow-hidden min-w-0"
                    style={
                      (showRunner || showTargetOutput) && editorWidth
                        ? { width: editorWidth, flexShrink: 0 }
                        : (showRunner || showTargetOutput)
                          ? { width: 'min(50%, 600px)', flexShrink: 0 }
                          : { flex: '1 1 0' }
                    }
                  >

                    {/* Prefill banner */}
                    {codePrefilled && (
                      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#3fb950]/10 border-b border-[#3fb950]/20 z-10">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#3fb950]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          <span className="text-xs text-[#3fb950] font-semibold">Loaded from your best submission — edit and resubmit to improve your score</span>
                        </div>
                        <button onClick={() => setCodePrefilled(false)} className="text-[#3fb950]/60 hover:text-[#3fb950] text-xs">✕</button>
                      </div>
                    )}

                    {loadingCode ? (
                      <div className="flex-1 flex items-center justify-center bg-[var(--bg-surface)]">
                        <div className="flex flex-col items-center gap-3 text-[var(--text-faint)]">
                          <div className="w-6 h-6 rounded-full border-2 border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
                          <p className="text-xs">Loading your best submission…</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="shrink-0 px-4 py-3 sm:px-5 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
                          <MultiFileUpload
                            files={files}
                            onChange={(nextFiles) => {
                              setFiles(nextFiles);
                              if (!nextFiles.some(f => f.name === selectedFileName)) {
                                setSelectedFileName(nextFiles[0]?.name || null);
                              }
                            }}
                            onMessage={setFilesMessage}
                            disabled={isEvaluating}
                            showDropZone={false}
                          />
                          {filesMessage && (
                            <p className={`text-xs mt-2 ${filesMessage.tone === 'error' ? 'text-[#f85149]' : filesMessage.tone === 'success' ? 'text-[#3fb950]' : 'text-[var(--text-faint)]'}`}>
                              {filesMessage.message}
                            </p>
                          )}
                        </div>
                        <CodeEditor
                          files={files}
                          selectedFileName={selectedFileName}
                          onSelectFile={setSelectedFileName}
                          onChange={handleFileChange}
                          onRemove={(fileName) => {
                            const nextFiles = removeProjectFile(files, fileName);
                            setFiles(nextFiles);
                            if (selectedFileName === fileName) setSelectedFileName(nextFiles[0]?.name || null);
                          }}
                          isDark={editorSettings.editorTheme === 'dark'}
                          fontSize={editorSettings.fontSize}
                          autoComplete={editorSettings.autoComplete}
                          readOnly={editorSettings.readOnly || isEvaluating}
                        />
                      </>
                    )}
                  </div>

                  {/* Drag handle */}
                  {(showRunner || showTargetOutput) && (
                    <div
                      onMouseDown={startResize}
                      className="w-1.5 shrink-0 cursor-col-resize bg-[var(--border-color)] hover:bg-[#4e9af1] transition-colors active:bg-[#4e9af1] z-10"
                      title="Drag to resize"
                    />
                  )}

                  {/* Runner panel */}
                  <div className={`flex flex-col overflow-hidden transition-all duration-300 ${showRunner ? 'flex-1 min-w-[280px] border-l border-[var(--border-color)]' : 'w-0 opacity-0 pointer-events-none'}`}>
                    <LiveRunner
                      files={files}
                      assignment={selectedAssignment}
                      isVisible={showRunner}
                      onClose={() => setShowRunner(false)}
                    />
                  </div>

                  {/* Target output panel */}
                  <div className={`flex flex-col overflow-hidden transition-all duration-300 ${showTargetOutput ? 'flex-1 min-w-[280px] border-l border-[var(--border-color)]' : 'w-0 opacity-0 pointer-events-none'}`}>
                    {showTargetOutput && (
                      <div className={`flex flex-col bg-[var(--bg-surface)] ${targetFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
                        <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-[var(--bg-surface-alt)] border-b border-[var(--border-color)]">
                          <span className="text-sm font-semibold text-[var(--text-strong)]">🎯 Target Output</span>
                          <div className="flex items-center gap-3">
                            {targetStopped ? (
                              <button
                                onClick={() => setTargetStopped(false)}
                                title="Run"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#3fb950]/15 border border-[#3fb950]/40 text-[#3fb950] hover:bg-[#3fb950]/25 transition-all"
                              >▶ Run</button>
                            ) : (
                              <button
                                onClick={() => setTargetStopped(true)}
                                title="Stop"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#f85149]/15 border border-[#f85149]/40 text-[#f85149] hover:bg-[#f85149]/25 transition-all"
                              >■ Stop</button>
                            )}
                            <button
                              onClick={() => setTargetFullscreen(f => !f)}
                              title={targetFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                              className="w-6 h-6 rounded flex items-center justify-center text-sm text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--border-color)] transition-colors"
                            >
                              {targetFullscreen ? '⤡' : '⤢'}
                            </button>
                            <button
                              onClick={() => { setTargetFullscreen(false); setTargetStopped(false); setShowTargetOutput(false); }}
                              title="Close"
                              className="w-6 h-6 rounded flex items-center justify-center text-sm text-[var(--text-faint)] hover:text-[var(--text-strong)] hover:bg-[var(--border-color)] transition-colors"
                            >✕</button>
                          </div>
                        </div>
                        <div className="flex-1 min-h-0 bg-white">
                          {targetStopped ? (
                            <div className="w-full h-full flex items-center justify-center bg-[var(--bg-surface)] text-[var(--text-faintest)] text-sm">Stopped</div>
                          ) : targetHtml ? (
                            <iframe srcDoc={targetHtml} sandbox="allow-scripts" title="Target Output" className="w-full h-full border-none block" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[var(--text-faintest)] text-sm">Loading…</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Results slide-in panel */}
                  {showResults && status === 'done' && result && (
                    <aside
                      ref={resultsAreaRef}
                      className="relative shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col overflow-hidden"
                      style={{ width: resultsWidth, minWidth: 280, animation: 'slideInRight 0.25s ease-out' }}
                    >
                      {/* Drag handle */}
                      <div
                        onMouseDown={startResultsResize}
                        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#4e9af1]/40 transition-colors z-10"
                      />
                      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[var(--bg-surface-alt)] border-b border-[var(--border-color)] shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#4e9af1] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                          <span className="text-sm font-bold text-[var(--text-strong)] truncate">Evaluation Results</span>
                          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${result.totalScore >= 50 ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#f85149]/20 text-[#f85149]'}`}>
                            {result.totalScore}/100
                          </span>
                        </div>
                        <button
                          onClick={() => setShowResults(false)}
                          className="w-7 h-7 rounded-lg bg-[var(--border-color)] hover:bg-[var(--bg-surface-alt)] text-[var(--text-muted)] hover:text-[var(--text-strong)] flex items-center justify-center text-xs transition-colors shrink-0"
                        >✕</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        <ResultsPanel status={status} result={result} />
                      </div>
                    </aside>
                  )}
                </div>


              </div>
            </div>
          );
        })()}
      </div>

      <GeminiChatbot />

      {/* ── Confirmation dialog ── */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setConfirmDialog(null)}
        >
          <div
            className="w-[360px] max-w-[92vw] rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--bg-surface-alt)', border: '1px solid var(--border-color)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon + title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#16a34a] flex items-center justify-center shrink-0">
                <span className="text-white text-lg font-bold">i</span>
              </div>
              <p className="text-base font-bold" style={{ color: 'var(--text-strong)' }}>
                {confirmDialog.title}
              </p>
            </div>

            {/* Message */}
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {confirmDialog.message}
            </p>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-1">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ background: 'var(--border-color)', color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                onMouseLeave={e => e.currentTarget.style.filter = ''}
              >
                {confirmDialog.confirmLabel ? 'Cancel' : 'OK'}
              </button>
              {confirmDialog.confirmLabel && (
                <button
                  onClick={() => { confirmDialog.onConfirm?.(); setConfirmDialog(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#16a34a] text-white transition-all hover:bg-[#15803d]"
                >
                  {confirmDialog.confirmLabel}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDITOR SETTINGS MODAL ── */}
      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-8 w-[500px] max-w-[95vw]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-800 mb-7">Editor Setting</h2>

            {/* Font Size */}
            <div className="flex items-start justify-between gap-6 mb-7">
              <div className="flex-1">
                <p className="font-semibold text-gray-800 mb-1">Font Size</p>
                <p className="text-sm text-gray-500 leading-relaxed">Choose your preferred font size for the code editor.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {['Small', 'Medium', 'Large'].map(size => (
                  <button
                    key={size}
                    onClick={() => setEditorSettings(s => ({ ...s, fontSize: size.toLowerCase() }))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      editorSettings.fontSize === size.toLowerCase()
                        ? 'bg-[#16a34a] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="flex items-start justify-between gap-6 mb-7">
              <div className="flex-1">
                <p className="font-semibold text-gray-800 mb-1">Theme</p>
                <p className="text-sm text-gray-500 leading-relaxed">Choose your preferred theme for the code editor..</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {['Light', 'Dark'].map(t => {
                  const val = t === 'Dark' ? 'dark' : 'light';
                  const isActive = editorSettings.editorTheme === val;
                  return (
                    <button
                      key={t}
                      onClick={() => setEditorSettings(s => ({ ...s, editorTheme: val }))}
                      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        isActive ? 'bg-[#16a34a] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Code Suggestions */}
            <div className="flex items-start justify-between gap-6 mb-7">
              <div className="flex-1">
                <p className="font-semibold text-gray-800 mb-1">Code Suggestions</p>
                <p className="text-sm text-gray-500 leading-relaxed">Allow Editor to show code suggestation</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => setEditorSettings(s => ({ ...s, autoComplete: val }))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      editorSettings.autoComplete === val
                        ? 'bg-[#16a34a] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {val ? 'True' : 'False'}
                  </button>
                ))}
              </div>
            </div>

            {/* Read Only */}
            <div className="flex items-start justify-between gap-6 mb-8">
              <div className="flex-1">
                <p className="font-semibold text-gray-800 mb-1">Read Only Mode</p>
                <p className="text-sm text-gray-500 leading-relaxed">You are not able to write code.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {[true, false].map(val => (
                  <button
                    key={String(val)}
                    onClick={() => setEditorSettings(s => ({ ...s, readOnly: val }))}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      editorSettings.readOnly === val
                        ? 'bg-[#16a34a] text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {val ? 'True' : 'False'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-7 py-2.5 bg-[#2563eb] text-white rounded-xl text-sm font-semibold hover:bg-[#1d4ed8] transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
