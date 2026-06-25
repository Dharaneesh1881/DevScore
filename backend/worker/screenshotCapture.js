export const VIEWPORTS = {
  desktop: { width: 1280, height: 720 },
  mobile:  { width: 390,  height: 844 }
};

export const SCREENSHOT_VIEWPORT = VIEWPORTS.desktop;

const FREEZE_ANIMATIONS_STYLE = '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; animation-delay: 0s !important; transition-delay: 0s !important; }';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dedupeCaptureTargets(captures) {
  const unique = [];

  for (const capture of captures) {
    const alreadyIncluded = unique.some((entry) => Math.abs(entry.scrollY - capture.scrollY) < 24);
    if (!alreadyIncluded) {
      unique.push(capture);
    }
  }

  if (unique.length <= 1) {
    return [{ key: 'full', label: 'Full View', scrollY: 0 }];
  }

  return unique;
}

export function buildCaptureTargets(maxScroll) {
  if (!Number.isFinite(maxScroll) || maxScroll <= 24) {
    return [{ key: 'full', label: 'Full View', scrollY: 0 }];
  }

  return dedupeCaptureTargets([
    { key: 'top', label: 'Top', scrollY: 0 },
    { key: 'middle', label: 'Middle', scrollY: Math.round(maxScroll / 2) },
    { key: 'bottom', label: 'Bottom', scrollY: Math.round(maxScroll) }
  ]);
}

export async function preparePageForScreenshot(page, url, timeout = 8000) {
  await page.goto(url, { waitUntil: 'load', timeout });
  await page.addStyleTag({ content: FREEZE_ANIMATIONS_STYLE }).catch(() => {});
  await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
}

export async function getPageCaptureTargets(page) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollHeight = Math.max(
      doc?.scrollHeight || 0,
      body?.scrollHeight || 0,
      doc?.offsetHeight || 0,
      body?.offsetHeight || 0,
      window.innerHeight || 0
    );

    return {
      viewportHeight: window.innerHeight || doc?.clientHeight || 720,
      scrollHeight
    };
  });

  const maxScroll = Math.max(0, metrics.scrollHeight - metrics.viewportHeight);
  return buildCaptureTargets(maxScroll);
}

export async function captureViewportScreenshot(page, scrollY = 0, type = 'png') {
  await page.evaluate((nextScrollY) => {
    window.scrollTo(0, Math.max(0, nextScrollY));
  }, scrollY);
  await wait(180);
  return page.screenshot({ type, fullPage: false });
}

export function formatCaptureName(pageName, captureLabel) {
  return captureLabel ? `${pageName} · ${captureLabel}` : pageName;
}
