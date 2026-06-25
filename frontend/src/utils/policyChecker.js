/**
 * enforceLibraryPolicy — scans bundled HTML for external CDN tags,
 * removes any whose host is not in allowedDomains, and returns
 * the cleaned HTML plus lists of what was blocked/allowed.
 *
 * Handles:
 *  - <script src="https://...">
 *  - <link rel="stylesheet" href="https://...">
 *  - @import url('https://...') inside inline <style> blocks
 *
 * @param {string} html            — bundled HTML string
 * @param {string[]} allowedDomains — e.g. ['cdn.jsdelivr.net', 'unpkg.com']
 * @returns {{ html: string, blocked: Array, allowed: Array }}
 */
export function enforceLibraryPolicy(html, allowedDomains = []) {
  const allowed = [];
  const blocked = [];

  // Normalize: strip protocol, trailing slash
  const normalizedAllowed = (allowedDomains || [])
    .filter(d => d && typeof d === 'string')
    .map(d => d.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase());

  function isAllowed(url) {
    if (!url) return true;
    // Only restrict http/https CDN urls
    if (!/^https?:\/\//i.test(url) && !/^\/\//i.test(url)) return true;
    try {
      const host = new URL(url.startsWith('//') ? 'https:' + url : url).hostname.toLowerCase();
      return normalizedAllowed.some(d => host === d || host.endsWith('.' + d));
    } catch {
      return true; // unparseable URLs are left alone
    }
  }

  // ── 1. <script src="..."> tags ───────────────────────────────────────────
  html = html.replace(
    /<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (match, pre, url, post) => {
      if (!/^https?:\/\//i.test(url) && !/^\/\//i.test(url)) return match;
      if (isAllowed(url)) {
        allowed.push({ type: 'script', url });
        return match;
      }
      blocked.push({ type: 'script', url });
      return '';
    }
  );

  // ── 2. <link rel="stylesheet" href="..."> tags ───────────────────────────
  html = html.replace(
    /<link\b([^>]*)href=["']([^"']+)["']([^>]*)>/gi,
    (match, pre, url, post) => {
      // Only process stylesheet links
      if (!/rel=["'][^"']*stylesheet/i.test(match)) return match;
      if (!/^https?:\/\//i.test(url) && !/^\/\//i.test(url)) return match;
      if (isAllowed(url)) {
        allowed.push({ type: 'link', url });
        return match;
      }
      blocked.push({ type: 'link', url });
      return '';
    }
  );

  // ── 3. @import url(...) inside inline <style> blocks ─────────────────────
  html = html.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/gi,
    (match, open, body, close) => {
      const newBody = body.replace(
        /@import\s+(?:url\()?["']?(https?:\/\/[^"');\s]+)["']?\)?/gi,
        (importMatch, url) => {
          if (isAllowed(url)) {
            allowed.push({ type: 'import', url });
            return importMatch;
          }
          blocked.push({ type: 'import', url });
          return '/* blocked: ' + url + ' */';
        }
      );
      return open + newBody + close;
    }
  );

  return { html, blocked, allowed };
}
