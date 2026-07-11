/**
 * DEV-ONLY REQUEST ANALYZER
 *
 * This file is not part of the extension product. It is a temporary development
 * helper for capturing request timelines while researching how a site loads
 * media, metadata, tracking, and ad-related resources.
 *
 * The analyzer is intentionally configured directly in this file.
 * It has no UI, no user-facing settings.
 *
 * Goal:
 *
 * - collect a JSON log of matching browser requests;
 * - preserve raw request URLs exactly as Chrome reports them;
 * - add parsed URL fields for easier analysis;
 * - save the collected log as a JSON file through the browser downloads API.
 *
 * Manual setup:
 *
 * 1. Add this file to `src/background.js`:
 *
 *    importScripts(
 *      'shared.js',
 *      'background-dnr.js',
 *      'dev/request-analyzer.js'
 *    );
 *
 * 2. Add temporary development permissions to `src/manifest.json`:
 *
 *    "permissions": [
 *      "storage",
 *      "declarativeNetRequest",
 *      "webRequest",
 *      "downloads"
 *    ],
 *    "host_permissions": [
 *      "*://*.youtube.com/*",
 *      "*://*.googlevideo.com/*",
 *      "*://*.doubleclick.net/*",
 *      "*://*.googleads.g.doubleclick.net/*"
 *    ]
 *
 * 3. Reload the unpacked extension from `chrome://extensions`.
 *
 * 4. Open a target page and reproduce the loading scenario.
 *
 * 5. Export the collected log from the extension service worker console.
 *
 *    Open the correct console here:
 *
 *    chrome://extensions
 *    -> Request Conditions
 *    -> service worker / Inspect views
 *    -> Console
 *
 *    Do not run this command in the YouTube page console. The analyzer is loaded
 *    in the extension service worker, so `DEV_REQUEST_ANALYZER` exists only there.
 *
 *    Then run:
 *
 *    await DEV_REQUEST_ANALYZER.saveLogFile()
 *
 *    The analyzer saves the JSON file through the browser downloads API using
 *    `DEV_REQUEST_ANALYZER_CONFIG.outputFileName`.
 *
 * 6. Optional console helpers:
 *
 *    await DEV_REQUEST_ANALYZER.getLog()
 *    await DEV_REQUEST_ANALYZER.getStats()
 *    await DEV_REQUEST_ANALYZER.clearLog()
 *
 * 7. Revert the temporary manifest/background changes before normal use.
 *
 * Notes:
 *
 * - This helper uses passive observation only. It does not block or redirect.
 * - Full request capture requires temporary `webRequest`, `downloads`, and host permissions.
 * - The production extension should not keep those temporary permissions.
 * - Normal DNR rules are automatically cleared during capture when
 *   `disableDnrRules` is true and this file is loaded by `background.js`.
 */

const DEV_REQUEST_ANALYZER_CONFIG = {
  enabled: true,
  // Automatically clears dynamic DNR rules through the dev hook in background.js.
  disableDnrRules: true,
  storageKey: 'devRequestAnalyzerLog',
  outputFileName: 'youtube-request-analyzer-log.json',
  maxEntries: 3000,
  captureSeconds: 90,
  hostIncludes: [
    'youtube.com',
    'googlevideo.com',
    'doubleclick.net',
    'googleads',
  ],
};

const DEV_REQUEST_ANALYZER_STATE = {
  startedAt: Date.now(),
  writeQueue: Promise.resolve(),
};

/**
 * Starts passive request capture with the current analyzer configuration.
 *
 * @returns {Promise<void>}
 */
async function startDevRequestAnalyzer() {
  if (!DEV_REQUEST_ANALYZER_CONFIG.enabled) {
    return;
  }

  chrome.webRequest.onBeforeRequest.addListener(handleDevAnalyzerRequest, {
    urls: ['<all_urls>'],
  });
}

/**
 * Captures one request event when it matches the configured host and time filters.
 *
 * @param {object} details Chrome webRequest onBeforeRequest details.
 * @returns {void}
 */
function handleDevAnalyzerRequest(details) {
  if (!shouldCaptureDevRequest(details)) {
    return;
  }

  enqueueDevAnalyzerEntry(buildDevAnalyzerEntry(details));
}

/**
 * Decides whether a request should be written to the dev analyzer log.
 *
 * @param {object} details Chrome webRequest onBeforeRequest details.
 * @returns {boolean} True when the request is inside the capture window and matches host filters.
 */
function shouldCaptureDevRequest(details) {
  if (!DEV_REQUEST_ANALYZER_CONFIG.enabled) {
    return false;
  }

  if (isDevAnalyzerCaptureExpired()) {
    return false;
  }

  return getDevAnalyzerCandidateHosts(details).some((host) => {
    return DEV_REQUEST_ANALYZER_CONFIG.hostIncludes.some((hostPart) => host.includes(hostPart));
  });
}

/**
 * Checks whether the configured capture window has elapsed.
 *
 * @returns {boolean} True when new requests should no longer be captured.
 */
function isDevAnalyzerCaptureExpired() {
  const elapsedMs = Date.now() - DEV_REQUEST_ANALYZER_STATE.startedAt;
  return elapsedMs > DEV_REQUEST_ANALYZER_CONFIG.captureSeconds * 1000;
}

/**
 * Extracts hostnames that can associate a request with the page, initiator, or URL itself.
 *
 * @param {object} details Chrome webRequest onBeforeRequest details.
 * @returns {string[]} Candidate hostnames.
 */
function getDevAnalyzerCandidateHosts(details) {
  return [
    getDevAnalyzerHostname(details.url),
    getDevAnalyzerHostname(details.initiator),
    getDevAnalyzerHostname(details.documentUrl),
  ].filter(Boolean);
}

