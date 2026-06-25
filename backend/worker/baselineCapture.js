import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import { uploadScreenshot } from '../utils/cloudinary.js';
import { enableRequestWhitelist } from './networkPolicy.js';
import {
  VIEWPORTS,
  captureViewportScreenshot,
  getPageCaptureTargets,
  preparePageForScreenshot
} from './screenshotCapture.js';

/**
 * Captures reference (baseline) screenshots for an assignment across all
 * configured viewports and scroll positions.
 *
 * @param {object} opts
 * @param {object}   opts.bundle           - bundler result with bundle.pages[]
 * @param {object}   opts.pageFilePaths    - map of pageName → absolute file path
 * @param {string}   opts.assignmentId     - used as Cloudinary folder
 * @param {string[]} opts.viewportNames    - e.g. ['desktop', 'mobile']
 * @param {string[]} opts.allowedDomains   - CDN domain whitelist
 * @param {string[]} opts.allowedUrlPrefixes - versioned URL prefix whitelist
 * @returns {{ referenceScreenshotUrl, referenceScreenshots, referencePageScreenshots }}
 */
export async function captureBaseline({
  bundle,
  pageFilePaths,
  assignmentId,
  viewportNames = ['desktop'],
  allowedDomains = [],
  allowedUrlPrefixes = []
}) {
  let referenceScreenshotUrl = null;
  const referenceScreenshots = [];
  const referencePageScreenshots = [];

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    for (const vp of viewportNames) {
      const viewport = VIEWPORTS[vp] ?? VIEWPORTS.desktop;
      const page = await browser.newPage();
      await page.setViewport(viewport);
      await enableRequestWhitelist(page, allowedDomains, allowedUrlPrefixes);

      for (const bundledPage of bundle.pages) {
        const pagePath = pageFilePaths[bundledPage.name];
        await preparePageForScreenshot(page, `file://${pagePath}`, 10000);
        const captureTargets = await getPageCaptureTargets(page);
        const safePageName = bundledPage.name.replace(/[^\w.-]+/g, '_');

        for (let i = 0; i < captureTargets.length; i++) {
          const capture = captureTargets[i];
          const buffer = await captureViewportScreenshot(page, capture.scrollY, 'png');
          const url = await uploadScreenshot(
            buffer,
            `assignments/${assignmentId}`,
            `reference_${safePageName}_${capture.key}_${vp}`
          );

          const isMain = bundledPage.isMain && i === 0 && vp === viewportNames[0];

          referencePageScreenshots.push({
            pageName: bundledPage.name,
            url,
            captureKey: capture.key,
            captureLabel: capture.label,
            scrollY: capture.scrollY,
            isMain,
            viewport: vp
          });
          referenceScreenshots.push(url);

          if (isMain) {
            referenceScreenshotUrl = url;
          }
        }
      }

      await page.close();
    }
  } finally {
    await browser.close();
    await fs.remove(`/tmp/eval-baseline-${assignmentId}`).catch(() => {});
  }

  return { referenceScreenshotUrl, referenceScreenshots, referencePageScreenshots };
}
