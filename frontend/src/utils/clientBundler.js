/**
 * Client-side port of backend/worker/bundler.js
 * Bundles HTML + CSS + JS files into a single HTML string for live preview.
 * No server call — runs entirely in the browser.
 */
import { normalizeProjectFiles } from './projectFiles.js';

function isCdnUrl(attr) {
  return /=["']\s*https?:\/\//i.test(attr) || /=["']\s*\/\//i.test(attr);
}

function ensureDocumentShell(html) {
  const trimmed = String(html || '').trim();
  let doc = trimmed || '<!DOCTYPE html><html><head></head><body></body></html>';

  if (!/<html[\s>]/i.test(doc)) {
    doc = `<!DOCTYPE html><html><head></head><body>${doc}</body></html>`;
  }
  if (!/<!doctype/i.test(doc)) {
    doc = `<!DOCTYPE html>\n${doc}`;
  }
  if (!/<head[\s>]/i.test(doc)) {
    doc = doc.replace(/<html([^>]*)>/i, '<html$1><head></head>');
  }
  if (!/<body[\s>]/i.test(doc)) {
    if (/<\/head>/i.test(doc)) {
      doc = doc.replace(/<\/head>/i, '</head><body></body>');
    } else {
      doc = doc.replace(/<\/html>/i, '<body></body></html>');
    }
  }
  return doc;
}

function stripBundledAssetTags(html) {
  return html
    .replace(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi, (m) =>
      isCdnUrl(m) ? m : ''
    )
    .replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/gi, (m) =>
      isCdnUrl(m) ? m : ''
    );
}

function escapeEmbeddedCode(code, tagName) {
  return String(code || '').replace(new RegExp(`</${tagName}>`, 'gi'), `<\\/${tagName}>`);
}

function injectIntoHead(html, styleContent) {
  if (!styleContent.trim()) return html;
  const tag = `<style data-bundled="true">\n${escapeEmbeddedCode(styleContent, 'style')}\n</style>\n`;
  return html.replace(/<\/head>/i, `${tag}</head>`);
}

function injectIntoBody(html, scriptContent) {
  if (!scriptContent.trim()) return html;
  const tag = `<script data-bundled="true">\n${escapeEmbeddedCode(scriptContent, 'script')}\n</script>\n`;
  return html.replace(/<\/body>/i, `${tag}</body>`);
}

function sortJavaScriptFiles(files) {
  return [...files].sort((a, b) => {
    const weight = (name) => {
      const n = (name || '').toLowerCase();
      if (/util|helper|lib|constant|config/.test(n)) return 0;
      if (/main|app|index|script/.test(n)) return 2;
      return 1;
    };
    const wa = weight(a.name);
    const wb = weight(b.name);
    return wa !== wb ? wa - wb : (a.name || '').localeCompare(b.name || '');
  });
}

function mergeFilesByType(files, type) {
  const ordered = type === 'js' ? sortJavaScriptFiles(files.filter(f => f.type === type)) : files.filter(f => f.type === type);
  return ordered.map(f => `/* ${f.name} */\n${f.content}`).join('\n\n');
}

/**
 * Bundle files into a single preview-ready HTML string.
 * CDN links are preserved. Local CSS/JS are inlined.
 * Does NOT add FREEZE_ANIMATIONS_STYLE (live preview should animate normally).
 *
 * @param {Array} files - array of { name, type, content, isMain }
 * @returns {string} complete HTML string
 * @throws {Error} if no HTML file found
 */
export function buildPreviewHtml(files) {
  const normalized = normalizeProjectFiles(files);

  const mainHtml =
    normalized.find(f => f.type === 'html' && f.isMain) ||
    normalized.find(f => f.type === 'html' && /^index\.html?$/i.test(f.name)) ||
    normalized.find(f => f.type === 'html');

  if (!mainHtml) throw new Error('No HTML file found in project');

  const mergedCss = mergeFilesByType(normalized, 'css');
  const mergedJs  = mergeFilesByType(normalized, 'js');

  let html = ensureDocumentShell(mainHtml.content);
  html = stripBundledAssetTags(html);
  html = injectIntoHead(html, mergedCss);
  html = injectIntoBody(html, mergedJs);
  return html;
}
