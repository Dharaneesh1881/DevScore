const ALLOWED_TYPES = new Set(['html', 'css', 'js']);

const DEFAULT_FILE_NAMES = {
  html: 'index.html',
  css: 'style.css',
  js: 'main.js'
};

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

function flattenInput(input) {
  if (Array.isArray(input)) {
    return input.flatMap((item) => (isLegacyFilesObject(item) ? legacyObjectToArray(item) : item));
  }

  if (isLegacyFilesObject(input)) {
    return legacyObjectToArray(input);
  }

  return [];
}

export function inferFileType(name = '', explicitType = '') {
  const normalizedType = String(explicitType || '').trim().toLowerCase();
  if (ALLOWED_TYPES.has(normalizedType)) return normalizedType;

  const extension = String(name).toLowerCase().split('.').pop();
  return ALLOWED_TYPES.has(extension) ? extension : null;
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

function chooseMainFile(files, type) {
  const ofType = files.filter((file) => file.type === type);
  if (ofType.length === 0) return null;

  const explicitMain = ofType.find((file) => file.isMain);
  if (explicitMain) return explicitMain.name;

  const preferredByType = {
    html: ['index.html'],
    css: ['style.css', 'main.css'],
    js: ['main.js', 'script.js', 'app.js', 'index.js']
  };

  const preferred = ofType.find((file) =>
    preferredByType[type].includes(file.name.toLowerCase())
  );

  return (preferred || ofType[0]).name;
}

export function applyMainFlags(files) {
  const normalized = files.map((file) => ({ ...file, isMain: false }));

  for (const type of ALLOWED_TYPES) {
    const mainName = chooseMainFile(normalized, type);
    if (!mainName) continue;

    normalized.forEach((file) => {
      if (file.type === type && file.name === mainName) {
        file.isMain = true;
      }
    });
  }

  return normalized;
}

export function normalizeProjectFiles(input) {
  const flattened = flattenInput(input);
  const normalized = flattened
    .map((file, index) => {
      const type = inferFileType(file?.name, file?.type);
      if (!type) return null;

      return {
        name: sanitizeName(file?.name || DEFAULT_FILE_NAMES[type], type, index),
        type,
        content: typeof file?.content === 'string' ? file.content : '',
        isMain: Boolean(file?.isMain)
      };
    })
    .filter(Boolean);

  return applyMainFlags(normalized);
}

export function mergeProjectFiles(existingFiles, incomingFiles) {
  const merged = new Map(
    normalizeProjectFiles(existingFiles).map((file) => [file.name.toLowerCase(), file])
  );

  normalizeProjectFiles(incomingFiles).forEach((file) => {
    merged.set(file.name.toLowerCase(), file);
  });

  return applyMainFlags(Array.from(merged.values()));
}

export function updateProjectFileContent(files, fileName, content) {
  return normalizeProjectFiles(files).map((file) =>
    file.name === fileName ? { ...file, content } : file
  );
}

export function removeProjectFile(files, fileName) {
  return applyMainFlags(
    normalizeProjectFiles(files).filter((file) => file.name !== fileName)
  );
}

export function setProjectMainFile(files, fileName) {
  const normalized = normalizeProjectFiles(files);
  const target = normalized.find((file) => file.name === fileName);
  if (!target) return normalized;

  return normalized.map((file) => {
    if (file.type !== target.type) return file;
    return { ...file, isMain: file.name === fileName };
  });
}

export function hasHtmlFile(files) {
  return normalizeProjectFiles(files).some((file) => file.type === 'html');
}

export function formatFileSize(content = '') {
  const bytes = new TextEncoder().encode(content).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const STARTER_CONTENT = {
  html: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>Project</title>\n</head>\n<body>\n  <main>\n    <h1>Hello</h1>\n  </main>\n</body>\n</html>\n',
  css: 'body {\n  margin: 0;\n  font-family: sans-serif;\n}\n',
  js: 'console.log("Ready");\n'
};

function uniqueFileName(files, type) {
  const normalized = normalizeProjectFiles(files);
  const existingNames = new Set(normalized.map((file) => file.name.toLowerCase()));

  const presets = {
    html: ['index.html', 'page-2.html', 'page-3.html'],
    css: ['style.css', 'theme.css', 'layout.css'],
    js: ['main.js', 'utils.js', 'app.js']
  };

  for (const candidate of presets[type]) {
    if (!existingNames.has(candidate.toLowerCase())) return candidate;
  }

  let counter = normalized.filter((file) => file.type === type).length + 1;
  while (existingNames.has(`${type}-${counter}.${type}`.toLowerCase())) {
    counter += 1;
  }
  return `${type}-${counter}.${type}`;
}

export function createProjectFile(files, type) {
  const nextFile = {
    name: uniqueFileName(files, type),
    type,
    content: STARTER_CONTENT[type],
    isMain: false
  };

  return mergeProjectFiles(files, [nextFile]);
}

export function createStarterProject(files) {
  let nextFiles = normalizeProjectFiles(files);

  for (const type of ['html', 'css', 'js']) {
    if (!nextFiles.some((file) => file.type === type)) {
      nextFiles = createProjectFile(nextFiles, type);
    }
  }

  return nextFiles;
}
