import { useRef, useState } from 'react';
import { parseProjectZip } from '../api/index.js';
import {
  createProjectFile,
  createStarterProject,
  inferFileType,
  mergeProjectFiles
} from '../utils/projectFiles.js';

async function readTextFiles(fileList) {
  const files = [];
  const warnings = [];

  for (const file of Array.from(fileList)) {
    const type = inferFileType(file.name);
    if (!type) {
      warnings.push(`Skipped unsupported file "${file.name}"`);
      continue;
    }
    files.push({ name: file.name, type, content: await file.text() });
  }

  return { files, warnings };
}

export function MultiFileUpload({ files, onChange, onMessage, disabled = false, showDropZone = true, showStartInEditor = true }) {
  const [loadingZip, setLoadingZip]   = useState(false);
  const [dragging, setDragging]       = useState(false);
  const fileInputRef                  = useRef(null);
  const zipInputRef                   = useRef(null);

  const report = (message, tone = 'info') => onMessage?.({ message, tone });

  const applyIncomingFiles = (incomingFiles, warnings = []) => {
    if (incomingFiles.length > 0) {
      onChange?.(mergeProjectFiles(files, incomingFiles));
      report(`Loaded ${incomingFiles.length} file${incomingFiles.length !== 1 ? 's' : ''}.`, 'success');
    }
    if (warnings.length > 0) {
      report(warnings.join(' '), incomingFiles.length > 0 ? 'info' : 'error');
    }
  };

  const handlePlainFiles = async (selectedFiles) => {
    const { files: parsed, warnings } = await readTextFiles(selectedFiles);
    applyIncomingFiles(parsed, warnings);
  };

  const handleZipFile = async (zipFile) => {
    setLoadingZip(true);
    try {
      const result = await parseProjectZip(zipFile);
      applyIncomingFiles(result.files || [], result.warnings || []);
    } catch (error) {
      report(error.message, 'error');
    } finally {
      setLoadingZip(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || loadingZip) return;
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length === 1 && dropped[0].name.toLowerCase().endsWith('.zip')) {
      await handleZipFile(dropped[0]);
    } else {
      await handlePlainFiles(dropped);
    }
  };

  const isLocked = disabled || loadingZip;

  return (
    <div className="space-y-3">
      {/* ── Drop zone ── */}
      {showDropZone && <div
        role="button"
        tabIndex={0}
        onDragOver={(e) => { e.preventDefault(); if (!isLocked) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isLocked && fileInputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !isLocked) { e.preventDefault(); fileInputRef.current?.click(); }}}
        className={`relative flex items-center gap-4 rounded-xl border-2 border-dashed px-5 py-4 transition-all ${
          isLocked
            ? 'border-[var(--border-color)] opacity-50 cursor-not-allowed'
            : dragging
              ? 'border-[#2563eb] bg-[#2563eb]/5 cursor-pointer'
              : 'border-[#93c5fd] hover:border-[#2563eb] hover:bg-[#2563eb]/5 cursor-pointer'
        }`}
      >
        {/* Upload icon */}
        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          dragging ? 'bg-[#2563eb]/15' : 'bg-[#eff6ff]'
        }`}>
          <svg className={`w-5 h-5 ${dragging ? 'text-[#2563eb]' : 'text-[#60a5fa]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Text */}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-strong)] leading-tight">
            {dragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-xs text-[var(--text-faint)] mt-0.5">
            Supports <span className="font-mono">.html</span>, <span className="font-mono">.css</span>, <span className="font-mono">.js</span> and <span className="font-mono">.zip</span>
          </p>
        </div>

        {loadingZip && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="w-4 h-4 rounded-full border-2 border-[#2563eb]/30 border-t-[#2563eb] animate-spin" />
            <span className="text-xs text-[var(--text-faint)]">Extracting…</span>
          </div>
        )}
      </div>}

      {/* ── Action buttons ── */}
      <div className="flex flex-wrap gap-1.5">
        {/* Select Files — primary */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#2563eb] text-white hover:bg-[#1d4ed8] disabled:opacity-50 transition-all shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Select Files
        </button>

        {/* Upload ZIP */}
        <button
          type="button"
          disabled={isLocked}
          onClick={() => zipInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[#2563eb]/50 hover:text-[#2563eb] hover:bg-[#2563eb]/5 disabled:opacity-50 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Upload ZIP
        </button>

        {/* Divider */}
        <div className="w-px h-6 self-center bg-[var(--border-color)] mx-0.5" />

        {/* Start In Editor */}
        {showStartInEditor && (
          <button
            type="button"
            disabled={isLocked}
            onClick={() => { onChange?.(createStarterProject(files)); report('Created starter HTML, CSS, and JS files.', 'success'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:border-[#16a34a]/50 hover:text-[#16a34a] hover:bg-[#16a34a]/5 disabled:opacity-50 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Start In Editor
          </button>
        )}

        {/* Add HTML / CSS / JS */}
        {[
          { type: 'html', color: '#ea580c', label: 'HTML' },
          { type: 'css',  color: '#2563eb', label: 'CSS' },
          { type: 'js',   color: '#ca8a04', label: 'JS' },
        ].map(({ type, color, label }) => (
          <button
            key={type}
            type="button"
            disabled={isLocked}
            onClick={() => { onChange?.(createProjectFile(files, type)); report(`Added ${label} file for editing.`, 'success'); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-muted)] disabled:opacity-50 transition-all hover:bg-[var(--bg-surface-alt)]"
            style={{ '--hover-color': color }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = color + '60'; e.currentTarget.style.color = color; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.color = ''; }}
          >
            + {label}
          </button>
        ))}
      </div>

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.css,.js,text/html,text/css,application/javascript,text/javascript"
        multiple
        className="hidden"
        onChange={async (e) => { await handlePlainFiles(e.target.files || []); e.target.value = ''; }}
      />
      <input
        ref={zipInputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={async (e) => { const [z] = Array.from(e.target.files || []); if (z) await handleZipFile(z); e.target.value = ''; }}
      />
    </div>
  );
}
