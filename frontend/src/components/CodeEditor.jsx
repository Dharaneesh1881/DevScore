import { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html }       from '@codemirror/lang-html';
import { css }        from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark }    from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { normalizeProjectFiles } from '../utils/projectFiles.js';

const FONT_SIZE_MAP = { small: '12px', medium: '14px', large: '16px' };

// Dark-mode tab colors
const TAB_DARK  = { html: '#e44d26', css: '#6495ed', js: '#f7df1e', default: '#d7dae0' };
// Light-mode tab colors
const TAB_LIGHT = { html: '#c0392b', css: '#2563eb', js: '#a16207', default: '#111827' };

function getLanguageExtension(type) {
  if (type === 'html') return html();
  if (type === 'css')  return css();
  return javascript({ jsx: true });
}

export function CodeEditor({
  files,
  onChange,
  readOnly         = false,
  selectedFileName = null,
  onSelectFile,
  onRemove,
  isDark           = true,
  fontSize         = 'medium',
  autoComplete     = true,
}) {
  const normalizedFiles = normalizeProjectFiles(files);

  const activeFileName = (() => {
    if (selectedFileName && normalizedFiles.some(f => f.name === selectedFileName)) return selectedFileName;
    return normalizedFiles[0]?.name ?? null;
  })();

  const activeFile = normalizedFiles.find(f => f.name === activeFileName) ?? normalizedFiles[0];

  // Spacing + font extensions — NO background here; theme prop owns that
  const extensions = useMemo(() => {
    if (!activeFile) return [];
    const exts = [
      getLanguageExtension(activeFile.type),
      EditorView.theme({
        '&': { fontSize: FONT_SIZE_MAP[fontSize] ?? '14px', height: '100%' },
        '.cm-content':  { fontFamily: '"Fira Code","JetBrains Mono",Consolas,monospace', padding: '8px 0' },
        '.cm-line':     { padding: '0 16px' },
        '.cm-gutters':  { minWidth: '48px', paddingRight: '8px' },
        '.cm-scroller': { overflow: 'auto' },
      }),
    ];
    if (readOnly) exts.push(EditorView.editable.of(false));
    return exts;
  }, [activeFile?.type, fontSize, readOnly]);

  const colors = isDark ? TAB_DARK : TAB_LIGHT;

  // Theme-specific UI values
  const tabBarStyle  = isDark ? { background: '#21252b', borderBottom: '1px solid #3a3f4b' }
                               : { background: '#f0f0f0', borderBottom: '1px solid #e0e0e0' };
  const activeTabBg  = isDark ? '#282c34' : '#ffffff';
  const inactiveText = isDark ? '#9da5b4' : '#6b7280';
  const hoverTabBg   = isDark ? '#2c313a' : '#ffffff';
  const removeColor  = isDark ? '#636d83' : '#9ca3af';
  const editorBg     = isDark ? '#282c34' : '#ffffff';

  if (normalizedFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-6"
           style={{ background: editorBg }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: isDark ? '#abb2bf' : '#111827' }}>No editable files loaded</p>
          <p className="text-xs mt-1" style={{ color: isDark ? '#636d83' : '#6b7280' }}>Upload project files to start editing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden" style={{ background: editorBg }}>

      {/* ── File tabs ── */}
      <div className="flex shrink-0 overflow-x-auto" style={tabBarStyle}>
        {normalizedFiles.map(file => {
          const isActive = activeFileName === file.name;
          const activeColor = colors[file.type] ?? colors.default;
          return (
            <div
              key={file.name}
              className="flex items-center gap-1 whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderBottomColor: isActive ? '#4e9af1' : 'transparent',
                background: isActive ? activeTabBg : 'transparent',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = hoverTabBg; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <button
                type="button"
                onClick={() => onSelectFile?.(file.name)}
                className="px-3 py-2.5 text-xs font-semibold font-mono tracking-wider"
                style={{ color: isActive ? activeColor : inactiveText }}
              >
                {file.name}
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onRemove(file.name); }}
                  className="pr-2 text-xs leading-none transition-colors"
                  style={{ color: removeColor }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#f85149'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = removeColor; }}
                  title={`Remove ${file.name}`}
                >
                  ×
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── CodeMirror ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeFile && (
          <CodeMirror
            key={`${activeFile.name}__${isDark}`}
            value={activeFile.content}
            height="100%"
            theme={isDark ? oneDark : 'light'}
            extensions={extensions}
            readOnly={readOnly}
            basicSetup={{
              lineNumbers:               true,
              highlightActiveLineGutter: true,
              highlightActiveLine:       true,
              foldGutter:                true,
              autocompletion:            autoComplete,
              bracketMatching:           true,
              closeBrackets:             true,
              indentOnInput:             true,
              syntaxHighlighting:        true,
            }}
            onChange={(value) => onChange?.(activeFile.name, value)}
            style={{ height: '100%', overflow: 'auto', background: editorBg }}
          />
        )}
      </div>
    </div>
  );
}
