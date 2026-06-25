/**
 * lighthouseRunner.js — Performance scoring (15 marks)
 *
 * Replaces the full Lighthouse audit (~8–12 s) with native Puppeteer engine
 * metrics collected in ~150 ms using the already-open browser instance.
 *
 * Signals measured:
 *   • JS + CSS coverage  — unused bytes ratio (code bloat)
 *   • page.metrics()     — TaskDuration (main-thread blocking), JSHeapUsedSize
 *   • DOM node count     — structural complexity
 *
 * Scoring (each component 0–100, then weighted → scaled to 15 marks):
 *   coverageScore = clamp(100 - unusedPct × 1.5,  0, 100)   weight 0.3
 *   taskScore     = clamp(100 - taskDurationMs/30, 0, 100)   weight 0.3
 *   heapScore     = clamp(100 - heapMb × 5,        0, 100)   weight 0.2
 *   domScore      = clamp(100 - domNodes / 5,       0, 100)  weight 0.2
 *   finalScore    = perfScore / 100 × 15
 */

import { readFile } from 'fs/promises';

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// ── Fast native metrics via open Puppeteer browser ─────────────────────────
async function collectNativeMetrics(browser, filePath) {
  const page = await browser.newPage();
  try {
    await Promise.all([
      page.coverage.startJSCoverage(),
      page.coverage.startCSSCoverage()
    ]);

    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0', timeout: 15000 });

    const [jsCoverage, cssCoverage, engineMetrics, domNodes] = await Promise.all([
      page.coverage.stopJSCoverage(),
      page.coverage.stopCSSCoverage(),
      page.metrics(),
      page.evaluate(() => document.querySelectorAll('*').length)
    ]);

    // Coverage: unused bytes ratio
    const jsTotalBytes  = jsCoverage.reduce((s, e) => s + e.text.length, 0);
    const jsUsedBytes   = jsCoverage.reduce((s, e) => s + e.ranges.reduce((sr, r) => sr + (r.end - r.start), 0), 0);
    const cssTotalBytes = cssCoverage.reduce((s, e) => s + e.text.length, 0);
    const cssUsedBytes  = cssCoverage.reduce((s, e) => s + e.ranges.reduce((sr, r) => sr + (r.end - r.start), 0), 0);
    const totalBytes    = (jsTotalBytes + cssTotalBytes) || 1;
    const usedBytes     = jsUsedBytes + cssUsedBytes;
    const unusedPct     = ((totalBytes - usedBytes) / totalBytes) * 100;

    const taskDurationMs = (engineMetrics.TaskDuration ?? 0) * 1000;
    const heapMb         = (engineMetrics.JSHeapUsedSize ?? 0) / (1024 * 1024);

    const coverageScore = clamp(100 - unusedPct * 1.5, 0, 100);
    const taskScore     = clamp(100 - taskDurationMs / 30, 0, 100);
    const heapScore     = clamp(100 - heapMb * 5, 0, 100);
    const domScore      = clamp(100 - domNodes / 5, 0, 100);

    const perfScore = Math.round(
      coverageScore * 0.3 + taskScore * 0.3 + heapScore * 0.2 + domScore * 0.2
    );

    return {
      performanceScore: perfScore,
      metrics: {
        unusedPct:      parseFloat(unusedPct.toFixed(1)),
        taskDurationMs: Math.round(taskDurationMs),
        heapMb:         parseFloat(heapMb.toFixed(1)),
        domNodes,
        totalBytes
      },
      source: 'puppeteer-native'
    };
  } finally {
    await page.close();
  }
}

// ── Fallback: code-size heuristic (used only if page load fails) ───────────
async function codeSizeHeuristic(filePath) {
  try {
    const content  = await readFile(filePath, 'utf-8');
    const sizeKb   = Buffer.byteLength(content, 'utf-8') / 1024;
    const domCount = (content.match(/<[a-zA-Z]/g) ?? []).length;

    let score = 90;
    if (sizeKb > 100 || domCount > 500) score = 50;
    else if (sizeKb > 50 || domCount > 200) score = 70;

    return {
      performanceScore: score,
      metrics: { sizeKb: parseFloat(sizeKb.toFixed(1)), domCount },
      source: 'heuristic'
    };
  } catch {
    return { performanceScore: 60, metrics: {}, source: 'heuristic' };
  }
}

// ── Main export ────────────────────────────────────────────────────────────
export async function runPerformanceMetrics(browser, filePath) {
  const result = {
    score:            0,
    maxScore:         15,
    performanceScore: null,
    metrics:          {},
    source:           'puppeteer-native',
    error:            null
  };

  let data;
  try {
    data = await collectNativeMetrics(browser, filePath);
  } catch (err) {
    console.warn('[performanceRunner] Native metrics failed, using fallback:', err.message);
    result.error = err.message;
    data = await codeSizeHeuristic(filePath);
  }

  result.performanceScore = data.performanceScore;
  result.metrics          = data.metrics;
  result.source           = data.source;
  result.score            = parseFloat(((data.performanceScore / 100) * 15).toFixed(2));

  return result;
}
