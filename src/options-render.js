/**
 * Renders the complete rule list and updates counters on the options page.
 *
 * @param {object} state Options page state.
 * @param {{moveRule: Function, removeRule: Function}} handlers Rule action handlers from options.js.
 * @returns {void}
 */
function renderRules(state, handlers) {
  const list = document.getElementById('rulesList');
  list.innerHTML = '';

  state.rules.forEach((rule, index) => {
    list.appendChild(renderRuleCard(state, rule, index, handlers));
  });

  renderCounts(state);
}

/**
 * Renders one editable request rule card with pattern, action, resource types, and action-specific settings.
 *
 * @param {object} state Options page state.
 * @param {object} rule Rule to render.
 * @param {number} index Rule index in the priority list.
 * @param {{moveRule: Function, removeRule: Function}} handlers Rule action handlers from options.js.
 * @returns {HTMLElement} Rule card element.
 */
function renderRuleCard(state, rule, index, handlers) {
  const card = document.createElement('div');
  card.className = 'rule-card';

  card.innerHTML = `
    <div class="rule-row">
      <input type="checkbox" class="rule-enabled" ${rule.enabled ? 'checked' : ''} title="Enabled">
      <input type="text" class="pattern" value="${escapeAttr(rule.regexFilter)}" placeholder="RE2 regex, e.g. ^https?://.*\\.example\\.com/api/.*$">
      <select class="rule-action">${renderActionOptions(rule)}</select>
      <button class="small-btn toggle-types">Types: ${rule.resourceTypes.length}/${RESOURCE_TYPES_ALL.length}</button>
      <button class="small-btn move-up" ${index === 0 ? 'disabled' : ''}>↑</button>
      <button class="small-btn move-down" ${index === state.rules.length - 1 ? 'disabled' : ''}>↓</button>
      <button class="small-btn remove-rule">✕</button>
    </div>
    <details class="types-toggle"></details>
    <div class="action-config"></div>
  `;

  renderRuleDetails(card, rule);
  bindRuleCardEvents(card, rule, index, handlers);

  return card;
}

function renderActionOptions(rule) {
  return ACTIONS.map((action) => {
    const selected = action === rule.action ? 'selected' : '';
    return `<option value="${action}" ${selected}>${action}</option>`;
  }).join('');
}

function renderRuleDetails(card, rule) {
  const typesDetails = card.querySelector('.types-toggle');
  typesDetails.appendChild(renderResourceTypes(rule));

  const actionConfig = card.querySelector('.action-config');
  renderActionConfig(actionConfig, rule);

  card.querySelector('.toggle-types').addEventListener('click', () => {
    typesDetails.open = !typesDetails.open;
  });
}

function bindRuleCardEvents(card, rule, index, handlers) {
  const actionConfig = card.querySelector('.action-config');

  card.querySelector('.rule-enabled').addEventListener('change', (event) => {
    rule.enabled = event.target.checked;
  });

  card.querySelector('.pattern').addEventListener('input', (event) => {
    rule.regexFilter = event.target.value;
  });

  card.querySelector('.rule-action').addEventListener('change', (event) => {
    rule.action = event.target.value;
    renderActionConfig(actionConfig, rule);
  });

  card.querySelector('.move-up').addEventListener('click', () => {
    handlers.moveRule(index, -1);
  });

  card.querySelector('.move-down').addEventListener('click', () => {
    handlers.moveRule(index, 1);
  });

  card.querySelector('.remove-rule').addEventListener('click', () => {
    handlers.removeRule(index);
  });
}

/**
 * Renders resource type filters that let a rule target scripts, stylesheets, images, media, API calls, and advanced types.
 *
 * @param {object} rule Rule whose resourceTypes array is edited by the controls.
 * @returns {HTMLElement} Resource type selector element.
 */
function renderResourceTypes(rule) {
  const wrap = document.createElement('div');

  wrap.appendChild(createResourceTypesSummary());

  const allToggle = createAllTypesToggle(rule);
  wrap.appendChild(allToggle.label);

  const mainGrid = createTypesGrid();
  const advancedDetails = createAdvancedTypesDetails();
  const advancedGrid = advancedDetails.querySelector('.types-grid');
  const checkboxes = [];

  RESOURCE_TYPES_MAIN.forEach((type) => {
    addResourceTypeCheckbox(mainGrid, rule, type, allToggle.input, checkboxes);
  });

  RESOURCE_TYPES_ADVANCED.forEach((type) => {
    addResourceTypeCheckbox(advancedGrid, rule, type, allToggle.input, checkboxes);
  });

  allToggle.input.addEventListener('change', () => {
    rule.resourceTypes = allToggle.input.checked ? [...RESOURCE_TYPES_ALL] : [];
    checkboxes.forEach((checkbox) => {
      checkbox.checked = allToggle.input.checked;
    });
  });

  wrap.appendChild(mainGrid);
  wrap.appendChild(advancedDetails);

  return wrap;
}

function createResourceTypesSummary() {
  const summary = document.createElement('summary');
  summary.textContent = 'Resource types';
  return summary;
}

