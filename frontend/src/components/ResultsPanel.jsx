import { VisualDiffViewer } from './VisualDiffViewer.jsx';
import {
  MdCode, MdFunctions, MdMouse, MdImage, MdSpeed,
  MdLightbulb, MdCheckCircle, MdWarning, MdError,
  MdTrendingUp, MdAnalytics, MdStar, MdBolt
} from 'react-icons/md';
import {
  FiTarget, FiAward, FiZap, FiEye, FiSettings, FiSearch
} from 'react-icons/fi';


// ── Bucket display config ──────────────────────────────────────────────────
const BUCKETS = [
  { key: 'linter', label: 'Linter Quality', max: 10 },
  { key: 'functionality', label: 'Functionality (Behavior)', max: 40 },
  { key: 'interaction', label: 'Interaction Tests', max: 15 },
  { key: 'visual', label: 'Visual Layout Match', max: 20 },
  { key: 'performance', label: 'Performance', max: 15 },
];

function scoreColor(pct) {
  return pct >= 80 ? '#3fb950' : pct >= 50 ? '#f0a500' : '#f85149';
}

// ── SVG Radar Chart ────────────────────────────────────────────────────────
function RadarChart({ breakdown }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 78;
  const levels = 4;
  const axes = BUCKETS.length;

  // Angle for each axis (starting from top, going clockwise)
  const angle = (i) => (Math.PI * 2 * i) / axes - Math.PI / 2;

  const pt = (i, radius) => ({
    x: cx + radius * Math.cos(angle(i)),
    y: cy + radius * Math.sin(angle(i))
  });

  // Grid polygons
  const gridLevels = Array.from({ length: levels }, (_, l) => {
    const ri = (r * (l + 1)) / levels;
    return Array.from({ length: axes }, (_, i) => pt(i, ri))
      .map(p => `${p.x},${p.y}`).join(' ');
  });

  // Data polygon
  const dataPoints = BUCKETS.map(({ key, max }, i) => {
    const b = breakdown?.[key];
    const sc = b?.score ?? 0;
    const pct = max > 0 ? sc / max : 0;
    return pt(i, r * pct);
  });
  const dataPolygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Colors for each data point
  const dotColors = BUCKETS.map(({ key, max }) => {
    const b = breakdown?.[key];
    const sc = b?.score ?? 0;
    const pct = max > 0 ? (sc / max) * 100 : 0;
    return scoreColor(pct);
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid lines */}
      {gridLevels.map((pts, l) => (
        <polygon key={l} points={pts}
          fill="none" stroke="#2a2a4a" strokeWidth="1" />
      ))}
      {/* Axis spokes */}
      {Array.from({ length: axes }, (_, i) => {
        const end = pt(i, r);
        return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
          stroke="#2a2a4a" strokeWidth="1" />;
      })}
      {/* Data polygon fill */}
      <polygon points={dataPolygon}
        fill="rgba(47,128,237,0.15)" stroke="#4e9af1" strokeWidth="1.5"
        strokeLinejoin="round" />
      {/* Data dots */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={dotColors[i]} stroke="#0f0f1a" strokeWidth="1.5" />
      ))}
      {/* Axis labels */}
      {BUCKETS.map(({ label }, i) => {
        const labelPt = pt(i, r + 16);
        const shortLabel = label.split(' ')[0]; // first word only
        return (
          <text key={i} x={labelPt.x} y={labelPt.y}
            textAnchor="middle" dominantBaseline="middle"
            fill="#888" fontSize="8" fontFamily="system-ui">
            {shortLabel}
          </text>
        );
      })}
    </svg>
  );
}

