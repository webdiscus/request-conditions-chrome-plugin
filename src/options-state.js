/**
 * Creates the mutable state container used by the options page.
 *
 * @returns {{activationDomains: string[], rules: Array<object>, nextRuleId: number}} Options page state.
 */
function createOptionsState() {
  return {
    activationDomains: [],
    rules: [],
    nextRuleId: 1,
  };
}

/**
 * Creates a new enabled request rule with all resource types selected and header presets disabled.
 *
 * @param {{nextRuleId: number}} state Options page state used to assign the next stable rule id.
 * @returns {object} User-configurable request rule.
 */
function createRule(state) {
  return {
    id: state.nextRuleId++,
    enabled: true,
    regexFilter: '',
    action: 'block',
    resourceTypes: [...RESOURCE_TYPES_ALL],
    redirect: { url: '' },
    modifyHeaders: {
      presets: createHeaderPresetState(),
      custom: [],
    },
  };
}

/**
 * Creates initial state for all built-in modifyHeaders presets.
 *
 * @returns {object} Preset state keyed by preset id.
 */
function createHeaderPresetState() {
  const presets = {};

  for (const [key, preset] of Object.entries(HEADER_PRESETS)) {
    presets[key] = { enabled: false, value: preset.defaultValue };
    if (preset.editableHeaderName) {
      presets[key].headerName = preset.defaultHeaderName;
    }
  }

  return presets;
}

/**
 * Applies saved local-storage data to the options page state.
 *
 * @param {object} state Options page state.
 * @param {object} stored Raw config returned by chrome.storage.local.get().
 * @returns {void}
 */
function applyStoredConfig(state, stored) {
  state.activationDomains = stored.activationDomains || [];
  state.rules = stored.rules && stored.rules.length ? stored.rules : [];
  updateNextRuleId(state);
}

/**
 * Applies imported JSON config and refreshes the next rule id.
 *
 * @param {object} state Options page state.
 * @param {object} config Parsed import file content.
 * @returns {void}
 */
function applyImportedConfig(state, config) {
  state.activationDomains = config.activationDomains || [];
  state.rules = config.rules || [];
  updateNextRuleId(state);
}

function updateNextRuleId(state) {
  state.nextRuleId = state.rules.length ? Math.max(...state.rules.map((rule) => rule.id)) + 1 : 1;
}

/**
 * Parses the activation domain textarea into plain hostnames.
 *
 * @param {string} value Textarea value with one hostname per line.
 * @returns {string[]} Trimmed non-empty hostnames.
 */
function parseActivationDomains(value) {
  return value
    .split('\n')
    .map((domain) => domain.trim())
    .filter(Boolean);
}

/**
 * Moves a rule up or down in the list, which also changes its DNR priority.
 *
 * @param {Array<object>} rules Current rule list.
 * @param {number} index Current rule index.
 * @param {number} offset Movement offset, usually -1 or 1.
 * @returns {void}
 */
function moveRule(rules, index, offset) {
  const nextIndex = index + offset;

  if (nextIndex < 0 || nextIndex >= rules.length) {
    return;
  }

  [rules[index], rules[nextIndex]] = [rules[nextIndex], rules[index]];
}

function removeRule(rules, index) {
  rules.splice(index, 1);
}