function createAllTypesToggle(rule) {
  const label = document.createElement('label');
  const input = document.createElement('input');

  input.type = 'checkbox';
  input.checked = rule.resourceTypes.length === RESOURCE_TYPES_ALL.length;
  label.appendChild(input);
  label.append(' All types');

  return { label, input };
}

function createTypesGrid() {
  const grid = document.createElement('div');
  grid.className = 'types-grid';
  return grid;
}

function createAdvancedTypesDetails() {
  const details = document.createElement('details');
  details.className = 'advanced-types';

  const summary = document.createElement('summary');
  summary.textContent = 'Advanced';
  details.appendChild(summary);
  details.appendChild(createTypesGrid());

  return details;
}

function addResourceTypeCheckbox(grid, rule, type, allToggle, checkboxes) {
  const label = document.createElement('label');
  const checkbox = document.createElement('input');

  checkbox.type = 'checkbox';
  checkbox.checked = rule.resourceTypes.includes(type);
  checkbox.addEventListener('change', () => {
    syncResourceTypeState(rule, type, checkbox.checked);
    allToggle.checked = rule.resourceTypes.length === RESOURCE_TYPES_ALL.length;
  });

  checkboxes.push(checkbox);
  label.appendChild(checkbox);
  label.append(' ' + type);
  grid.appendChild(label);
}

function syncResourceTypeState(rule, type, checked) {
  const hasType = rule.resourceTypes.includes(type);

  if (checked && !hasType) {
    rule.resourceTypes.push(type);
  }

  if (!checked && hasType) {
    rule.resourceTypes = rule.resourceTypes.filter((resourceType) => resourceType !== type);
  }
}

/**
 * Renders the action-specific controls for redirect and modifyHeaders rules.
 *
 * @param {HTMLElement} container Destination element for the controls.
 * @param {object} rule Rule whose action config is edited.
 * @returns {void}
 */
function renderActionConfig(container, rule) {
  container.innerHTML = '';

  if (rule.action === 'redirect') {
    container.appendChild(renderRedirectConfig(rule));
    return;
  }

  if (rule.action === 'modifyHeaders') {
    container.appendChild(renderHeaderPresets(rule));
    container.appendChild(renderCustomHeaders(rule));
  }
}

/**
 * Renders the static URL input used by redirect rules.
 *
 * @param {object} rule Redirect rule.
 * @returns {HTMLElement} Redirect configuration element.
 */
function renderRedirectConfig(rule) {
  const label = document.createElement('label');
  label.textContent = 'Redirect to URL: ';

  const input = document.createElement('input');
  input.type = 'text';
  input.value = rule.redirect.url || '';
  input.placeholder = 'http://localhost:3000';
  input.style.width = '100%';
  input.addEventListener('input', (event) => {
    rule.redirect.url = event.target.value;
  });

  label.appendChild(document.createElement('br'));
  label.appendChild(input);

  return label;
}

/**
 * Renders built-in header modification presets for common development workflows.
 *
 * @param {object} rule Rule with modifyHeaders preset state.
 * @returns {HTMLElement} Preset list element.
 */
function renderHeaderPresets(rule) {
  const wrap = document.createElement('div');

  for (const [key, preset] of Object.entries(HEADER_PRESETS)) {
    wrap.appendChild(renderHeaderPreset(rule.modifyHeaders.presets[key], preset));
  }

  return wrap;
}

function renderHeaderPreset(state, preset) {
  const box = document.createElement('div');
  box.className = 'preset';

  box.appendChild(renderHeaderPresetLabel(state, preset));
  box.appendChild(renderHeaderPresetDescription(preset));

  const fields = renderHeaderPresetFields(state, preset);
  if (fields.childNodes.length) {
    box.appendChild(fields);
  }

  return box;
}

function renderHeaderPresetLabel(state, preset) {
  const label = document.createElement('label');
  const checkbox = document.createElement('input');

  checkbox.type = 'checkbox';
  checkbox.checked = state.enabled;
  checkbox.addEventListener('change', (event) => {
    state.enabled = event.target.checked;
  });

  const labelText = document.createElement('span');
  labelText.className = 'preset-label';
  labelText.textContent = ' ' + preset.label;

  label.appendChild(checkbox);
  label.appendChild(labelText);

  return label;
}

function renderHeaderPresetDescription(preset) {
  const description = document.createElement('div');
  description.className = 'preset-desc';
  description.textContent = preset.description;
  return description;
}

function renderHeaderPresetFields(state, preset) {
  const fields = document.createElement('div');
  fields.className = 'preset-fields';

  if (preset.editableHeaderName) {
    fields.appendChild(renderPresetHeaderNameInput(state));
  } else if (preset.headers.length) {
    fields.appendChild(renderPresetHeaderNames(preset));
  }

  if (preset.editableValue) {
    fields.appendChild(renderPresetValueInput(state, preset));
  }

  return fields;
}

