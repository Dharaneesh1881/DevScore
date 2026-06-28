/**
 * evaluator.js — Main orchestrator
 *
 * Pipeline:
 *  1. buildPage                     — assemble student code into temp HTML file
 *  2. runLinters + puppeteer.launch — parallel: HTMLHint/Stylelint/ESLint (10) + browser start
 *  3. runPerformanceMetrics         — native Puppeteer metrics, ~150ms    (15 marks)
 *  4. runFunctionalityTests         — behavior contract engine             (40 marks)
 *  5. runInteractionTests           — click/type simulations               (15 marks)
 *  6. runVisualTest                 — color pixelmatch, multi-viewport     (20 marks)
 *  7. calculateScore                — aggregate all 5 buckets             (100 marks)
 *  8. Save EvaluationRun to MongoDB
 *  9. Publish Redis event → Socket.IO → student sees results
 */

import puppeteer from 'puppeteer';
import { getTenantConnection, getTenantModels } from '../db/connections.js';
import { buildPage, cleanupPage } from './pageBuilder.js';
import { runLinters } from './linterRunner.js';
import { runFunctionalityTests } from './functionalityTests.js';
import { runInteractionTests } from './tests/interactionTests.js';
import { runAlignCenterTests } from './tests/styleTests.js';
import { runVisualTest } from './visualTest.js';
import { runPerformanceMetrics } from './lighthouseRunner.js';
import { resolveAllowedDomains } from './networkPolicy.js';
import { calculateScore } from './scoreCalculator.js';
import { getMainFile, mergeFilesByType, normalizeStoredFiles } from '../utils/projectFiles.js';
import { uploadRawText } from '../utils/cloudinary.js';

import { createRedisClient } from '../utils/redis.js';
const redisPub = createRedisClient();

function resolveReferencePages(assignment) {
  const pageScreenshots = Array.isArray(assignment.referencePageScreenshots)
    ? assignment.referencePageScreenshots.filter((page) => page?.pageName && page?.url)
    : [];

  if (pageScreenshots.length > 0) {
    return pageScreenshots;
  }

  if (assignment.referenceScreenshotUrl) {
    return [{
      pageName: getMainFile(assignment.files, 'html')?.name || 'index.html',
      url: assignment.referenceScreenshotUrl,
      isMain: true
    }];
  }

  return [];
}

