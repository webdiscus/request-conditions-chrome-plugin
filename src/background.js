importScripts(
  'shared.js',
  'background-dnr.js',
  //'dev/request-analyzer.js', // TODO: remove for prod!
);

/**
 * Loads activation domains and request rules from Chrome local storage.
 *
 * @returns {Promise<{activationDomains: string[], rules: Array<object>}>} Stored extension configuration.
 */
async function loadConfig() {
  const { activationDomains = [], rules = [] } = await chrome.storage.local.get([
    'activationDomains',
    'rules'
  ]);

  return { activationDomains, rules };
}

/**
 * Rebuilds and installs all dynamic DNR rules from the saved extension configuration.
 *
 * @returns {Promise<void>}
 */
async function applyRules() {
  if (shouldSkipRuleApplication()) {
    await replaceDynamicRules([]);
    return;
  }

  const config = await loadConfig();
  const dnrRules = buildDnrRules(config.rules, config.activationDomains);

  await replaceDynamicRules(dnrRules);
}

/**
 * Dev-only hook used by `src/dev/request-analyzer.js`.
 *
 * In normal extension builds `globalThis.DEV_REQUEST_ANALYZER` is undefined,
 * so this function returns false and rule application works normally.
 *
 * When the dev analyzer is manually imported, it can set
 * `DEV_REQUEST_ANALYZER.enabled` and `DEV_REQUEST_ANALYZER.disableDnrRules`
 * to temporarily clear dynamic DNR rules while raw requests are captured.
 *
 * @returns {boolean} True when the dev analyzer asks to disable DNR rules.
 */
function shouldSkipRuleApplication() {
  const analyzer = globalThis.DEV_REQUEST_ANALYZER;

  return Boolean(analyzer && analyzer.enabled && analyzer.disableDnrRules);
}

/**
 * Replaces all existing dynamic DNR rules with the generated rule set.
 *
 * @param {Array<object>} dnrRules Chrome DNR dynamic rules.
 * @returns {Promise<void>}
 */
async function replaceDynamicRules(dnrRules) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: dnrRules,
  });
}

function registerStorageListener() {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.rules || changes.activationDomains)) {
      applyRules();
    }
  });
}

function registerLifecycleListeners() {
  chrome.runtime.onInstalled.addListener(applyRules);
  chrome.runtime.onStartup.addListener(applyRules);
}

function main() {
  registerStorageListener();
  registerLifecycleListeners();
}

main();
