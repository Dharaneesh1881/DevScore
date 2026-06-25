import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { uploadScreenshot, downloadImageAsBuffer } from '../utils/cloudinary.js';
import { enableRequestWhitelist } from './networkPolicy.js';
import {
  VIEWPORTS,
  captureViewportScreenshot,
  formatCaptureName,
  preparePageForScreenshot
} from './screenshotCapture.js';

// ── Nearest-neighbour resize (no extra deps — uses pngjs only) ─────────────
function resizePNG(src, targetW, targetH) {
  const dst = new PNG({ width: targetW, height: targetH });
  const scaleX = src.width / targetW;
  const scaleY = src.height / targetH;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(Math.floor(x * scaleX), src.width - 1);
      const sy = Math.min(Math.floor(y * scaleY), src.height - 1);
      const si = (sy * src.width + sx) * 4;
      const di = (y * targetW + x) * 4;
      dst.data[di]     = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
  return dst;
}

// ── Dual-metric diff: 70% layout (pixelmatch) + 30% color accuracy ─────────
function computeDiff(img1, img2) {
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numMismatched = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
  const totalPixels = width * height;

  // Layout diff: pixel-level mismatch ratio
  const layoutDiffPct = Math.round((numMismatched / totalPixels) * 10000) / 100;

  // Color accuracy: per-channel average absolute difference (0–100 scale)
  let colorSum = 0;
  for (let i = 0; i < img1.data.length; i += 4) {
    colorSum += (
      Math.abs(img1.data[i]     - img2.data[i])   +   // R
      Math.abs(img1.data[i + 1] - img2.data[i + 1]) + // G
      Math.abs(img1.data[i + 2] - img2.data[i + 2])   // B
    ) / (3 * 255);
  }
  const colorDiffPct = parseFloat(((colorSum / totalPixels) * 100).toFixed(2));

  // Combined: 70% layout + 30% color
  const diffPercent = parseFloat((0.7 * layoutDiffPct + 0.3 * colorDiffPct).toFixed(2));
  const diffScore   = Math.max(0, 100 - diffPercent);

  return { diff, diffPercent, diffScore, layoutDiffPct, colorDiffPct };
}

async function setupPage(browser, viewportName = 'desktop', allowedDomains = [], allowedUrlPrefixes = []) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await enableRequestWhitelist(page, allowedDomains, allowedUrlPrefixes);
  await page.setViewport(VIEWPORTS[viewportName] ?? VIEWPORTS.desktop);
  return { context, page };
}

async function capturePageScreenshot(page, url, scrollY = 0) {
  await preparePageForScreenshot(page, url, 8000);
  return captureViewportScreenshot(page, scrollY);
}

