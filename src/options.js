const state = createOptionsState();

/**
 * Loads saved configuration into the options page state and fills the activation domains textarea.
 *
 * @returns {Promise<void>}
 */
async function loadState() {
  const stored = await chrome.storage.local.get(['activationDomains', 'rules']);
  applyStoredConfig(state, stored);

  document.getElementById('activationDomains').value = state.activationDomains.join('\n');
}

/**
 * Saves activation domains and rules to Chrome local storage so the background worker can rebuild DNR rules.
 *
 * @returns {Promise<void>}
 */
async function saveState() {
  state.activationDomains = parseActivationDomains(document.getElementById('activationDomains').value);

  await chrome.storage.local.set({
    activationDomains: state.activationDomains,
    rules: state.rules,
  });

  renderCounts(state);
  showSaveStatus();
}

/**
 * Renders the options page from the current state and wires rule-level handlers into rendered controls.
 *
 * @returns {void}
 */
function renderPage() {
  renderRules(state, {
    moveRule: handleMoveRule,
    removeRule: handleRemoveRule,
  });
}

function handleAddRule() {
  state.rules.push(createRule(state));
  renderPage();
}

function handleMoveRule(index, offset) {
  moveRule(state.rules, index, offset);
  renderPage();
}

function handleRemoveRule(index) {
  removeRule(state.rules, index);
  renderPage();
}

/**
 * Exports activation domains and rules as a JSON file that can be imported later.
 *
 * @returns {void}
 */
function handleExportConfig() {
  const data = JSON.stringify({
    activationDomains: state.activationDomains,
    rules: state.rules,
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'request-conditions-config.json';
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Imports a JSON configuration file and replaces the current options state after confirmation.
 *
 * @param {File} file JSON config file selected by the user.
 * @returns {void}
 */
function handleImportConfig(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!confirm('Import will fully replace the current settings. Continue?')) return;

      applyImportedConfig(state, parsed);
      document.getElementById('activationDomains').value = state.activationDomains.join('\n');
      renderPage();
    } catch (error) {
      alert('Invalid JSON file: ' + error.message);
    }
  };

  reader.readAsText(file);
}

/**
 * Binds the static options page controls for adding rules, saving, and import/export.
 *
 * @returns {void}
 */
function bindPageEvents() {
  document.getElementById('addRule').addEventListener('click', handleAddRule);
  document.getElementById('activationDomains').addEventListener('input', () => {
    renderCounts(state);
  });
  document.getElementById('save').addEventListener('click', saveState);
  document.getElementById('exportBtn').addEventListener('click', handleExportConfig);
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', (event) => {
    if (event.target.files[0]) {
      handleImportConfig(event.target.files[0]);
    }
    event.target.value = '';
  });
}

async function main() {
  bindPageEvents();
  await loadState();
  renderPage();
}

main();
