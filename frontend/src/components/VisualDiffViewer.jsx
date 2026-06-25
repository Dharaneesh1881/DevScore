import { useState } from 'react';

const TABS = [
  { key: 'side-by-side', label: 'Side by Side' },
  { key: 'reference', label: 'Expected' },
  { key: 'student', label: 'Yours' },
  { key: 'diff', label: 'Diff' },
];

const VIEWPORT_LABELS = {
  desktop: '🖥 Desktop (1280×720)',
  mobile: '📱 Mobile (390×844)'
};

function diffColor(pct) {
  return pct <= 5 ? '#3fb950' : pct <= 20 ? '#f0a500' : '#f85149';
}

function DiffBadge({ diffPercent }) {
  if (diffPercent == null) return null;
  const pct = parseFloat(diffPercent);
  const match = Math.max(0, 100 - pct).toFixed(1);
  const color = diffColor(pct);
  return (
    <div className="flex items-center gap-3 text-[11px]" style={{ color }}>
      <span style={{ fontWeight: 700 }}>{match}% Match</span>
      <span style={{ color: '#888' }}>·</span>
      <span style={{ color: '#888' }}>{pct}% pixel diff</span>
      <div className="flex-1 h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden" style={{ maxWidth: 80 }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${match}%`, background: color }}
        />
      </div>
    </div>
  );
}

function ImageFrame({ src, label, noLabel }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)] mb-1.5">
        {label}
      </p>
      {src ? (
        <img
          src={src}
          alt={label}
          className="w-full rounded-lg border border-[var(--border-color)] object-top"
          style={{ display: 'block' }}
        />
      ) : (
        <div className="w-full h-40 rounded-lg border border-[var(--border-color)] flex items-center justify-center text-[var(--text-faint)] text-xs">
          {noLabel}
        </div>
      )}
    </div>
  );
}

function PageComparisonCard({ test, index }) {
  const pct = test?.diffPercent ?? 100;
  const match = Math.max(0, 100 - pct).toFixed(1);
  const color = diffColor(pct);

  return (
    <div className="rounded-xl border border-[var(--border-color)] overflow-hidden bg-[var(--bg-surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
        <div>
          <p className="text-xs font-semibold text-[var(--text-strong)]">{test.pageName || `Page ${index + 1}`}</p>
          {test.error && (
            <p className="text-[10px] text-[#f85149] mt-0.5">{test.error}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text-faint)] uppercase tracking-wider">Visual Match</p>
          <p className="text-sm font-bold" style={{ color }}>{match}%</p>
        </div>
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-3">
        <ImageFrame src={test.referenceScreenshotUrl} label="Expected" noLabel="No reference screenshot" />
        <ImageFrame src={test.studentScreenshotUrl} label="Yours" noLabel="No student screenshot" />
        <ImageFrame src={test.diffImageUrl} label="Difference" noLabel="No diff image available" />
      </div>
    </div>
  );
}

export function VisualDiffViewer({
  referenceScreenshotUrl,
  studentScreenshotUrl,
  diffImageUrl,
  diffPercent,
  tests = [],
}) {
  // ── Viewport grouping ────────────────────────────────────────────────────
  const viewportKeys = [...new Set(tests.map(t => t.viewport ?? 'desktop'))];
  const hasViewports = viewportKeys.length > 1;
  const [activeViewport, setActiveViewport] = useState(viewportKeys[0] ?? 'desktop');

  // Tests filtered to the active viewport
  const vpTests = hasViewports
    ? tests.filter(t => (t.viewport ?? 'desktop') === activeViewport)
    : tests;

  const [active, setActive] = useState('side-by-side');
  const [activePage, setActivePage] = useState(0);

  const selectedTest = vpTests[activePage] || null;

  const urls = {
    reference: selectedTest?.referenceScreenshotUrl ?? referenceScreenshotUrl,
    student: selectedTest?.studentScreenshotUrl ?? studentScreenshotUrl,
    diff: selectedTest?.diffImageUrl ?? diffImageUrl,
  };
  const pageDiffPct = selectedTest?.diffPercent ?? diffPercent;

  // Per-viewport averages for tab badge
  function vpAvgMatch(vp) {
    const subset = tests.filter(t => (t.viewport ?? 'desktop') === vp);
    if (!subset.length) return 0;
    const avg = subset.reduce((s, t) => s + (t.diffPercent ?? 100), 0) / subset.length;
    return Math.max(0, 100 - avg);
  }

  return (
    <div className="mt-2">

      {/* ── Viewport tabs ───────────────────────────────────────────────── */}
      {hasViewports && (
        <div className="flex flex-wrap items-center gap-2 mb-3 pb-2 border-b border-[var(--border-color)]">
          {viewportKeys.map(vp => {
            const matchPct = vpAvgMatch(vp).toFixed(0);
            const vpDiff = 100 - vpAvgMatch(vp);
            const col = diffColor(vpDiff);
            return (
              <button
                key={vp}
                onClick={() => { setActiveViewport(vp); setActivePage(0); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap transition-colors ${
                  activeViewport === vp
                    ? 'border-[#7c5af1] text-[#7c5af1] bg-[#7c5af1]/10'
                    : 'border-[var(--border-color)] text-[var(--text-faint)] hover:text-[var(--text-muted)]'
                }`}
              >
                {VIEWPORT_LABELS[vp] ?? vp}
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ color: col, background: `${col}18` }}
                >
                  {matchPct}%
                </span>
              </button>
            );
          })}
          {/* Grand total across ALL viewports */}
          <div className="ml-auto text-[10px] text-[var(--text-faint)] self-center">
            Total visual:{' '}
            <span className="font-bold text-[var(--text-muted)]">
              {(100 - (diffPercent ?? 0)).toFixed(1)}% match
            </span>
          </div>
        </div>
      )}

      {/* ── Page tabs (multi-page assignments) ─────────────────────────── */}
      {vpTests.length > 1 && (
        <div className="flex gap-2 overflow-x-auto mb-3 pb-1">
          {vpTests.map((test, index) => {
            const pct = test.diffPercent ?? 0;
            const match = Math.max(0, 100 - pct).toFixed(0);
            const col = diffColor(pct);
            return (
              <button
                key={test.pageName || index}
                onClick={() => setActivePage(index)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap transition-colors ${activePage === index
                    ? 'border-[#4e9af1] text-[#4e9af1] bg-[#4e9af1]/10'
                    : 'border-[var(--border-color)] text-[var(--text-faint)] hover:text-[var(--text-muted)]'
                  }`}
              >
                {test.pageName}
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ color: col, background: `${col}18` }}
                >
                  {match}%
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── View mode tabs ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[var(--border-color)] mb-3">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${active === tab.key
                ? 'text-[#4e9af1] border-[#4e9af1]'
                : 'text-[var(--text-faint)] border-transparent hover:text-[var(--text-muted)]'
              }`}
          >
            {tab.label}
          </button>
        ))}

        {/* Inline diff badge pushed to the right */}
        <div className="ml-auto pr-1">
          <DiffBadge diffPercent={pageDiffPct} />
        </div>
      </div>

      {/* ── Side-by-side view ───────────────────────────────────────────── */}
      {active === 'side-by-side' && (
        <div className="space-y-3">
          {vpTests.length > 1 ? (
            <div className="space-y-4">
              {vpTests.map((test, index) => (
                <PageComparisonCard key={test.pageName || index} test={test} index={index} />
              ))}
            </div>
          ) : (
            <>
              <div className="flex gap-3">
                <ImageFrame src={urls.reference} label="Expected (Teacher)" noLabel="No reference screenshot" />
                <ImageFrame src={urls.student} label="Yours (Student)" noLabel="No student screenshot" />
              </div>

              {/* ── Diff image strip ── */}
              {urls.diff ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)] mb-1.5">
                    Pixel-diff Map
                    <span className="ml-2 font-normal normal-case">
                      (highlighted regions differ)
                    </span>
                  </p>
                  <img
                    src={urls.diff}
                    alt="pixel diff"
                    className="w-full rounded-lg border border-[var(--border-color)]"
                  />
                </div>
              ) : (
                <div className="w-full h-20 rounded-lg border border-[var(--border-color)] flex items-center justify-center text-[var(--text-faint)] text-xs">
                  No diff image available
                </div>
              )}
            </>
          )}

          {/* ── Per-page stat table ── */}
          {vpTests.length > 0 && (
            <div className="rounded-lg border border-[var(--border-color)] overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                  {hasViewports ? `${activeViewport.charAt(0).toUpperCase() + activeViewport.slice(1)} — Pixel Difference` : 'All Pages — Pixel Difference'}
                </p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="text-left text-[10px] px-3 py-2 text-[var(--text-faint)] font-semibold uppercase tracking-wider">Page</th>
                    <th className="text-right text-[10px] px-3 py-2 text-[var(--text-faint)] font-semibold uppercase tracking-wider">Match %</th>
                    <th className="text-right text-[10px] px-3 py-2 text-[var(--text-faint)] font-semibold uppercase tracking-wider">Diff %</th>
                    <th className="text-right text-[10px] px-3 py-2 text-[var(--text-faint)] font-semibold uppercase tracking-wider">Visual Score</th>
                    <th className="px-3 py-2 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {vpTests.map((t, i) => {
                    const pct = t.diffPercent ?? 100;
                    const match = Math.max(0, 100 - pct).toFixed(1);
                    const score = t.diffScore != null ? t.diffScore.toFixed(1) : (100 - pct).toFixed(1);
                    const col = diffColor(pct);
                    const error = t.error;
                    return (
                      <tr
                        key={t.pageName || i}
                        onClick={() => { setActivePage(i); }}
                        className={`border-b border-[var(--border-color)] last:border-0 cursor-pointer transition-colors ${activePage === i
                            ? 'bg-[#4e9af1]/5'
                            : 'hover:bg-[var(--bg-surface)]'
                          }`}
                      >
                        <td className="px-3 py-2">
                          <span className="text-[11px] text-[var(--text-muted)] font-medium">{t.pageName || `Page ${i + 1}`}</span>
                          {error && (
                            <span className="ml-2 text-[9px] text-[#f85149]">({error})</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-[11px] font-bold" style={{ color: col }}>{match}%</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-[11px] text-[var(--text-faint)]">{pct}%</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="text-[11px] font-bold" style={{ color: col }}>{score}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${match}%`, background: col }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* ── Viewport Average row ── */}
                {vpTests.length > 1 && (() => {
                  const avgDiff = parseFloat((vpTests.reduce((s, t) => s + (t.diffPercent ?? 100), 0) / vpTests.length).toFixed(2));
                  const avgMatch = Math.max(0, 100 - avgDiff).toFixed(1);
                  const avgScore = parseFloat((vpTests.reduce((s, t) => s + (t.diffScore ?? 0), 0) / vpTests.length).toFixed(1));
                  const col = diffColor(avgDiff);
                  return (
                    <tfoot>
                      <tr className="border-t-2 border-[var(--border-color)] bg-[var(--bg-surface)]">
                        <td className="px-3 py-2 text-[10px] font-bold text-[var(--text-muted)] uppercase">
                          {hasViewports ? 'Viewport Average' : 'Average'}
                        </td>
                        <td className="px-3 py-2 text-right text-[11px] font-extrabold" style={{ color: col }}>{avgMatch}%</td>
                        <td className="px-3 py-2 text-right text-[11px] text-[var(--text-faint)]">{avgDiff}%</td>
                        <td className="px-3 py-2 text-right text-[11px] font-extrabold" style={{ color: col }}>{avgScore}</td>
                        <td className="px-3 py-2" />
                      </tr>
                    </tfoot>
                  );
                })()}
              </table>
            </div>
          )}

          {/* ── Grand total row (only when multiple viewports) ── */}
          {hasViewports && (
            <div className="rounded-lg border border-[var(--border-color)] overflow-hidden bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Grand Total (all viewports)</span>
                {(() => {
                  const grandDiff = diffPercent ?? 100;
                  const grandMatch = Math.max(0, 100 - grandDiff).toFixed(1);
                  const col = diffColor(grandDiff);
                  return (
                    <span className="text-[13px] font-extrabold" style={{ color: col }}>{grandMatch}% match</span>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Single-image views (Expected / Yours / Diff) ────────────── */}
      {active !== 'side-by-side' && (
        <>
          {urls[active] ? (
            <img
              src={urls[active]}
              alt={active}
              className="w-full rounded-lg border border-[var(--border-color)]"
            />
          ) : (
            <div className="w-full h-40 rounded-lg border border-[var(--border-color)] flex items-center justify-center text-[var(--text-faint)] text-xs">
              {active === 'reference' ? 'No reference screenshot' :
                active === 'student' ? 'No student screenshot' :
                  'No diff image available'}
            </div>
          )}
        </>
      )}
    </div>
  );
}
