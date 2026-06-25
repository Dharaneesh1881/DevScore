/**
 * linterRunner.js
 * Runs HTMLHint (3), Stylelint (3), ESLint (4) = 10 marks total
 * Pure Node.js — no Puppeteer needed
 */

import { HtmlValidate } from 'html-validate';
import stylelint from 'stylelint';
import { Linter } from 'eslint';

// ── HTMLHint (3 marks) ─────────────────────────────────────────────────────
async function runHtmlHint(html) {
  const result = { score: 0, maxScore: 3, errors: [], warnings: [], passed: false };

  try {
    const validator = new HtmlValidate({
      rules: {
        'doctype-html':                 'error',   // must have <!DOCTYPE html>
        'no-dup-attr':                  'error',   // no duplicate attributes
        'no-dup-id':                    'error',   // no duplicate IDs
        'element-required-attributes':  'warn',    // lang on <html>, alt on <img>
        'attr-case':                    'warn',    // attributes should be lowercase
        'deprecated':                   'warn',    // no deprecated elements
        'void-style':                   'off',     // don't care about <br> vs <br/>
        'element-permitted-content':    'off'      // too noisy for student code
      }
    });

    const report = await validator.validateString(html, 'student.html');

    const allMessages = report.results.flatMap(r => r.messages);
    const errors   = allMessages.filter(m => m.severity === 2);
    const warnings = allMessages.filter(m => m.severity === 1);

    result.errors   = errors.map(m => `Line ${m.line}:${m.column} — ${m.message} [${m.ruleId}]`);
    result.warnings = warnings.map(m => `Line ${m.line}:${m.column} — ${m.message} [${m.ruleId}]`);

    // Scoring:  0 errors & 0 warnings → 3
    //           0 errors & has warns  → 2
    //           1–2 errors            → 1
    //           3+ errors             → 0
    if (errors.length === 0 && warnings.length === 0) result.score = 3;
    else if (errors.length === 0)                      result.score = 2;
    else if (errors.length <= 2)                       result.score = 1;
    else                                               result.score = 0;

    result.passed = result.score >= 2;
  } catch (err) {
    result.errors = [`HTMLHint failed: ${err.message}`];
  }

  return result;
}

// ── Stylelint (3 marks) ────────────────────────────────────────────────────
async function runStylelint(css) {
  const result = { score: 0, maxScore: 3, errors: [], warnings: [], passed: false };

  if (!css || !css.trim()) {
    result.score    = 0;
    result.warnings = ['No CSS submitted'];
    return result;
  }

  try {
    const lintResult = await stylelint.lint({
      code:   css,
      config: {
        rules: {
          'color-no-invalid-hex':              true,
          'no-duplicate-selectors':            true,
          'block-no-empty':                    true,
          'property-no-unknown':               true,
          'selector-pseudo-class-no-unknown':  true,
          'unit-no-unknown':                   true,
          'declaration-no-important':          [true, { severity: 'warning' }],
          'shorthand-property-no-redundant-values': [true, { severity: 'warning' }]
        }
      }
    });

    const allWarnings = lintResult.results.flatMap(r => r.warnings);
    const errors   = allWarnings.filter(w => w.severity === 'error');
    const warnings = allWarnings.filter(w => w.severity === 'warning');

    result.errors   = errors.map(w => `Line ${w.line} — ${w.text}`);
    result.warnings = warnings.map(w => `Line ${w.line} — ${w.text}`);

    if (errors.length === 0 && warnings.length === 0) result.score = 3;
    else if (errors.length === 0)                      result.score = 2;
    else if (errors.length <= 2)                       result.score = 1;
    else                                               result.score = 0;

    result.passed = result.score >= 2;
  } catch (err) {
    result.errors = [`Stylelint failed: ${err.message}`];
  }

  return result;
}

// ── ESLint (4 marks) ───────────────────────────────────────────────────────
function runEslint(js) {
  const result = { score: 0, maxScore: 4, errors: [], warnings: [], passed: false };

  if (!js || !js.trim()) {
    result.warnings = ['No JavaScript submitted'];
    return result;
  }

  try {
    const linter   = new Linter();
    const messages = linter.verify(js, {
      env: { browser: true, es2021: true },
      parserOptions: { ecmaVersion: 2021, sourceType: 'script' },
      rules: {
        'no-undef':          'error',
        'no-eval':           'error',
        'no-unreachable':    'error',
        'no-duplicate-case': 'error',
        'no-unused-vars':    'warn',
        'eqeqeq':            'warn',
        'no-var':            'warn',
        'semi':              ['warn', 'always'],
        'prefer-const':      'warn',
        'no-console':        'off'
      }
    });

    const errors   = messages.filter(m => m.severity === 2);
    const warnings = messages.filter(m => m.severity === 1);

    result.errors   = errors.map(m => `Line ${m.line} — [error] ${m.message} (${m.ruleId})`);
    result.warnings = warnings.map(m => `Line ${m.line} — [warn] ${m.message} (${m.ruleId})`);

    // 4-mark scale:
    //   0 errors, 0 warnings → 4
    //   0 errors, ≤3 warnings → 3
    //   0 errors, >3 warnings → 2
    //   1–2 errors             → 1
    //   3+ errors              → 0
    if (errors.length === 0 && warnings.length === 0)       result.score = 4;
    else if (errors.length === 0 && warnings.length <= 3)   result.score = 3;
    else if (errors.length === 0)                            result.score = 2;
    else if (errors.length <= 2)                             result.score = 1;
    else                                                     result.score = 0;

    result.passed = result.score >= 2;
  } catch (err) {
    result.errors = [`ESLint failed: ${err.message}`];
  }

  return result;
}

// ── Main export ────────────────────────────────────────────────────────────
export async function runLinters(html, css, js) {
  const [htmlhint, stylelintResult, eslintResult] = await Promise.all([
    runHtmlHint(html),
    runStylelint(css),
    Promise.resolve(runEslint(js))
  ]);

  const total = htmlhint.score + stylelintResult.score + eslintResult.score;

  return {
    htmlhint:  htmlhint,
    stylelint: stylelintResult,
    eslint:    eslintResult,
    score:     total,
    maxScore:  10
  };
}