export async function runEvaluation(submissionId, assignmentId, industrySlug) {
  const conn = await getTenantConnection(industrySlug);
  const { Submission, Assignment, EvaluationRun, StudentProgress, LibraryPolicy } = getTenantModels(conn);

  const [submission, assignment] = await Promise.all([
    Submission.findOne({ submissionId }),
    Assignment.findById(assignmentId)
  ]);

  if (!submission) throw new Error(`Submission ${submissionId} not found`);
  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  const files = normalizeStoredFiles(submission.files);
  const mainHtml = getMainFile(files, 'html');
  const mergedCss = mergeFilesByType(files, 'css');
  const mergedJs = mergeFilesByType(files, 'js');
  const spec = assignment.evalSpec;
  const allowedDomains = resolveAllowedDomains(assignment.allowedCdnDomains);

  // Resolve versioned URL prefixes from linked LibraryPolicies
  const policyIds = assignment.allowedLibraryPolicyIds || [];
  const activePolicies = policyIds.length > 0
    ? await LibraryPolicy.find({ _id: { $in: policyIds }, enabled: true })
    : [];

  // If student selected specific libraries, restrict to those; otherwise allow all active
  const studentSelectedIds = submission.selectedLibraryIds ?? [];
  const effectivePolicies = studentSelectedIds.length > 0
    ? activePolicies.filter(p => studentSelectedIds.includes(p._id.toString()))
    : activePolicies;
  const allowedUrlPrefixes = effectivePolicies.flatMap(p => p.cdnUrls || []);

  // ── 1. Build temp file ─────────────────────────────────────────────────
  const { filePath, dir, pageFilePaths } = await buildPage(submissionId, files);
  const fileUrl = `file://${filePath}`;

  let linterResult = null;
  let functionalityResult = null;
  let interactionResults = [];
  let visualResult = null;
  let performanceResult = null;
  let domSnapshotUrl = null;
  const timing = { linter: null, performance: null, functionality: null, interaction: null, visual: null, total: null };
  const tTotal = Date.now();

  try {
    // ── 2 & 4. Linters + browser launch in parallel ──────────────────────
    console.log(`[${submissionId}] Running linters + launching browser (parallel)...`);
    const tLinter = Date.now();
    const [linterRes, browser] = await Promise.all([
      runLinters(mainHtml?.content || '', mergedCss, mergedJs),
      puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      })
    ]);
    linterResult = linterRes;
    timing.linter = Date.now() - tLinter;
    console.log(`[${submissionId}] Linter score: ${linterResult.score}/10`);

    // ── 3. Performance metrics (uses open browser — ~150ms) ──────────────
    console.log(`[${submissionId}] Running performance metrics...`);
    const tPerf = Date.now();
    performanceResult = await runPerformanceMetrics(browser, filePath);
    timing.performance = Date.now() - tPerf;
    console.log(`[${submissionId}] Performance score: ${performanceResult.score}/15`);

    try {
      const fnTests  = spec.functionalityTests ?? [];
      const intTests = spec.interactionTests ?? [];
      const alignTests = (spec.styleTests ?? []).filter(t => t.type === 'alignCenterApprox');

      console.log(`[${submissionId}] Running functionality (${fnTests.length}), interaction (${intTests.length}), visual tests in parallel...`);

      // ── 5-7. Run all 3 test buckets in parallel ──────────────────────────
      // Each bucket creates its own isolated BrowserContext — no shared state.
      const [fnResult, intResult, visResult] = await Promise.all([

        // ── Functionality + alignCenterApprox (40 marks) ──────────────────
        (async () => {
          const t = Date.now();
          const result = await runFunctionalityTests(browser, fileUrl, fnTests, allowedDomains, allowedUrlPrefixes, spec.timeoutMs ?? 30000);
          if (alignTests.length > 0) {
            const alignResults = await runAlignCenterTests(browser, fileUrl, alignTests, allowedDomains);
            result.tests.push(...alignResults);
            result.earned = (result.earned ?? 0) + alignResults.reduce((s, r) => s + (r.earned ?? 0), 0);
            result.rawMax = (result.rawMax ?? 0) + alignResults.reduce((s, r) => s + (r.weight ?? 0), 0);
          }
          timing.functionality = Date.now() - t;
          return result;
        })(),

        // ── Interaction (15 marks) ─────────────────────────────────────────
        (async () => {
          const t = Date.now();
          const result = intTests.length > 0
            ? await runInteractionTests(browser, fileUrl, intTests, allowedDomains, allowedUrlPrefixes)
            : [];
          timing.interaction = Date.now() - t;
          return result;
        })(),

        // ── Visual (20 marks) ─────────────────────────────────────────────
        (async () => {
          const t = Date.now();
          const result = await runVisualTest(browser, {
            pageFilePaths,
            submissionId,
            assignmentId,
            industrySlug,
            referencePages: resolveReferencePages(assignment),
            allowedDomains,
            allowedUrlPrefixes
          });
          timing.visual = Date.now() - t;
          return result;
        })()
      ]);

      functionalityResult = fnResult;
      interactionResults  = intResult;
      visualResult        = visResult;

      console.log(`[${submissionId}] Functionality score: ${functionalityResult.score}/40`);

      // ── DOM snapshot (optional — only if captureDomSnapshot is set) ──────
      if (spec.captureDomSnapshot) {
        try {
          const snapPage = await browser.newPage();
          await snapPage.goto(fileUrl, { waitUntil: 'networkidle0', timeout: spec.timeoutMs ?? 30000 });
          const domHtml = await snapPage.content();
          await snapPage.close();
          const snapshotFolder = industrySlug
            ? `industries/${industrySlug}/submissions/${submissionId}`
            : `submissions/${assignmentId}`;
          domSnapshotUrl = await uploadRawText(
            domHtml,
            snapshotFolder,
            `dom_${submissionId}`
          );
        } catch (err) {
          console.warn(`[${submissionId}] DOM snapshot failed:`, err.message);
        }
      }
    } finally {
      await browser.close();
    }

  } finally {
    await cleanupPage(dir);
  }
  timing.total = Date.now() - tTotal;

  // ── 8. Calculate final score ───────────────────────────────────────────
  const breakdown = calculateScore({
    linterResult,
    functionalityResult,
    interactionResults,
    visualResult,
    performanceResult
  });

  console.log(`[${submissionId}] Final score: ${breakdown.totalScore}/100`);

  // ── 9. Look up existing progress for this student+assignment ─────────────
  const studentId = submission.studentId;
  const existing = await StudentProgress.findOne({ studentId, assignmentId });
  const prevBest = existing?.bestScore ?? -1;
  const newScore = breakdown.totalScore;
  const isBetter = newScore > prevBest;

  console.log(`[${submissionId}] Score: ${newScore} | Prev best: ${prevBest === -1 ? 'none' : prevBest} | Better: ${isBetter}`);

  // Always create the EvaluationRun so the student can fetch their result right now
  await EvaluationRun.create({
    submissionId,
    completedAt: new Date(),
    totalScore: newScore,
    domSnapshotUrl,
    breakdown: {
      linter: breakdown.linter,
      functionality: breakdown.functionality,
      interaction: breakdown.interaction,
      visual: breakdown.visual,
      performance: breakdown.performance,
      timing
    }
  });

  // ── 10. Upsert StudentProgress ──────────────────────────────────
  const now = new Date();
  const progressUpdate = {
    $inc: { attempts: 1 },
    $set: {
      updatedAt: now,
      lastSubmissionId: submissionId,
      lastScore: newScore,
      industryId: submission.industryId
    }
  };

  if (isBetter) {
    progressUpdate.$set.bestScore = newScore;
    progressUpdate.$set.bestSubmissionId = submissionId;
    if (newScore >= 50 && !existing?.completed) {
      progressUpdate.$set.completed = true;
      progressUpdate.$set.completedAt = now;
      console.log(`[${submissionId}] Student ${studentId} COMPLETED assignment ${assignmentId} with score ${newScore}`);
    }
  }

  await StudentProgress.findOneAndUpdate(
    { studentId, assignmentId },
    progressUpdate,
    { upsert: true, new: true }
  );

  // ── 11. Notify via Redis → Socket.IO ──────────────────────────────
  await redisPub.publish('eval:done', JSON.stringify({ submissionId }));

  // ── 12. Cleanup — keep only the LAST submission record per student per assignment ──
  // We wait 30 s so the student has time to fetch their result before we delete the old one.
  setTimeout(async () => {
    try {
      const prevLastId = existing?.lastSubmissionId;
      if (prevLastId && prevLastId !== submissionId) {
        await Promise.all([
          EvaluationRun.deleteOne({ submissionId: prevLastId }),
          Submission.deleteOne({ submissionId: prevLastId })
        ]);
        console.log(`[cleanup] Deleted previous submission ${prevLastId} (replaced by ${submissionId})`);
      }
    } catch (err) {
      console.error('[cleanup] Error during submission cleanup:', err.message);
    }
  }, 30_000); // 30-second grace period for the student to fetch results
}