/**
 * Parses a hostname from a URL-like string.
 *
 * @param {string|undefined} url URL reported by Chrome.
 * @returns {string|null} Hostname, or null for missing/invalid URLs.
 */
function getDevAnalyzerHostname(url) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url).hostname;
  } catch (error) {
    return null;
  }
}

/**
 * Builds one JSON-serializable log entry from a Chrome request event.
 *
 * @param {object} details Chrome webRequest onBeforeRequest details.
 * @returns {object} Analyzer log entry.
 */
function buildDevAnalyzerEntry(details) {
  const parsedUrl = parseDevAnalyzerUrl(details.url);

  return {
    loggedAt: new Date().toISOString(),
    elapsedMs: Date.now() - DEV_REQUEST_ANALYZER_STATE.startedAt,
    timeStamp: details.timeStamp,
    requestId: details.requestId,
    tabId: details.tabId,
    frameId: details.frameId,
    parentFrameId: details.parentFrameId,
    type: details.type,
    method: details.method,
    url: details.url,
    initiator: details.initiator || null,
    documentUrl: details.documentUrl || null,
    host: parsedUrl.host,
    path: parsedUrl.path,
    query: parsedUrl.query,
    queryParams: parsedUrl.queryParams,
  };
}

/**
 * Parses request URL parts while preserving the raw URL in the parent log entry.
 *
 * @param {string} url Raw request URL.
 * @returns {{host: string|null, path: string|null, query: string|null, queryParams: object}} Parsed URL fields.
 */
function parseDevAnalyzerUrl(url) {
  try {
    const parsedUrl = new URL(url);

    return {
      host: parsedUrl.hostname,
      path: parsedUrl.pathname,
      query: parsedUrl.search,
      queryParams: Object.fromEntries(parsedUrl.searchParams.entries()),
    };
  } catch (error) {
    return {
      host: null,
      path: null,
      query: null,
      queryParams: {},
    };
  }
}

/**
 * Serializes storage writes so concurrent request events do not overwrite each other.
 *
 * @param {object} entry Analyzer log entry.
 * @returns {void}
 */
function enqueueDevAnalyzerEntry(entry) {
  DEV_REQUEST_ANALYZER_STATE.writeQueue = DEV_REQUEST_ANALYZER_STATE.writeQueue
    .then(() => appendDevAnalyzerEntry(entry))
    .catch(() => appendDevAnalyzerEntry(entry));
}

/**
 * Appends one entry to the persisted analyzer log and keeps only the newest configured entries.
 *
 * @param {object} entry Analyzer log entry.
 * @returns {Promise<void>}
 */
async function appendDevAnalyzerEntry(entry) {
  const log = await getDevAnalyzerLog();
  const nextLog = [...log, entry].slice(-DEV_REQUEST_ANALYZER_CONFIG.maxEntries);

  await chrome.storage.local.set({
    [DEV_REQUEST_ANALYZER_CONFIG.storageKey]: nextLog,
  });
}

/**
 * Reads the persisted analyzer log from extension local storage.
 *
 * @returns {Promise<object[]>} Analyzer log entries.
 */
async function getDevAnalyzerLog() {
  const result = await chrome.storage.local.get([DEV_REQUEST_ANALYZER_CONFIG.storageKey]);
  return result[DEV_REQUEST_ANALYZER_CONFIG.storageKey] || [];
}

/**
 * Clears the persisted analyzer log.
 *
 * @returns {Promise<void>}
 */
async function clearDevAnalyzerLog() {
  await chrome.storage.local.set({
    [DEV_REQUEST_ANALYZER_CONFIG.storageKey]: [],
  });
}

/**
 * Returns a compact summary of the collected request log.
 *
 * @returns {Promise<object>} Analyzer log statistics.
 */
async function getDevAnalyzerStats() {
  const log = await getDevAnalyzerLog();
  const byType = {};
  const byHost = {};

  for (const entry of log) {
    byType[entry.type] = (byType[entry.type] || 0) + 1;
    byHost[entry.host] = (byHost[entry.host] || 0) + 1;
  }

  return {
    entries: log.length,
    captureSeconds: DEV_REQUEST_ANALYZER_CONFIG.captureSeconds,
    elapsedMs: Date.now() - DEV_REQUEST_ANALYZER_STATE.startedAt,
    byType,
    byHost,
  };
}

/**
 * Saves the collected analyzer log as a JSON file through the browser downloads API.
 *
 * @returns {Promise<number>} Chrome download id.
 */
async function saveDevAnalyzerLogFile() {
  const log = await getDevAnalyzerLog();
  const payload = {
    exportedAt: new Date().toISOString(),
    config: DEV_REQUEST_ANALYZER_CONFIG,
    stats: await getDevAnalyzerStats(),
    log,
  };
  const json = JSON.stringify(payload, null, 2);
  const url = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);

  return chrome.downloads.download({
    url,
    filename: DEV_REQUEST_ANALYZER_CONFIG.outputFileName,
    saveAs: true,
  });
}

globalThis.DEV_REQUEST_ANALYZER = {
  enabled: DEV_REQUEST_ANALYZER_CONFIG.enabled,
  disableDnrRules: DEV_REQUEST_ANALYZER_CONFIG.disableDnrRules,
  config: DEV_REQUEST_ANALYZER_CONFIG,
  getLog: getDevAnalyzerLog,
  getStats: getDevAnalyzerStats,
  clearLog: clearDevAnalyzerLog,
  saveLogFile: saveDevAnalyzerLogFile,
};

startDevRequestAnalyzer();
