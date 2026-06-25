import { enableRequestWhitelist } from '../networkPolicy.js';

async function setupPage(browser, url, allowedDomains = []) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  await enableRequestWhitelist(page, allowedDomains);

  await page.goto(url, { waitUntil: 'networkidle0', timeout: 8000 });
  return { context, page };
}

export async function runDomTests(browser, url, tests, allowedDomains = []) {
  const { context, page } = await setupPage(browser, url, allowedDomains);

  const results = [];
  for (const test of tests) {
    try {
      const element = await page.$(test.selector);
      let passed = element !== null;

      if (passed && test.textContains) {
        const text = await page.$eval(test.selector, el => el.textContent);
        passed = text.includes(test.textContains);
      }

      results.push({ name: test.name, passed, weight: test.weight, earned: passed ? test.weight : 0 });
    } catch {
      results.push({ name: test.name, passed: false, weight: test.weight, earned: 0 });
    }
  }

  await context.close();
  return results;
}
