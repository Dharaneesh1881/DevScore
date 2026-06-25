import {
  getHtmlFiles,
  getMainFile,
  mergeFilesByType,
  normalizeStoredFiles,
  sortJavaScriptFiles
} from '../utils/projectFiles.js';

const FREEZE_ANIMATIONS_STYLE = `*, *::before, *::after {
  animation-duration: 0s !important;
  transition-duration: 0s !important;
  animation-delay: 0s !important;
  transition-delay: 0s !important;
}`;

function ensureDocumentShell(html) {
  const trimmed = String(html || '').trim();
  let documentHtml = trimmed || '<!DOCTYPE html><html><head></head><body></body></html>';

  if (!/<html[\s>]/i.test(documentHtml)) {
    documentHtml = `<!DOCTYPE html><html><head></head><body>${documentHtml}</body></html>`;
  }

  if (!/<!doctype/i.test(documentHtml)) {
    documentHtml = `<!DOCTYPE html>\n${documentHtml}`;
  }

  if (!/<head[\s>]/i.test(documentHtml)) {
    documentHtml = documentHtml.replace(/<html([^>]*)>/i, '<html$1><head></head>');
  }

  if (!/<body[\s>]/i.test(documentHtml)) {
    if (/<\/head>/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(/<\/head>/i, '</head><body></body>');
    } else {
      documentHtml = documentHtml.replace(/<\/html>/i, '<body></body></html>');
    }
  }

  return documentHtml;
}

function isCdnUrl(attr) {
  return /=["']\s*https?:\/\//i.test(attr) || /=["']\s*\/\//i.test(attr);
}

function stripBundledAssetTags(html) {
  // Only strip local <link rel="stylesheet"> and <script src>, keep CDN links intact
  return html
    .replace(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi, (match) =>
      isCdnUrl(match) ? match : ''
    )
    .replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*>\s*<\/script>/gi, (match) =>
      isCdnUrl(match) ? match : ''
    );
}

function escapeEmbeddedCode(code, tagName) {
  return String(code || '').replace(new RegExp(`</${tagName}>`, 'gi'), `<\\/${tagName}>`);
}

function injectIntoHead(html, styleContent) {
  if (!styleContent.trim()) return html;

  const styleTag = `<style data-bundled="true">\n${escapeEmbeddedCode(styleContent, 'style')}\n</style>\n`;
  return html.replace(/<\/head>/i, `${styleTag}</head>`);
}

function injectIntoBody(html, scriptContent) {
  if (!scriptContent.trim()) return html;

  const scriptTag = `<script data-bundled="true">\n${escapeEmbeddedCode(scriptContent, 'script')}\n</script>\n`;
  return html.replace(/<\/body>/i, `${scriptTag}</body>`);
}

function bundleSingleHtml(htmlContent, combinedStyles, mergedJs) {
  let html = ensureDocumentShell(htmlContent);
  html = stripBundledAssetTags(html);
  html = injectIntoHead(html, combinedStyles);
  html = injectIntoBody(html, mergedJs);
  return html;
}

export function bundleFiles(inputFiles) {
  const files = normalizeStoredFiles(inputFiles);
  const mainHtmlFile = getMainFile(files, 'html');

  if (!mainHtmlFile) {
    throw new Error('No HTML file found');
  }

  const cssFiles = files.filter((file) => file.type === 'css');
  const jsFiles = sortJavaScriptFiles(files.filter((file) => file.type === 'js'));
  const mergedCss = mergeFilesByType(files, 'css');
  const mergedJs = mergeFilesByType(files, 'js');

  const combinedStyles = [mergedCss, FREEZE_ANIMATIONS_STYLE]
    .filter((chunk) => chunk && chunk.trim())
    .join('\n\n');

  const html = bundleSingleHtml(mainHtmlFile.content, combinedStyles, mergedJs);

  return {
    html,
    files,
    mainHtmlFile,
    cssFiles,
    jsFiles,
    mergedCss,
    mergedJs
  };
}

export function bundleProjectPages(inputFiles) {
  const files = normalizeStoredFiles(inputFiles);
  const mainHtmlFile = getMainFile(files, 'html');

  if (!mainHtmlFile) {
    throw new Error('No HTML file found');
  }

  const mergedCss = mergeFilesByType(files, 'css');
  const mergedJs = mergeFilesByType(files, 'js');
  const combinedStyles = [mergedCss, FREEZE_ANIMATIONS_STYLE]
    .filter((chunk) => chunk && chunk.trim())
    .join('\n\n');

  const pages = getHtmlFiles(files).map((file) => ({
    name: file.name,
    isMain: file.isMain,
    html: bundleSingleHtml(file.content, combinedStyles, mergedJs)
  }));

  return {
    files,
    pages,
    mainPage: pages.find((page) => page.isMain) || pages[0],
    mergedCss,
    mergedJs
  };
}