// ── Bar Chart ──────────────────────────────────────────────────────────────
function ScoreBarChart({ breakdown }) {
  return (
    <div className="space-y-2">
      {BUCKETS.map(({ key, label, max }) => {
        const b = breakdown?.[key];
        const sc = b?.score ?? 0;
        const pct = max > 0 ? (sc / max) * 100 : 0;
        const col = scoreColor(pct);
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
              <span className="text-[10px] font-bold" style={{ color: col }}>{sc}/{max}</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: col }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Smart Suggestions ──────────────────────────────────────────────────────
// Icon components for each category (used in chips + suggestion cards)
const CATEGORY_ICONS = {
  linter: <FiSearch size={13} />,
  functionality: <MdFunctions size={13} />,
  interaction: <MdMouse size={13} />,
  visual: <FiEye size={13} />,
  performance: <MdBolt size={13} />,
};

const SUGGESTIONS = {
  linter: {
    title: 'Code Quality',
    icon: CATEGORY_ICONS.linter,
    tips: {
      low: [
        'Fix all HTMLHint errors — close unclosed tags, use valid attributes, and add required elements like `<title>` and `<lang>`.',
        'Stylelint flags invalid CSS — remove duplicate properties, use shorthand where possible, and avoid `!important`.',
        'ESLint errors indicate JavaScript issues — fix undeclared variables, use `const`/`let` instead of `var`, and avoid unused code.',
        'Run your HTML through the W3C Validator to catch structural problems.',
      ],
      mid: [
        'Clean up trailing semicolons and fix remaining ESLint warnings.',
        'Remove unused CSS rules and consolidate repeated styles into classes.',
        'Add `alt` attributes to all images and semantic HTML5 tags (`<header>`, `<main>`, `<footer>`).',
      ],
      good: ['Great code quality! Keep using semantic HTML and avoiding lint errors.']
    }
  },
  functionality: {
    title: 'Functionality',
    icon: CATEGORY_ICONS.functionality,
    tips: {
      low: [
        'Review which test cases failed — look at the ✗ items and their failure hints below.',
        'Ensure required DOM elements exist with the correct IDs, classes, and tag types.',
        'Check that event listeners are attached correctly (`addEventListener` or inline `onclick`).',
        'JavaScript logic errors — trace through your code step by step in browser DevTools.',
      ],
      mid: [
        'Some test cases are failing — read each failure hint carefully.',
        'Verify that outputs update correctly when inputs change (e.g., watching for keyup or input events).',
        'Test edge cases: empty inputs, zero values, and boundary conditions.',
      ],
      good: ['Functionality is solid! All or most behavior requirements are met.']
    }
  },
  interaction: {
    title: 'Interaction',
    icon: CATEGORY_ICONS.interaction,
    tips: {
      low: [
        'Interaction tests simulate clicks and typing — make sure buttons are clickable and inputs are writable.',
        'Check that your UI reacts correctly after user events (button clicks should update state/text).',
        'Don\'t hide elements with `display:none` that the tests try to interact with.',
        'Use `id` attributes exactly as required — interaction tests target specific elements by ID.',
      ],
      mid: [
        'Some interactions are not responding as expected — check event propagation.',
        'Ensure that async operations complete before DOM updates (avoid race conditions).',
      ],
      good: ['All interaction tests passed — excellent UX responsiveness!']
    }
  },
  visual: {
    title: 'Visual Layout',
    icon: CATEGORY_ICONS.visual,
    tips: {
      low: [
        'Your layout looks significantly different from the reference — compare screenshots in the diff viewer below.',
        'Match the overall structure: check element positions, sizes, colors, and spacing.',
        'Use the reference screenshot as a guide — implement the same flexbox/grid layout.',
        'Check font sizes, weights, and colors — use `color`, `font-size`, `font-weight` to match.',
        'Ensure elements are not overflowing or wrapping unexpectedly — add `overflow: hidden` or `white-space: nowrap` where needed.',
      ],
      mid: [
        'Close! Minor layout differences remain — compare the diff image carefully for shifted elements.',
        'Check padding and margin values — a few pixels off can cause noticeable shift.',
        'Ensure background colors and border styles match the reference.',
      ],
      good: ['Visual layout is nearly identical to the reference — great attention to detail!']
    }
  },
  performance: {
    title: 'Performance',
    icon: CATEGORY_ICONS.performance,
    tips: {
      low: [
        'Lighthouse score is low — reduce render-blocking resources.',
        'Keep your JavaScript small — avoid large loops or synchronous heavy operations on page load.',
        'Minimize total DOM nodes — deeply nested HTML causes slow rendering.',
        'Avoid inline event handlers inside loops — attach them once after the DOM is ready.',
        'Defer or async non-critical scripts: `<script defer src="..."></script>`.',
      ],
      mid: [
        'Performance is decent but can improve — check Total Blocking Time (TBT).',
        'Reduce unnecessary DOM manipulation and batch your updates.',
        'Avoid repeated `querySelector` calls inside loops — cache the reference once.',
      ],
      good: ['Performance is excellent! Your page loads fast and has a high Lighthouse score.']
    }
  }
};

function SmartSuggestions({ breakdown, totalScore }) {
  const suggestions = [];

  for (const { key, max } of BUCKETS) {
    const b = breakdown?.[key];
    if (!b) continue;
    const sc = b.score ?? 0;
    const pct = max > 0 ? (sc / max) * 100 : 0;
    const cfg = SUGGESTIONS[key];
    if (!cfg) continue;

    const level = pct >= 80 ? 'good' : pct >= 50 ? 'mid' : 'low';
    suggestions.push({ key, cfg, level, pct, sc, max });
  }

  // Sort: worst first
  const sorted = [...suggestions].sort((a, b) => a.pct - b.pct);
  // Always show issues, hide "good" categories to save space (show as collapsed)
  const issues = sorted.filter(s => s.level !== 'good');
  const good = sorted.filter(s => s.level === 'good');

  const levelStyle = {
    low: { bg: 'bg-[#f85149]/5', border: 'border-[#f85149]/20', badge: 'bg-[#f85149]/15 text-[#f85149]', dot: '#f85149' },
    mid: { bg: 'bg-[#f0a500]/5', border: 'border-[#f0a500]/20', badge: 'bg-[#f0a500]/15 text-[#f0a500]', dot: '#f0a500' },
    good: { bg: 'bg-[#3fb950]/5', border: 'border-[#3fb950]/20', badge: 'bg-[#3fb950]/15 text-[#3fb950]', dot: '#3fb950' },
  };

  const levelLabel = { low: 'Needs Work', mid: 'Improve', good: 'Good' };

  return (
    <div className="rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-color)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center gap-2">
        <MdLightbulb size={16} className="text-[#f0c040] shrink-0" />
        <h3 className="text-sm font-semibold text-[var(--text-strong)]">Analysis &amp; Suggestions</h3>
        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${totalScore >= 80 ? 'bg-[#3fb950]/15 text-[#3fb950]' :
          totalScore >= 50 ? 'bg-[#f0a500]/15 text-[#f0a500]' :
            'bg-[#f85149]/15 text-[#f85149]'
          }`}>
          {totalScore >= 80 ? 'Excellent' : totalScore >= 50 ? 'Passing' : 'Needs Work'}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Overall summary */}
        <p className="flex items-start gap-2 text-xs text-[var(--text-muted)] leading-relaxed">
          {totalScore >= 80
            ? <><MdStar size={14} className="text-[#f0c040] shrink-0 mt-0.5" />
              Outstanding work! You&apos;ve scored well across most categories. Focus on the remaining areas to reach a perfect score.</>
            : totalScore >= 50
              ? <><MdCheckCircle size={14} className="text-[#3fb950] shrink-0 mt-0.5" />
                You&apos;ve passed the assignment. Targeted improvements in the areas below will significantly boost your score.</>
              : <><MdWarning size={14} className="text-[#f0a500] shrink-0 mt-0.5" />
                Your score needs improvement. Focus on the highlighted areas below — each has specific actionable tips.</>}
        </p>

        {/* Issue categories */}
        {issues.length === 0 && (
          <p className="flex items-center gap-1.5 text-xs text-[#3fb950] font-semibold">
            <FiAward size={14} /> All categories are scoring well! Great job across the board.
          </p>
        )}
        {issues.map(({ key, cfg, level, pct, sc, max }) => {
          const st = levelStyle[level];
          const tips = cfg.tips[level];
          return (
            <div key={key} className={`rounded-lg border p-3 ${st.bg} ${st.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center" style={{ color: st.dot }}>{cfg.icon}</span>
                <span className="text-xs font-bold text-[var(--text-strong)]">{cfg.title}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${st.badge}`}>
                  {levelLabel[level]} · {sc}/{max}
                </span>
                {/* Mini inline bar */}
                <div className="ml-auto w-16 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: st.dot }} />
                </div>
              </div>
              <ul className="space-y-1">
                {tips.slice(0, 3).map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[10px] text-[#aaa] leading-snug">
                    <MdTrendingUp size={11} className="mt-0.5 shrink-0" style={{ color: st.dot }} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Good categories — compact */}
        {good.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {good.map(({ key, cfg, sc, max }) => (
              <span key={key} className="flex items-center gap-1 text-[10px] px-2 py-1 bg-[#3fb950]/5 border border-[#3fb950]/20 text-[#3fb950] rounded-full">
                <span className="flex items-center">{cfg.icon}</span> {cfg.title} <span className="font-bold">{sc}/{max}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Linter sub-panel ───────────────────────────────────────────────────────
function LinterDetail({ b }) {
  const subs = [
    { label: 'HTMLHint', data: b.htmlhint, max: 3 },
    { label: 'Stylelint', data: b.stylelint, max: 3 },
    { label: 'ESLint', data: b.eslint, max: 4 },
  ];

  return (
    <div className="px-4 pb-4 space-y-3">
      {subs.map(({ label, data, max }) => {
        if (!data) return null;
        const pct = max > 0 ? (data.score / max) * 100 : 0;
        const col = scoreColor(pct);
        return (
          <div key={label} className="bg-[var(--bg-surface)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#999]">{label}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: col, background: `${col}18` }}>
                {data.score}/{max}
              </span>
            </div>
            {data.errors?.length > 0 && (
              <ul className="space-y-0.5">
                {data.errors.map((e, i) => (
                  <li key={i} className="text-[10px] text-[#f85149] font-mono leading-relaxed">{e}</li>
                ))}
              </ul>
            )}
            {data.warnings?.length > 0 && (
              <ul className="space-y-0.5 mt-1">
                {data.warnings.map((w, i) => (
                  <li key={i} className="text-[10px] text-[#f0a500] font-mono leading-relaxed">{w}</li>
                ))}
              </ul>
            )}
            {data.errors?.length === 0 && data.warnings?.length === 0 && (
              <p className="text-[10px] text-[#3fb950]">No issues found</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Functionality test row ─────────────────────────────────────────────────
function FnTestRow({ t }) {
  const col = t.passed ? '#3fb950' : '#f85149';
  return (
    <div className="py-1.5 border-b border-[var(--bg-surface-alt)] last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-sm font-bold mt-0.5 flex-shrink-0" style={{ color: col }}>
            {t.passed ? '✓' : '✗'}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-[var(--text-muted)] font-medium truncate">{t.name}</p>
            {!t.passed && t.failHint && (
              <p className="text-[10px] text-[#f0a500] mt-0.5 leading-snug">{t.failHint}</p>
            )}
          </div>
        </div>
        <span className="text-xs font-bold flex-shrink-0" style={{ color: col }}>
          {t.earned}/{t.marks}
        </span>
      </div>
    </div>
  );
}

// ── Generic test row (interaction) ─────────────────────────────────────────
function TestRow({ t }) {
  const col = t.passed ? '#3fb950' : '#f85149';
  return (
    <tr style={{ color: col }}>
      <td className="py-1.5 pr-3 text-xs align-top">{t.name}</td>
      <td className="py-1.5 pr-3 text-center text-xs font-bold">{t.passed ? '✓' : '✗'}</td>
      <td className="py-1.5 text-xs text-right whitespace-nowrap">{t.earned}/{t.weight}</td>
    </tr>
  );
}

// ── Performance detail ─────────────────────────────────────────────────────
function PerformanceDetail({ b }) {
  const m = b.metrics ?? {};
  const items = [
    { label: 'Lighthouse Score', value: b.performanceScore != null ? `${b.performanceScore}/100` : 'N/A' },
    { label: 'First Contentful Paint', value: m.fcp ?? '—' },
    { label: 'Speed Index', value: m.si ?? '—' },
    { label: 'Total Blocking Time', value: m.tbt ?? '—' },
    ...(m.sizeKb != null ? [{ label: 'File Size', value: `${m.sizeKb} KB` }] : []),
    ...(m.domCount != null ? [{ label: 'DOM Nodes', value: String(m.domCount) }] : []),
  ];

  return (
    <div className="px-4 pb-4">
      <div className="bg-[var(--bg-surface)] rounded-lg overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between px-3 py-2 border-b border-[var(--bg-surface-alt)] last:border-0">
            <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">{item.value}</span>
          </div>
        ))}
        {b.source === 'heuristic' && (
          <p className="px-3 py-2 text-[10px] text-[#f0a500]">
            * Lighthouse could not run — score estimated from code size
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main ResultsPanel ──────────────────────────────────────────────────────
export function ResultsPanel({ status, result }) {

  if (status === 'pending' || status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-12 text-[var(--text-muted)]">
        <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
        <p className="text-sm">
          {status === 'pending' ? 'Queued for evaluation…' : 'Evaluating your code…'}
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 rounded-lg bg-[#2a1010] border border-[#f85149]/40 text-[#f85149] text-sm">
        Evaluation failed. Please try again.
      </div>
    );
  }

  if (!result) return null;

  const { totalScore, breakdown } = result;
  const totalColor = scoreColor(totalScore);

  return (
    <div className="max-w-2xl space-y-4">

      {/* ── Total score card ── */}
      <div className="p-4 rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-color)]">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-bold text-[var(--text-strong)]">Total Score</h2>
          <span className="text-2xl font-extrabold" style={{ color: totalColor }}>
            {totalScore} <span className="text-sm font-normal text-[var(--text-faint)]">/ 100</span>
          </span>
        </div>
        <div className="h-2.5 bg-[var(--border-color)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: `${Math.min(totalScore, 100)}%`, background: 'linear-gradient(90deg,#2f80ed,#56ccf2)' }}
          />
        </div>

        {/* ── Charts row ── */}
        <div className="mt-4 flex gap-4 items-center">
          {/* Radar chart */}
          <div className="shrink-0">
            <RadarChart breakdown={breakdown} />
          </div>
          {/* Bar chart */}
          <div className="flex-1 min-w-0">
            <ScoreBarChart breakdown={breakdown} />
          </div>
        </div>
      </div>

      {/* ── Smart Suggestions ── */}
      <SmartSuggestions breakdown={breakdown} totalScore={totalScore} />

      {/* ── Per-bucket sections ── */}
      {BUCKETS.map(({ key, label, max }) => {
        const b = breakdown?.[key];
        if (!b) return null;

        const pct = max > 0 ? (b.score / max) * 100 : 0;
        const col = scoreColor(pct);

        return (
          <div key={key} className="rounded-xl bg-[var(--bg-surface-alt)] border border-[var(--border-color)] overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-semibold text-[#c0c0c0]">{label}</h3>
              <span className="text-sm font-bold px-2 py-0.5 rounded-md"
                style={{ color: col, background: `${col}18` }}>
                {b.score} / {b.maxScore}
              </span>
            </div>

            {/* ── Linter: sub-tool breakdown ── */}
            {key === 'linter' && <LinterDetail b={b} />}

            {/* ── Functionality: test case list ── */}
            {key === 'functionality' && (
              <div className="px-4 py-2">
                {b.tests && b.tests.length > 0 ? (
                  <>
                    <p className="text-[10px] text-[var(--text-faint)] mb-2">
                      Passed {b.tests.filter(t => t.passed).length}/{b.tests.length} test cases
                      {b.rawMax !== 40 && b.rawMax > 0 && (
                        <span className="ml-1">(scaled from {b.earned}/{b.rawMax} → {b.score}/40)</span>
                      )}
                    </p>
                    <div>
                      {b.tests.map((t, i) => <FnTestRow key={i} t={t} />)}
                    </div>
                  </>
                ) : (
                  <p className="py-3 text-xs text-[var(--text-faint)]">No functionality tests defined for this assignment.</p>
                )}
              </div>
            )}

            {/* ── Interaction: table ── */}
            {key === 'interaction' && b.tests?.length > 0 && (
              <div className="px-4 py-2 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-[var(--text-faint)] border-b border-[var(--border-color)]">
                      <th className="text-left text-[10px] pb-1.5 pr-3 font-semibold uppercase tracking-wider">Test</th>
                      <th className="text-center text-[10px] pb-1.5 pr-3 font-semibold uppercase tracking-wider">Result</th>
                      <th className="text-right text-[10px] pb-1.5 font-semibold uppercase tracking-wider">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.tests.map((t, i) => <TestRow key={i} t={t} />)}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Visual: diff images ── */}
            {key === 'visual' && (
              <div className="px-4 pb-4">
                <p className="text-[10px] text-[var(--text-faint)] mt-2 mb-3">
                  Pixel difference: <span className="text-[var(--text-muted)]">{b.diffPercent}%</span>
                  <span className="ml-2">(grayscale layout comparison)</span>
                </p>
                <VisualDiffViewer
                  referenceScreenshotUrl={b.referenceScreenshotUrl}
                  studentScreenshotUrl={b.studentScreenshotUrl}
                  diffImageUrl={b.diffImageUrl}
                  diffPercent={b.diffPercent}
                  tests={b.tests || []}
                />
              </div>
            )}

            {/* ── Performance: metrics table ── */}
            {key === 'performance' && <PerformanceDetail b={b} />}

          </div>
        );
      })}
    </div>
  );
}
