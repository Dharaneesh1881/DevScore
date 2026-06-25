/**
 * scoreCalculator.js — Aggregates all 5 evaluation buckets
 *
 *  Linter           10 marks  (HTMLHint 3 + Stylelint 3 + ESLint 4)
 *  Functionality    40 marks  (Behavior contract tests)
 *  Interaction      15 marks  (Click/type/submit simulations)
 *  Visual           20 marks  (Grayscale pixelmatch)
 *  Performance      15 marks  (Lighthouse)
 *  ─────────────────────────
 *  Total           100 marks
 */

export function calculateScore({ linterResult, functionalityResult, interactionResults, visualResult, performanceResult }) {

  // ── Linter (max 10) ───────────────────────────────────────────────────────
  const linterScore = Math.min(10, linterResult?.score ?? 0);

  const linter = {
    score:    parseFloat(linterScore.toFixed(2)),
    maxScore: 10,
    htmlhint: {
      score:    linterResult?.htmlhint?.score    ?? 0,
      maxScore: 3,
      errors:   linterResult?.htmlhint?.errors   ?? [],
      warnings: linterResult?.htmlhint?.warnings ?? [],
      passed:   linterResult?.htmlhint?.passed   ?? false
    },
    stylelint: {
      score:    linterResult?.stylelint?.score    ?? 0,
      maxScore: 3,
      errors:   linterResult?.stylelint?.errors   ?? [],
      warnings: linterResult?.stylelint?.warnings ?? [],
      passed:   linterResult?.stylelint?.passed   ?? false
    },
    eslint: {
      score:    linterResult?.eslint?.score    ?? 0,
      maxScore: 4,
      errors:   linterResult?.eslint?.errors   ?? [],
      warnings: linterResult?.eslint?.warnings ?? [],
      passed:   linterResult?.eslint?.passed   ?? false
    }
  };

  // ── Functionality (max 40) ────────────────────────────────────────────────
  const functionalityScore = Math.min(40, functionalityResult?.score ?? 0);

  const functionality = {
    score:    parseFloat(functionalityScore.toFixed(2)),
    maxScore: 40,
    tests:    functionalityResult?.tests    ?? [],
    rawMax:   functionalityResult?.rawMax   ?? 0,
    earned:   functionalityResult?.earned   ?? 0
  };

  // ── Interaction (max 15) ──────────────────────────────────────────────────
  // interactionResults is an array of { name, passed, weight, earned }
  const interactionTests  = interactionResults ?? [];
  const intTotalWeight    = interactionTests.reduce((s, t) => s + (t.weight ?? 0), 0);
  const intEarnedWeight   = interactionTests.reduce((s, t) => s + (t.earned ?? 0), 0);
  const intRatio          = intTotalWeight > 0 ? intEarnedWeight / intTotalWeight : 0;
  const interactionScore  = Math.min(15, parseFloat((intRatio * 15).toFixed(2)));

  const interaction = {
    score:    interactionScore,
    maxScore: 15,
    tests:    interactionTests.map(t => ({
      name:   t.name,
      passed: t.passed,
      weight: t.weight,
      earned: t.earned
    }))
  };

  // ── Visual (max 20) ───────────────────────────────────────────────────────
  const rawVisualScore = (visualResult?.diffScore ?? 0) / 100 * 20;
  const visualScore    = Math.min(20, parseFloat(rawVisualScore.toFixed(2)));

  const visual = {
    score:                  visualScore,
    maxScore:               20,
    diffPercent:            visualResult?.diffPercent            ?? 100,
    studentScreenshotUrl:   visualResult?.studentScreenshotUrl   ?? null,
    referenceScreenshotUrl: visualResult?.referenceScreenshotUrl ?? null,
    diffImageUrl:           visualResult?.diffImageUrl           ?? null,
    tests:                  visualResult?.tests                  ?? []
  };

  // ── Performance (max 15) ──────────────────────────────────────────────────
  const performanceScore = Math.min(15, performanceResult?.score ?? 0);

  const performance = {
    score:            parseFloat(performanceScore.toFixed(2)),
    maxScore:         15,
    performanceScore: performanceResult?.performanceScore ?? null,
    metrics:          performanceResult?.metrics          ?? {},
    source:           performanceResult?.source           ?? null,
    error:            performanceResult?.error            ?? null
  };

  // ── Total ─────────────────────────────────────────────────────────────────
  const totalScore = Math.min(100, parseFloat(
    (linter.score + functionality.score + interaction.score + visual.score + performance.score).toFixed(1)
  ));

  return { totalScore, linter, functionality, interaction, visual, performance };
}
