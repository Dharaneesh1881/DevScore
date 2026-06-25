import { formatFileSize, normalizeProjectFiles } from '../utils/projectFiles.js';

const TYPE_CONFIG = {
  html: { badge: 'bg-[#fff7ed] border-[#fdba74] text-[#c2410c]',  dot: 'bg-[#f97316]', icon: '🌐' },
  css:  { badge: 'bg-[#eff6ff] border-[#93c5fd] text-[#1d4ed8]',  dot: 'bg-[#3b82f6]', icon: '🎨' },
  js:   { badge: 'bg-[#fefce8] border-[#fde047] text-[#a16207]',  dot: 'bg-[#eab308]', icon: '⚙️' },
};

export function FileList({ files, selectedFileName, onSelect, onRemove, onSetMain, readOnly = false }) {
  const normalizedFiles = normalizeProjectFiles(files);

  if (normalizedFiles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-color)] px-4 py-5 text-center">
        <p className="text-xs text-[var(--text-faint)]">No project files loaded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[var(--border-color)] bg-[var(--bg-surface-alt)] flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--text-strong)] uppercase tracking-wider">Uploaded Files</span>
        <span className="text-[11px] text-[var(--text-faint)] font-medium">{normalizedFiles.length} file{normalizedFiles.length !== 1 ? 's' : ''}</span>
      </div>

      {/* File rows */}
      <div className="divide-y divide-[var(--border-color)]">
        {normalizedFiles.map((file) => {
          const cfg        = TYPE_CONFIG[file.type] ?? TYPE_CONFIG.js;
          const isSelected = selectedFileName === file.name;

          return (
            <div
              key={file.name}
              className={`group flex items-center gap-3 px-4 py-2.5 transition-colors ${
                isSelected
                  ? 'bg-[#eff6ff]'
                  : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              {/* Clickable left — selects the file */}
              <button
                type="button"
                onClick={() => onSelect?.(file.name)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                {/* Color dot */}
                <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />

                {/* Name + size */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-[#1d4ed8]' : 'text-[var(--text-strong)]'}`}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-faint)]">{formatFileSize(file.content)}</p>
                </div>
              </button>

              {/* Right: type badge + main badge + actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Type badge */}
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${cfg.badge}`}>
                  {file.type}
                </span>

                {/* Main badge / set main button */}
                {file.isMain ? (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-[#16a34a]/30 bg-[#f0fdf4] text-[#16a34a]">
                    main
                  </span>
                ) : onSetMain ? (
                  <button
                    type="button"
                    onClick={() => onSetMain(file.name)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-[var(--border-color)] text-[var(--text-faint)] hover:border-[#16a34a]/40 hover:text-[#16a34a] hover:bg-[#f0fdf4] transition-colors"
                  >
                    Set main
                  </button>
                ) : null}

                {/* Remove */}
                {!readOnly && onRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemove(file.name)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-medium text-[var(--text-faint)] hover:text-[#dc2626] hover:bg-[#fef2f2] border border-transparent hover:border-[#fca5a5]/40 transition-colors"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
