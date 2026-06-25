const COMMON_CDN_DOMAINS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'cdn.tailwindcss.com',
  'code.jquery.com',
  'ajax.googleapis.com',
  'bootstrapcdn.com',
  'stackpath.bootstrapcdn.com',
  'maxcdn.bootstrapcdn.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

function normalizeDomain(domain) {
  return String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^\*\./, '')
    .replace(/\.+$/, '');
}

export function normalizeAllowedDomains(domains = []) {
  const normalized = new Set();

  for (const domain of domains) {
    const clean = normalizeDomain(domain);
    if (clean) normalized.add(clean);
  }

  return Array.from(normalized);
}

// Strict mode: only domains explicitly configured for the assignment are allowed.
export function resolveAllowedDomains(assignmentDomains = []) {
  return normalizeAllowedDomains(Array.isArray(assignmentDomains) ? assignmentDomains : []);
}

function isAllowedHttpUrl(url, allowedDomains) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase();
  return allowedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * Check whether a URL is allowed given:
 *  - allowedDomains:    domain-level list (e.g. ['cdn.jsdelivr.net'])
 *  - allowedUrlPrefixes: versioned URL prefixes from LibraryPolicy
 *    (e.g. ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/'])
 *
 * URL-prefix match takes priority and enforces the exact version.
 * If allowedUrlPrefixes has entries, a CDN request must match one of them
 * even if its domain is in allowedDomains — this prevents loading v5.2 when
 * only v5.3.0 is approved.
 */
export function isRequestAllowed(url, allowedDomains = [], allowedUrlPrefixes = []) {
  // Local files and data URIs are always allowed
  if (url.startsWith('file://') || url.startsWith('data:')) {
    return true;
  }

  // If versioned URL prefixes are configured, check them first
  if (allowedUrlPrefixes.length > 0) {
    if (allowedUrlPrefixes.some((prefix) => url.startsWith(prefix))) return true;
    // Block CDN requests that don't match any approved versioned prefix
    // (even if the domain is in allowedDomains — prevents version drift)
    try {
      const { protocol } = new URL(url);
      if (protocol === 'http:' || protocol === 'https:') {
        // If it would have been allowed by domain, block it — wrong version
        if (isAllowedHttpUrl(url, allowedDomains)) return false;
      }
    } catch { /* not a valid URL */ }
  }

  // Fall back to domain-level check
  return isAllowedHttpUrl(url, allowedDomains);
}

export async function enableRequestWhitelist(page, allowedDomains = [], allowedUrlPrefixes = []) {
  const normalizedDomains = normalizeAllowedDomains(allowedDomains);

  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (isRequestAllowed(req.url(), normalizedDomains, allowedUrlPrefixes)) {
      req.continue();
      return;
    }

    req.abort('blockedbyclient').catch(() => {});
  });
}

export { COMMON_CDN_DOMAINS };