function renderPresetHeaderNameInput(state) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = state.headerName;
  input.placeholder = 'Header-Name';
  input.addEventListener('input', (event) => {
    state.headerName = event.target.value;
  });
  return input;
}

function renderPresetHeaderNames(preset) {
  const label = document.createElement('span');
  label.textContent = preset.headers.join(', ') + ':';
  label.style.fontFamily = 'monospace';
  label.style.fontSize = '12px';
  return label;
}

function renderPresetValueInput(state, preset) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = state.value ?? '';
  input.placeholder = preset.defaultValue || 'value';
  input.addEventListener('input', (event) => {
    state.value = event.target.value;
  });
  return input;
}

/**
 * Renders structured custom request/response header operations.
 *
 * @param {object} rule Rule with custom modifyHeaders rows.
 * @returns {HTMLElement} Custom header editor element.
 */
function renderCustomHeaders(rule) {
  const wrap = document.createElement('div');
  const title = document.createElement('div');
  const rowsContainer = document.createElement('div');

  title.className = 'preset-label';
  title.textContent = 'Custom header rules';
  wrap.appendChild(title);
  wrap.appendChild(rowsContainer);

  renderCustomHeaderRows(rule, rowsContainer);
  wrap.appendChild(renderAddCustomHeaderButton(rule, rowsContainer));

  return wrap;
}

function renderCustomHeaderRows(rule, rowsContainer) {
  rowsContainer.innerHTML = '';

  rule.modifyHeaders.custom.forEach((row, index) => {
    rowsContainer.appendChild(renderCustomHeaderRow(rule, row, index, rowsContainer));
  });
}

function renderCustomHeaderRow(rule, row, index, rowsContainer) {
  const rowEl = document.createElement('div');
  const groupName = `op-${rule.id}-${index}`;
  rowEl.className = 'custom-header-row';

  const valueInput = renderCustomHeaderValueInput(row);

  rowEl.append(
    renderCustomHeaderNameInput(row),
    renderCustomHeaderTargetSelect(row),
    renderCustomHeaderOperationLabel(row, groupName, 'set', 'Set', valueInput),
    renderCustomHeaderOperationLabel(row, groupName, 'remove', 'Remove', valueInput),
    valueInput,
    renderRemoveCustomHeaderButton(rule, index, rowsContainer)
  );

  return rowEl;
}

function renderCustomHeaderNameInput(row) {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Header-Name';
  input.value = row.header || '';
  input.addEventListener('input', (event) => {
    row.header = event.target.value;
  });
  return input;
}

function renderCustomHeaderTargetSelect(row) {
  const select = document.createElement('select');
  select.innerHTML = `<option value="request" ${row.target !== 'response' ? 'selected' : ''}>Request</option><option value="response" ${row.target === 'response' ? 'selected' : ''}>Response</option>`;
  select.addEventListener('change', (event) => {
    row.target = event.target.value;
  });
  return select;
}

function renderCustomHeaderOperationLabel(row, groupName, operation, text, valueInput) {
  const label = document.createElement('label');
  const radio = document.createElement('input');

  radio.type = 'radio';
  radio.name = groupName;
  radio.checked = operation === 'remove' ? row.operation === 'remove' : row.operation !== 'remove';
  radio.addEventListener('change', () => {
    row.operation = operation;
    valueInput.style.display = row.operation === 'remove' ? 'none' : '';
  });

  label.appendChild(radio);
  label.append(' ' + text);

  return label;
}

function renderCustomHeaderValueInput(row) {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'value';
  input.value = row.value || '';
  input.style.display = row.operation === 'remove' ? 'none' : '';
  input.addEventListener('input', (event) => {
    row.value = event.target.value;
  });
  return input;
}

function renderRemoveCustomHeaderButton(rule, index, rowsContainer) {
  const button = document.createElement('button');
  button.className = 'small-btn';
  button.textContent = '✕';
  button.addEventListener('click', () => {
    rule.modifyHeaders.custom.splice(index, 1);
    renderCustomHeaderRows(rule, rowsContainer);
  });
  return button;
}

function renderAddCustomHeaderButton(rule, rowsContainer) {
  const button = document.createElement('button');
  button.className = 'small-btn';
  button.textContent = '+ Add custom header rule';
  button.addEventListener('click', () => {
    rule.modifyHeaders.custom.push({ header: '', operation: 'set', value: '', target: 'request' });
    renderCustomHeaderRows(rule, rowsContainer);
  });
  return button;
}

/**
 * Updates the activation domain and dynamic rule counters.
 *
 * @param {object} state Options page state.
 * @returns {void}
 */
function renderCounts(state) {
  const domains = parseActivationDomains(document.getElementById('activationDomains').value);
  document.getElementById('activationCount').textContent = `${domains.length} domains`;
  document.getElementById('rulesCount').textContent = `${state.rules.length} / ${MAX_DYNAMIC_RULES} rules`;
}

function showSaveStatus() {
  const status = document.getElementById('status');
  status.textContent = 'Saved';
  setTimeout(() => {
    status.textContent = '';
  }, 1500);
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}
