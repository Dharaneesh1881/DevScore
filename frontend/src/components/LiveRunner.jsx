import { useState, useEffect, useRef } from 'react';
import { buildRunnerPage } from '../utils/runnerBuilder.js';

const METHOD_COLOR = {
  log:   'text-[var(--text-main)]',
  info:  'text-[#4e9af1]',
  warn:  'text-[#f0a500]',
  error: 'text-[#f85149]',
  debug: 'text-[var(--text-faint)]',
};
const METHOD_PREFIX = {
  log: '', info: 'ℹ ', warn: '⚠ ', error: '✖ ', debug: '● '
};

const TIMEOUT_HTML = `<html><body style="margin:0;padding:24px;font-family:monospace;background:#0d0d1a;color:#f85149">
  <p style="font-size:13px">⏱ Execution timed out (8s). The page was stopped.<br>
  <span style="color:#888;font-size:11px">Possible infinite loop — check your JS for while(true) or recursive calls.</span></p>
</body></html>`;

/**
 * LiveRunner — sandboxed iframe preview panel with console log capture.
 *
 * Security:
 *  - sandbox="allow-scripts" only (no allow-same-origin)
 *  - CSP connect-src 'none' blocks fetch/XHR
 *  - alert/confirm/prompt neutralized in harness
 *  - 8-second kill timer for infinite loops
 *  - postMessage source verified against iframe.contentWindow
 *
 * @param {{ files, assignment, isVisible, onClose }} props
 */
