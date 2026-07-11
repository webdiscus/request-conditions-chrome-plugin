/**
 * Checks whether a tab hostname is covered by an activation domain, including subdomains.
 *
 * @param {string} hostname Current tab hostname.
 * @param {string} domain Activation domain from extension settings.
 * @returns {boolean} True when the hostname is the domain or one of its subdomains.
 */
function hostMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith('.' + domain);
}

/**
 * Reads the active tab from the current browser window.
 *
 * @returns {Promise<object|undefined>} Active Chrome tab.
 */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Loads the configured activation domains used to decide popup active/inactive status.
 *
 * @returns {Promise<string[]>} Activation domains from local storage.
 */
async function getActivationDomains() {
  const { activationDomains = [] } = await chrome.storage.local.get(['activationDomains']);
  return activationDomains;
}

/**
 * Extracts a normal hostname from the tab URL and ignores browser-internal URLs.
 *
 * @param {object|undefined} tab Active Chrome tab.
 * @returns {string|null} Hostname, or null when the URL cannot be parsed.
 */
function getTabHostname(tab) {
  if (!tab || !tab.url) {
    return null;
  }

  try {
    return new URL(tab.url).hostname;
  } catch (error) {
    return null;
  }
}

/**
 * Determines whether Request Conditions is active for the current tab.
 *
 * @param {object|undefined} tab Active Chrome tab.
 * @param {string[]} activationDomains Configured activation domains.
 * @returns {boolean} True when the current tab hostname matches an activation domain.
 */
function isActiveOnTab(tab, activationDomains) {
  const hostname = getTabHostname(tab);

  if (!hostname) {
    return false;
  }

  return activationDomains.some((domain) => hostMatches(hostname, domain));
}

/**
 * Updates the popup status label.
 *
 * @param {boolean} active Whether the extension is active on the current tab.
 * @returns {void}
 */
function setStatus(active) {
  const status = document.getElementById('status');

  if (active) {
    status.textContent = 'Active on this tab';
    status.className = 'active';
    return;
  }

  status.textContent = 'Not active on this tab';
  status.className = 'inactive';
}

async function renderStatus() {
  const tab = await getActiveTab();
  const activationDomains = await getActivationDomains();

  setStatus(isActiveOnTab(tab, activationDomains));
}

function bindEvents() {
  document.getElementById('openOptions').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

async function main() {
  bindEvents();
  await renderStatus();
}

main();
