/**
 * runnerBuilder — combines all four security layers into a final HTML page
 * ready to be set as iframe srcdoc.
 *
 * Pipeline:
 *  1. clientBundler   — merge HTML + CSS + JS files into one HTML string
 *  2. policyChecker   — strip CDN tags not in allowedDomains, collect warnings
 *  3. loopProtector   — inject iteration guards into inline <script> blocks
 *  4. securityHarness — inject CSP + console bridge before </head>
 *
 * @param {Array}    files          — array of { name, type, content, isMain }
 * @param {string[]} allowedDomains — e.g. ['cdn.jsdelivr.net']
 * @returns {{ page: string, blocked: Array, allowed: Array }}
 * @throws {Error} if no HTML file found in files
 */
import { buildPreviewHtml } from './clientBundler.js';
import { buildSecurityHarness } from './securityHarness.js';
import { enforceLibraryPolicy } from './policyChecker.js';
import { addLoopProtection } from './loopProtector.js';

export function buildRunnerPage(files, allowedDomains = []) {
  // ── 1. Bundle ─────────────────────────────────────────────────────────────
  let html = buildPreviewHtml(files);

  // ── 2. Policy check ───────────────────────────────────────────────────────
  const { html: checkedHtml, blocked, allowed } = enforceLibraryPolicy(html, allowedDomains);

  // ── 3. Loop protection — applied to every inline <script> block ───────────
  const protectedHtml = checkedHtml.replace(
    /(<script(?:\s[^>]*)?>)([\s\S]*?)(<\/script>)/gi,
    (match, open, body, close) => {
      // Skip external scripts (they have src= and empty body)
      if (/\bsrc=["']/i.test(open)) return match;
      // Skip the security harness itself (injected next step)
      if (body.includes('__lp') || body.includes('RUNNER_CONSOLE')) return match;
      return open + addLoopProtection(body) + close;
    }
  );

  // ── 4. Security harness ───────────────────────────────────────────────────
  const harness = buildSecurityHarness(allowedDomains);
  const page = protectedHtml.replace(/<\/head>/i, harness + '</head>');

  return { page, blocked, allowed };
}