export function LiveRunner({ files, assignment, isVisible, onClose }) {
  const [srcdoc, setSrcdoc]                   = useState('');
  const [isRunning, setIsRunning]             = useState(false);
  const [consoleLogs, setConsoleLogs]         = useState([]);
  const [runError, setRunError]               = useState(null);
  const [blockedLibraries, setBlockedLibraries] = useState([]);
  const [consoleOpen, setConsoleOpen]         = useState(false);
  const [isFullscreen, setIsFullscreen]       = useState(false);

  const iframeRef    = useRef(null);
  const killTimerRef = useRef(null);
  const prevVisible  = useRef(false);

  // ── postMessage listener (stable — reads ref, not state) ────────────────
  useEffect(() => {
    function handleMessage(event) {
      if (!iframeRef.current) return;
      if (event.source !== iframeRef.current.contentWindow) return;
      if (!event.data || event.data.type !== 'RUNNER_CONSOLE') return;
      const { method, args } = event.data;
      const safeMethod = METHOD_COLOR[method] ? method : 'log';
      setConsoleLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        method: safeMethod,
        text: (args || []).join(' '),
        timestamp: new Date().toLocaleTimeString(),
      }]);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // ── cleanup kill timer on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => { if (killTimerRef.current) clearTimeout(killTimerRef.current); };
  }, []);

  // ── auto-run when panel becomes visible ──────────────────────────────────
  useEffect(() => {
    if (isVisible && !prevVisible.current) {
      handleRun();
    }
    prevVisible.current = isVisible;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  // ── handleRun ────────────────────────────────────────────────────────────
  function handleRun() {
    setConsoleLogs([]);
    setRunError(null);
    setSrcdoc('');
    setIsRunning(false);
    setBlockedLibraries([]);
    if (killTimerRef.current) clearTimeout(killTimerRef.current);

    let result;
    try {
      result = buildRunnerPage(files, assignment?.allowedCdnDomains || []);
    } catch (err) {
      setRunError(err.message);
      return;
    }

    const { page: finalSrcdoc, blocked } = result;
    if (blocked.length > 0) setBlockedLibraries(blocked);

    // blank first → forces iframe to reload even if same content
    requestAnimationFrame(() => {
      setSrcdoc(finalSrcdoc);
      setIsRunning(true);

      killTimerRef.current = setTimeout(() => {
        setSrcdoc(TIMEOUT_HTML);
        setIsRunning(false);
        setConsoleLogs(prev => [...prev, {
          id: Date.now(),
          method: 'error',
          text: '[Runner] Execution timed out after 8 seconds.',
          timestamp: new Date().toLocaleTimeString(),
        }]);
      }, 8000);
    });
  }

  // ── handleStop ───────────────────────────────────────────────────────────
  function handleStop() {
    if (killTimerRef.current) clearTimeout(killTimerRef.current);
    setSrcdoc('');
    setIsRunning(false);
    setConsoleLogs(prev => [...prev, {
      id: Date.now(),
      method: 'warn',
      text: '[Runner] Stopped by user.',
      timestamp: new Date().toLocaleTimeString(),
    }]);
  }

  // ── iframe onLoad — page loaded normally, cancel kill timer ──────────────
  function handleIframeLoad() {
    if (killTimerRef.current) {
      clearTimeout(killTimerRef.current);
      killTimerRef.current = null;
    }
    setIsRunning(false);
  }

  return (
    <div
      className={`flex flex-col bg-[var(--bg-surface)] ${
        isFullscreen
          ? 'fixed inset-0 z-50'
          : 'h-full min-h-0'
      }`}
      style={{ display: isVisible ? 'flex' : 'none' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3
                      bg-[var(--bg-surface-alt)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-[var(--text-strong)]">Live Preview</span>
          {isRunning && (
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setConsoleLogs([])}
            title="Clear console"
            className="text-xs font-medium text-[var(--text-faint)] hover:text-[var(--text-strong)] transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="w-6 h-6 rounded flex items-center justify-center text-sm
                       text-[var(--text-faint)] hover:text-[var(--text-strong)]
                       hover:bg-[var(--border-color)] transition-colors"
          >
            {isFullscreen ? '⤡' : '⤢'}
          </button>
          <button
            onClick={() => { setIsFullscreen(false); onClose(); }}
            title="Close preview"
            className="w-6 h-6 rounded flex items-center justify-center text-sm
                       text-[var(--text-faint)] hover:text-[var(--text-strong)]
                       hover:bg-[var(--border-color)] transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Bundler error bar ─────────────────────────────────────────────── */}
      {runError && (
        <div className="shrink-0 px-4 py-2 bg-[#f85149]/10 border-b border-[#f85149]/30
                        text-xs text-[#f85149] font-mono">
          {runError}
        </div>
      )}

      {/* ── Blocked libraries warning ─────────────────────────────────────── */}
      {blockedLibraries.length > 0 && (
        <div className="shrink-0 px-4 py-2 bg-[#f0a500]/10 border-b border-[#f0a500]/30 text-xs font-mono">
          <div className="flex items-center gap-1.5 text-[#f0a500] font-semibold mb-1">
            <span>⚠</span>
            <span>Blocked Libraries ({blockedLibraries.length}) — not in allowedCdnDomains</span>
          </div>
          {blockedLibraries.map((lib, i) => (
            <div key={i} className="text-[#f0a500]/80 pl-4 truncate">
              🚫 {lib.type}: {lib.url}
            </div>
          ))}
        </div>
      )}

      {/* ── iframe area (flex 65) ────────────────────────────────────────── */}
      <div className="min-h-0 bg-white" style={{ flex: '65 1 0' }}>
        {srcdoc ? (
          <iframe
            ref={iframeRef}
            srcDoc={srcdoc}
            sandbox="allow-scripts"
            onLoad={handleIframeLoad}
            title="Live Preview"
            className="w-full h-full border-none block"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center
                          bg-[var(--bg-surface)] text-[var(--text-faintest)] text-sm">
            <div className="text-center space-y-1">
              <div className="w-6 h-6 rounded-full border-2 border-[var(--border-color)] border-t-[#3fb950] animate-spin mx-auto" />
              <p className="text-xs text-[var(--text-faintest)]">Loading preview…</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Console panel ──────────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex flex-col border-t border-[var(--border-color)] bg-[#0a0a16] overflow-hidden transition-all duration-200"
        style={consoleOpen ? { flex: '35 1 0', minHeight: '80px', maxHeight: '40%' } : { flex: '0 0 auto' }}
      >
        {/* console header */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-[var(--border-color)] bg-[#0a0a16]">
          <button
            type="button"
            onClick={() => setConsoleOpen(o => !o)}
            className="flex items-center gap-2 flex-1 text-left"
          >
            <span className="text-[10px] font-semibold text-[var(--text-faintest)] uppercase tracking-wider">
              Console
            </span>
            {consoleLogs.length > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-faint)]">
                {consoleLogs.length}
              </span>
            )}
            <span className="text-[var(--text-faintest)] text-[10px] ml-auto">
              {consoleOpen ? '▼' : '▲'}
            </span>
          </button>
        </div>

        {/* log entries */}
        {consoleOpen && (
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-1">
            {consoleLogs.length === 0 ? (
              <p className="py-3 text-[11px] text-[var(--text-faintest)] font-mono italic">
                No output yet.
              </p>
            ) : (
              consoleLogs.map(entry => (
                <div
                  key={entry.id}
                  className={`flex gap-2 py-0.5 text-[11px] font-mono leading-relaxed
                              border-b border-[var(--border-color)]/20 last:border-0
                              ${METHOD_COLOR[entry.method] || METHOD_COLOR.log}`}
                >
                  <span className="text-[var(--text-faintest)] shrink-0 select-none">
                    {entry.timestamp}
                  </span>
                  <span className="shrink-0 select-none">{METHOD_PREFIX[entry.method]}</span>
                  <span className="break-all whitespace-pre-wrap">{entry.text}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
