/**
 * Builds the security harness HTML fragment injected before </head> in every live preview.
 *
 * Two parts:
 *  1. CSP <meta> tag  — blocks fetch/XHR (connect-src: none), allows only approved CDN scripts
 *  2. Inline <script> — neutralizes dialogs, bridges console.log → postMessage to parent
 *
 * Security model:
 *  - iframe uses sandbox="allow-scripts" (no allow-same-origin)
 *  - null origin → parent DOM, localStorage, cookies all blocked by browser
 *  - CSP connect-src 'none' → blocks all fetch / XMLHttpRequest
 *  - alert/confirm/prompt overridden → no-op (prevents alert bombing)
 *  - console bridge uses postMessage — works across null-origin boundary
 *  - parent validates event.source === iframeRef.current.contentWindow before trusting messages
 *
 * @param {string[]} allowedCdnDomains - e.g. ["cdn.jsdelivr.net", "code.jquery.com"]
 * @returns {string} HTML string to inject before </head>
 */
export function buildSecurityHarness(allowedCdnDomains) {
  const origins = (allowedCdnDomains || [])
    .filter(d => d && typeof d === 'string')
    .map(d => `https://${d.replace(/^https?:\/\//, '').replace(/\/$/, '')}`);

  const cdnList = origins.length ? ' ' + origins.join(' ') : '';

  const cspContent = [
    `script-src 'unsafe-inline'${cdnList}`,
    `style-src 'unsafe-inline'${cdnList}`,
    `font-src 'self' data:${cdnList}`,
    `img-src 'self' data: blob:`,
    `connect-src 'none'`,
    `object-src 'none'`,
    `base-uri 'none'`,
  ].join('; ');

  const cspTag = `<meta http-equiv="Content-Security-Policy" content="${cspContent}">`;

  // This script runs before student code (injected into <head>, student JS goes into <body>)
  const script = `<script>
(function () {
  // ── 1. Neutralize blocking dialogs ──────────────────────────────────────
  window.alert   = function () {};
  window.confirm = function () { return false; };
  window.prompt  = function () { return null; };

  // ── 2. Console bridge → postMessage to parent ────────────────────────────
  // postMessage works across null-origin boundaries (sandbox without allow-same-origin).
  // Parent verifies event.source === iframeRef.current.contentWindow before trusting.
  var METHODS = ['log', 'warn', 'error', 'info', 'debug'];
  METHODS.forEach(function (m) {
    var _orig = console[m] ? console[m].bind(console) : function () {};
    console[m] = function () {
      var args = Array.prototype.slice.call(arguments).map(function (a) {
        try {
          if (a === null) return 'null';
          if (a === undefined) return 'undefined';
          return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
        } catch (e) {
          return '[unserializable]';
        }
      });
      try {
        window.parent.postMessage({ type: 'RUNNER_CONSOLE', method: m, args: args }, '*');
      } catch (e) {}
    };
  });

  // ── 3. Forward uncaught JS errors ───────────────────────────────────────
  window.addEventListener('error', function (e) {
    try {
      window.parent.postMessage({
        type: 'RUNNER_CONSOLE',
        method: 'error',
        args: [e.message + (e.filename ? ' (' + e.filename + ':' + e.lineno + ')' : '')]
      }, '*');
    } catch (ex) {}
  });

  // ── 4. Forward unhandled promise rejections ──────────────────────────────
  window.addEventListener('unhandledrejection', function (e) {
    try {
      window.parent.postMessage({
        type: 'RUNNER_CONSOLE',
        method: 'error',
        args: ['Unhandled rejection: ' + String(e.reason)]
      }, '*');
    } catch (ex) {}
  });
})();
<\/script>`;

  return `${cspTag}\n${script}\n`;
}
