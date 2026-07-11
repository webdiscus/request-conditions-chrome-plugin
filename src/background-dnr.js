/**
 * Builds the dynamic Declarative Net Request rules that implement all enabled user rules.
 * Rules are scoped to activation domains, so an empty domain list intentionally produces no DNR rules.
 *
 * @param {Array<object>} rules User-configured request rules from extension storage.
 * @param {string[]} activationDomains Hostnames where the extension rules are allowed to run.
 * @returns {Array<object>} Chrome DNR dynamic rules ready for updateDynamicRules().
 */
function buildDnrRules(rules, activationDomains) {
  if (!activationDomains.length) {
    return [];
  }

  const dnrRules = [];
  let priority = rules.length;

  for (const rule of rules) {
    const dnrRule = buildDnrRule(rule, activationDomains, priority);
    if (dnrRule) {
      dnrRules.push(dnrRule);
    }
    priority--;
  }

  return dnrRules;
}

/**
 * Converts one user rule into a Chrome DNR rule while preserving list order as priority.
 *
 * @param {object} rule User-configured rule.
 * @param {string[]} activationDomains Hostnames applied through initiatorDomains.
 * @param {number} priority DNR priority derived from the rule position.
 * @returns {object|null} A DNR rule, or null when the user rule cannot produce an action.
 */
function buildDnrRule(rule, activationDomains, priority) {
  if (!rule.enabled || !rule.regexFilter) {
    return null;
  }

  const action = buildAction(rule);
  if (!action) {
    return null;
  }

  return {
    id: rule.id,
    priority,
    condition: buildCondition(rule, activationDomains),
    action,
  };
}

/**
 * Builds the URL/resource/domain condition used by DNR before applying an action.
 *
 * @param {object} rule User-configured rule with regexFilter and resourceTypes.
 * @param {string[]} activationDomains Hostnames applied through initiatorDomains.
 * @returns {object} Chrome DNR condition object.
 */
function buildCondition(rule, activationDomains) {
  return {
    regexFilter: rule.regexFilter,
    resourceTypes: getRuleResourceTypes(rule),
    initiatorDomains: activationDomains,
  };
}

function getRuleResourceTypes(rule) {
  return rule.resourceTypes && rule.resourceTypes.length ? rule.resourceTypes : RESOURCE_TYPES_ALL;
}

/**
 * Builds the DNR action for block, redirect, or header modification.
 *
 * @param {object} rule User-configured rule.
 * @returns {object|null} Chrome DNR action object, or null when the action is incomplete.
 */
function buildAction(rule) {
  switch (rule.action) {
    case 'block':
      return buildBlockAction();

    case 'redirect':
      return buildRedirectAction(rule);

    case 'modifyHeaders':
      return buildModifyHeadersAction(rule);

    default:
      return null;
  }
}

function buildBlockAction() {
  return { type: 'block' };
}

function buildRedirectAction(rule) {
  if (!rule.redirect || !rule.redirect.url) {
    return null;
  }

  return {
    type: 'redirect',
    redirect: { url: rule.redirect.url },
  };
}

/**
 * Builds a DNR modifyHeaders action from enabled presets and custom header rows.
 *
 * @param {object} rule User-configured rule with modifyHeaders settings.
 * @returns {object|null} Chrome DNR modifyHeaders action, or null when no headers are configured.
 */
function buildModifyHeadersAction(rule) {
  const cfg = rule.modifyHeaders || {};
  const requestHeaders = [
    ...buildPresetHeaderEntries(cfg, 'request'),
    ...buildCustomHeaderEntries(cfg, 'request'),
  ];
  const responseHeaders = [
    ...buildPresetHeaderEntries(cfg, 'response'),
    ...buildCustomHeaderEntries(cfg, 'response'),
  ];

  if (!requestHeaders.length && !responseHeaders.length) {
    return null;
  }

  const action = { type: 'modifyHeaders' };
  if (requestHeaders.length) action.requestHeaders = requestHeaders;
  if (responseHeaders.length) action.responseHeaders = responseHeaders;
  return action;
}

/**
 * Builds header entries for enabled built-in presets, such as CORS, CSP, auth, cache, and feature flags.
 *
 * @param {object} cfg The rule.modifyHeaders configuration.
 * @param {'request'|'response'} targetName Header target to include.
 * @returns {Array<object>} DNR header operation entries.
 */
function buildPresetHeaderEntries(cfg, targetName) {
  const entries = [];

  for (const [key, preset] of Object.entries(HEADER_PRESETS)) {
    if (preset.target !== targetName) {
      continue;
    }

    const state = cfg.presets && cfg.presets[key];
    if (!state || !state.enabled) {
      continue;
    }

    for (const headerName of getPresetHeaderNames(preset, state)) {
      entries.push(buildHeaderEntry(headerName, preset.operation, getPresetHeaderValue(preset, state)));
    }
  }

  return entries;
}

function getPresetHeaderNames(preset, state) {
  return preset.editableHeaderName ? [state.headerName || preset.defaultHeaderName] : preset.headers;
}

function getPresetHeaderValue(preset, state) {
  if (preset.operation !== 'set') {
    return undefined;
  }

  return preset.editableValue ? state.value ?? preset.defaultValue : preset.defaultValue;
}

/**
 * Builds header entries for project-specific custom request/response header rows.
 *
 * @param {object} cfg The rule.modifyHeaders configuration.
 * @param {'request'|'response'} targetName Header target to include.
 * @returns {Array<object>} DNR header operation entries.
 */
function buildCustomHeaderEntries(cfg, targetName) {
  const entries = [];

  for (const custom of cfg.custom || []) {
    if (!custom.header || getCustomHeaderTarget(custom) !== targetName) {
      continue;
    }

    entries.push(buildHeaderEntry(custom.header, custom.operation, custom.value || ''));
  }

  return entries;
}

function getCustomHeaderTarget(custom) {
  return custom.target === 'response' ? 'response' : 'request';
}

function buildHeaderEntry(header, operation, value) {
  const entry = { header, operation };
  if (operation === 'set') {
    entry.value = value;
  }
  return entry;
}