export async function runVisualTest(browser, {
  pageFilePaths,
  submissionId,
  assignmentId,
  referencePages = [],
  allowedDomains = [],
  allowedUrlPrefixes = []
}) {
  const noBaseline = {
    diffPercent: 100,
    diffScore: 0,
    studentScreenshotUrl: null,
    referenceScreenshotUrl: null,
    diffImageUrl: null,
    tests: []
  };

  if (!referencePages.length) {
    console.warn('No reference page screenshots — skipping visual test');
    return noBaseline;
  }

  // ── Group reference pages by viewport ───────────────────────────────────
  const byViewport = {};
  for (const ref of referencePages) {
    const vp = ref.viewport ?? 'desktop';
    (byViewport[vp] ??= []).push(ref);
  }

  const studentPageNames = Object.keys(pageFilePaths || {});
  const expectedPageNames = new Set(referencePages.map(r => r.pageName));

  // ── Process each viewport group in parallel ─────────────────────────────
  const viewportResults = await Promise.all(
    Object.entries(byViewport).map(async ([vp, vpPages]) => {
      const { context, page } = await setupPage(browser, vp, allowedDomains, allowedUrlPrefixes);
      const vpResults = [];

      try {
        for (const referencePage of vpPages) {
          const displayName = formatCaptureName(referencePage.pageName, referencePage.captureLabel);
          const localPagePath = pageFilePaths?.[referencePage.pageName];

          if (!localPagePath) {
            vpResults.push({
              pageName: displayName,
              sourcePageName: referencePage.pageName,
              viewport: vp,
              diffPercent: 100,
              diffScore: 0,
              studentScreenshotUrl: null,
              referenceScreenshotUrl: referencePage.url,
              diffImageUrl: null,
              error: 'Student page not found'
            });
            continue;
          }

          // 1. Capture student screenshot (sequential — shares page with other pages in this viewport)
          const screenshotBuffer = await capturePageScreenshot(
            page,
            `file://${localPagePath}`,
            referencePage.scrollY ?? 0
          );

          const studentKey = `student_${submissionId}_${referencePage.pageName.replace(/[^\w.-]+/g, '_')}_${referencePage.captureKey || 'full'}_${vp}`;

          // 2. Upload student screenshot + download reference in parallel (independent I/O)
          let studentScreenshotUrl = null;
          let referenceBuffer = null;
          try {
            const [uploadedUrl, downloadedRef] = await Promise.all([
              uploadScreenshot(Buffer.from(screenshotBuffer), `submissions/${assignmentId}`, studentKey),
              downloadImageAsBuffer(referencePage.url)
            ]);
            studentScreenshotUrl = uploadedUrl;
            referenceBuffer = downloadedRef;
          } catch (err) {
            if (!referenceBuffer) {
              console.error('Failed to download reference screenshot:', err.message);
              vpResults.push({
                pageName: displayName,
                sourcePageName: referencePage.pageName,
                viewport: vp,
                diffPercent: 100,
                diffScore: 0,
                studentScreenshotUrl,
                referenceScreenshotUrl: referencePage.url,
                diffImageUrl: null,
                error: 'Reference screenshot download failed'
              });
              continue;
            }
            console.error('Failed to upload student screenshot:', err.message);
          }

          // 3. Compute pixel diff (CPU-bound, no I/O)
          let img1 = PNG.sync.read(referenceBuffer);
          let img2 = PNG.sync.read(Buffer.from(screenshotBuffer));

          if (img1.width !== img2.width || img1.height !== img2.height) {
            console.warn(`Screenshot dimension mismatch for ${displayName} [${vp}] — resizing student image`);
            img2 = resizePNG(img2, img1.width, img1.height);
          }

          const { diff, diffPercent, diffScore, layoutDiffPct, colorDiffPct } = computeDiff(img1, img2);

          // 4. Upload diff image
          let diffImageUrl = null;
          try {
            const diffBuffer = PNG.sync.write(diff);
            diffImageUrl = await uploadScreenshot(
              diffBuffer,
              `submissions/${assignmentId}`,
              `diff_${submissionId}_${referencePage.pageName.replace(/[^\w.-]+/g, '_')}_${referencePage.captureKey || 'full'}_${vp}`
            );
          } catch (err) {
            console.error('Failed to upload diff image:', err.message);
          }

          vpResults.push({
            pageName: displayName,
            sourcePageName: referencePage.pageName,
            viewport: vp,
            diffPercent,
            diffScore,
            layoutDiffPct,
            colorDiffPct,
            studentScreenshotUrl,
            referenceScreenshotUrl: referencePage.url,
            diffImageUrl
          });
        }
      } finally {
        await context.close();
      }

      return vpResults;
    })
  );

  const results = viewportResults.flat();

  // ── Capture unexpected student pages (desktop context) ──────────────────
  const unexpectedPages = studentPageNames.filter(n => !expectedPageNames.has(n));
  if (unexpectedPages.length > 0) {
    const { context, page } = await setupPage(browser, 'desktop', allowedDomains, allowedUrlPrefixes);
    try {
      for (const pageName of unexpectedPages) {
        let studentScreenshotUrl = null;
        try {
          const screenshotBuffer = await capturePageScreenshot(page, `file://${pageFilePaths[pageName]}`, 0);
          studentScreenshotUrl = await uploadScreenshot(
            Buffer.from(screenshotBuffer),
            `submissions/${assignmentId}`,
            `student_${submissionId}_${pageName.replace(/[^\w.-]+/g, '_')}_unexpected`
          );
        } catch (err) {
          console.error('Failed to capture extra student page screenshot:', err.message);
        }

        results.push({
          pageName,
          sourcePageName: pageName,
          viewport: 'desktop',
          diffPercent: 100,
          diffScore: 0,
          studentScreenshotUrl,
          referenceScreenshotUrl: null,
          diffImageUrl: null,
          error: 'Unexpected extra student page'
        });
      }
    } finally {
      await context.close();
    }
  }

  if (results.length === 0) return noBaseline;

  // ── Find main result for legacy top-level URL fields ────────────────────
  const mainResult = results.find(result =>
    referencePages.find(pageRef => pageRef.pageName === result.sourcePageName && pageRef.isMain)
  ) || results[0];

  const avgDiffPercent = parseFloat(
    (results.reduce((sum, r) => sum + (r.diffPercent ?? 100), 0) / results.length).toFixed(2)
  );
  const avgDiffScore = parseFloat(
    (results.reduce((sum, r) => sum + (r.diffScore ?? 0), 0) / results.length).toFixed(2)
  );

  return {
    diffPercent: avgDiffPercent,
    diffScore: avgDiffScore,
    studentScreenshotUrl: mainResult.studentScreenshotUrl ?? null,
    referenceScreenshotUrl: mainResult.referenceScreenshotUrl ?? null,
    diffImageUrl: mainResult.diffImageUrl ?? null,
    tests: results
  };
}
