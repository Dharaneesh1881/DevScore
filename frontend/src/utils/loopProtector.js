/**
 * addLoopProtection — injects iteration counters into every while/for/do-while
 * loop so that infinite loops throw an error instead of freezing the browser.
 *
 * Limit: 100,000 iterations per loop instance.
 *
 * Approach: regex-based transformation. Handles typical student code well;
 * edge cases inside string literals or comments may be missed — acceptable
 * for an educational context.
 *
 * @param {string} jsCode — raw JavaScript source
 * @returns {string}       protected JavaScript source
 */
export function addLoopProtection(jsCode) {
  if (!jsCode || typeof jsCode !== 'string') return jsCode;

  let counter = 0;

  // ── while (...) { ... } ──────────────────────────────────────────────────
  // Match: optional label, while keyword, condition in parens, opening brace
  jsCode = jsCode.replace(
    /\b(while\s*\([^)]*(?:\([^)]*\)[^)]*)*\))\s*\{/g,
    (match, whileHead) => {
      const id = counter++;
      return `let __lp${id}=0; ${whileHead} { if(++__lp${id}>100000) throw new Error('Infinite loop detected (while #${id})');`;
    }
  );

  // ── for (...) { ... } ────────────────────────────────────────────────────
  // Match: for keyword, clauses in parens (may contain parens in for-of/for-in), opening brace
  jsCode = jsCode.replace(
    /\b(for\s*\([^)]*(?:\([^)]*\)[^)]*)*\))\s*\{/g,
    (match, forHead) => {
      const id = counter++;
      return `let __lp${id}=0; ${forHead} { if(++__lp${id}>100000) throw new Error('Infinite loop detected (for #${id})');`;
    }
  );

  // ── do { ... } while (...) ───────────────────────────────────────────────
  // Inject counter declaration before 'do', guard at start of block
  jsCode = jsCode.replace(
    /\bdo\s*\{/g,
    () => {
      const id = counter++;
      return `let __lp${id}=0; do { if(++__lp${id}>100000) throw new Error('Infinite loop detected (do-while #${id})');`;
    }
  );

  return jsCode;
}
