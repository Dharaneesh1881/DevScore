import { enableRequestWhitelist } from '../networkPolicy.js';

async function setupPage(browser, url, allowedDomains = []) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await enableRequestWhitelist(page, allowedDomains);

  await page.setViewport({ width: 1280, height: 720 });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });
  return { context, page };
}

export async function runStyleTests(browser, url, tests, allowedDomains = []) {
  const { context, page } = await setupPage(browser, url, allowedDomains);

  const results = [];
  for (const test of tests) {
    try {
      const value = await page.evaluate((sel, prop) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        return window.getComputedStyle(el).getPropertyValue(prop);
      }, test.selector, test.property);

      const passed = value !== null && test.check(value);
      results.push({ name: test.name, passed, weight: test.weight, earned: passed ? test.weight : 0 });
    } catch {
      results.push({ name: test.name, passed: false, weight: test.weight, earned: 0 });
    }
  }

  await context.close();
  return results;
}

/**
 * runAlignCenterTests — checks that an element's horizontal centre is within
 * tolerancePx pixels of its parent element's horizontal centre.
 *
 * Test entry shape: { name, selector, tolerancePx, weight }
 */
export async function runAlignCenterTests(browser, url, tests, allowedDomains = []) {
  const { context, page } = await setupPage(browser, url, allowedDomains);

  const results = [];
  for (const test of tests) {
    try {
      const result = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { found: false };
        const parent = el.parentElement;
        if (!parent) return { found: false, noParent: true };
        const elRect     = el.getBoundingClientRect();
        const parentRect = parent.getBoundingClientRect();
        const elCenterX     = elRect.left + elRect.width / 2;
        const parentCenterX = parentRect.left + parentRect.width / 2;
        return { found: true, diff: Math.abs(elCenterX - parentCenterX) };
      }, test.selector);

      const tol = typeof test.tolerancePx === 'number' ? test.tolerancePx : 10;
      const passed = result.found && result.diff <= tol;
      results.push({
        name: test.name,
        passed,
        weight: test.weight,
        earned: passed ? test.weight : 0,
        detail: result.found ? `center offset: ${result.diff?.toFixed(1)}px (tolerance: ${tol}px)` : 'element not found'
      });
    } catch {
      results.push({ name: test.name, passed: false, weight: test.weight, earned: 0 });
    }
  }

  await context.close();
  return results;
}
