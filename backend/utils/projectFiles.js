import path from 'path';

export const PROJECT_FILE_SIZE_LIMIT = 500 * 1024;
export const PROJECT_TOTAL_SIZE_LIMIT = 2 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = new Set(['html', 'css', 'js']);

const DEFAULT_FILE_NAMES = {
  html: 'index.html',
  css: 'style.css',
  js: 'main.js'
};

export class ProjectFilesError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ProjectFilesError';
    this.status = 400;
    this.details = details;
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isLegacyFilesObject(value) {
  return isObject(value) && ['html', 'css', 'js'].some((key) => key in value);
}

function legacyObjectToArray(value) {
  return ['html', 'css', 'js']
    .filter((type) => typeof value?.[type] === 'string' && value[type].length > 0)
    .map((type) => ({
      name: DEFAULT_FILE_NAMES[type],
      type,
      content: value[type]
    }));
}

function flattenRawFiles(input) {
  if (Array.isArray(input)) {
    return input.flatMap((item) => (isLegacyFilesObject(item) ? legacyObjectToArray(item) : item));
  }

  if (isLegacyFilesObject(input)) {
    return legacyObjectToArray(input);
  }

  return [];
}

function sanitizeName(name, type, index) {
  const cleaned = String(name || '')
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.trim();

  if (cleaned) return cleaned;
  return `${type || 'file'}-${index + 1}.${type || 'txt'}`;
}

export function inferFileType(name = '', explicitType = '') {
  const normalizedType = String(explicitType || '').trim().toLowerCase();
  if (ALLOWED_FILE_TYPES.has(normalizedType)) return normalizedType;

  const ext = path.extname(String(name)).toLowerCase().replace('.', '');
  return ALLOWED_FILE_TYPES.has(ext) ? ext : null;
}

function normalizeRawFile(file, index) {
  const type = inferFileType(file?.name, file?.type);
  if (!type) return null;

  const content = typeof file?.content === 'string' ? file.content : '';
  return {
    name: sanitizeName(file?.name || DEFAULT_FILE_NAMES[type], type, index),
    type,
    content,
    isMain: Boolean(file?.isMain)
  };
}

function chooseMainFile(files, type) {
  const ofType = files.filter((file) => file.type === type);
  if (ofType.length === 0) return null;

  const explicitMain = ofType.find((file) => file.isMain);
  if (explicitMain) return explicitMain.name;

  const preferredNames = {
    html: ['index.html'],
    css: ['style.css', 'main.css'],
    js: ['main.js', 'script.js', 'app.js', 'index.js']
  };

  const preferred = ofType.find((file) =>
    preferredNames[type].includes(file.name.toLowerCase())
  );

  return (preferred || ofType[0]).name;
}

export function applyMainFileFlags(files) {
  const normalized = files.map((file) => ({ ...file, isMain: false }));

  for (const type of ALLOWED_FILE_TYPES) {
    const mainName = chooseMainFile(normalized, type);
    if (!mainName) continue;

    for (const file of normalized) {
      if (file.type === type && file.name === mainName) {
        file.isMain = true;
      }
    }
  }

  return normalized;
}

export function normalizeStoredFiles(input) {
  const rawFiles = flattenRawFiles(input);
  const normalized = rawFiles
    .map((file, index) => normalizeRawFile(file, index))
    .filter(Boolean);

  return applyMainFileFlags(normalized);
}

export function validateAndNormalizeFiles(input) {
  const rawFiles = flattenRawFiles(input);
  const warnings = [];
  const files = [];
  const seenNames = new Set();
  let totalBytes = 0;

  rawFiles.forEach((rawFile, index) => {
    const normalized = normalizeRawFile(rawFile, index);
    if (!normalized) {
      warnings.push(`Skipped unsupported file "${rawFile?.name || `file-${index + 1}`}"`);
      return;
    }

    const normalizedName = normalized.name.toLowerCase();
    if (seenNames.has(normalizedName)) {
      throw new ProjectFilesError(`Two files named ${normalized.name} found`);
    }
    seenNames.add(normalizedName);

    const fileBytes = Buffer.byteLength(normalized.content, 'utf8');
    if (fileBytes > PROJECT_FILE_SIZE_LIMIT) {
      throw new ProjectFilesError(`${normalized.name} exceeds the 500 KB file size limit`);
    }

    totalBytes += fileBytes;
    if (totalBytes > PROJECT_TOTAL_SIZE_LIMIT) {
      throw new ProjectFilesError('Project exceeds the 2 MB total upload limit');
    }

    files.push(normalized);
  });

  if (!files.some((file) => file.type === 'html')) {
    throw new ProjectFilesError('No HTML file found');
  }

  return {
    files: applyMainFileFlags(files),
    warnings,
    totalBytes
  };
}

export function getMainFile(files, type) {
  return normalizeStoredFiles(files).find((file) => file.type === type && file.isMain) || null;
}

export function sortJavaScriptFiles(files) {
  const first = ['utils', 'helpers', 'constants', 'config'];
  const last = ['main', 'script', 'app', 'index'];

  const score = (name) => {
    const base = name.toLowerCase().replace(/\.js$/, '');
    if (first.includes(base)) return 0;
    if (last.includes(base)) return 2;
    return 1;
  };

  return [...files].sort((a, b) => {
    const scoreDiff = score(a.name) - score(b.name);
    if (scoreDiff !== 0) return scoreDiff;
    if (a.isMain !== b.isMain) return a.isMain ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

export function mergeFilesByType(files, type) {
  const normalized = normalizeStoredFiles(files).filter((file) => file.type === type);
  const ordered = type === 'js' ? sortJavaScriptFiles(normalized) : normalized;

  return ordered
    .map((file) => `/* ${file.name} */\n${file.content}`)
    .join('\n\n');
}

export function getHtmlFiles(files) {
  return normalizeStoredFiles(files).filter((file) => file.type === 'html');
}
