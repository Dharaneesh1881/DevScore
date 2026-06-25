/**
 * One-time script to capture the baseline screenshot of the Quiz project.
 *
 * Usage:
 *   1. Clone https://github.com/Dharaneesh1881/Quiz to a local directory
 *   2. Set QUIZ_REPO_PATH below to that directory path
 *   3. Run: node backend/scripts/captureBaseline.js
 */

import 'dotenv/config';
import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Path to a local clone of https://github.com/Dharaneesh1881/Quiz
const QUIZ_REPO_PATH = process.env.QUIZ_REPO_PATH || path.join(__dirname, '..', '..', '..', 'Quiz');
const OUTPUT_PATH = path.join(__dirname, '..', 'baselines', 'quiz_baseline.png');

async function main() {
  const indexHtml = path.join(QUIZ_REPO_PATH, 'index.html');

  if (!await fs.pathExists(indexHtml)) {
    console.error(`Quiz index.html not found at: ${indexHtml}`);
    console.error('Please clone https://github.com/Dharaneesh1881/Quiz and set QUIZ_REPO_PATH');
    process.exit(1);
  }

  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(`file://${indexHtml}`, { waitUntil: 'networkidle0', timeout: 10000 });

  // Brief pause for fonts / styles to settle
  await new Promise(r => setTimeout(r, 500));

  await fs.ensureDir(path.dirname(OUTPUT_PATH));
  const screenshot = await page.screenshot({ fullPage: false });
  await fs.writeFile(OUTPUT_PATH, screenshot);

  await browser.close();
  console.log('Baseline screenshot saved to:', OUTPUT_PATH);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
