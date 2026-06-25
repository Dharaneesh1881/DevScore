import fs from 'fs-extra';
import path from 'path';
import { bundleProjectPages } from './bundler.js';

export async function buildPage(submissionId, files) {
  const dir = path.join('/tmp', `eval-${submissionId}`);
  await fs.ensureDir(dir);

  const bundle = bundleProjectPages(files);
  const pageFilePaths = {};

  for (const page of bundle.pages) {
    const pagePath = path.join(dir, page.name);
    await fs.ensureDir(path.dirname(pagePath));
    await fs.writeFile(pagePath, page.html, 'utf-8');
    pageFilePaths[page.name] = pagePath;
  }

  const filePath = pageFilePaths[bundle.mainPage.name];
  return { filePath, dir, bundle, pageFilePaths };
}

export async function cleanupPage(dir) {
  await fs.remove(dir);
}
