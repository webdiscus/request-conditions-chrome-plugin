// Shared constants between options.js (UI) and background.js (DNR rule generation).
// Loaded as a plain script (no ES modules) so both pages/workers can include it directly.

const RESOURCE_TYPES_MAIN = [
  'main_frame',
  'sub_frame',
  'xmlhttprequest',
  'script',
  'image',
  'stylesheet',
  'font',
  'media',
  'websocket',
];

const RESOURCE_TYPES_ADVANCED = [
  'object',
  'csp_report',
  'webbundle',
  'webtransport',
  'ping',
  'other',
];

const RESOURCE_TYPES_ALL = [...RESOURCE_TYPES_MAIN, ...RESOURCE_TYPES_ADVANCED];

// Header presets shown as checkboxes under action config when action = modifyHeaders.
// `target` is "request" or "response". `operation` is "set" or "remove".
// `headers` is a list because some presets touch more than one header (e.g. CSP removal).
// `editableValue` marks whether the value field is shown to the user for editing.
const HEADER_PRESETS = {
  cors: {
    label: 'Bypass CORS',
    description: 'Useful for local development when the backend has not configured CORS for the dev domain yet.',
    target: 'response',
    operation: 'set',
    headers: ['Access-Control-Allow-Origin'],
    editableValue: true,
    defaultValue: '*',
  },
  removeCsp: {
    label: 'Remove CSP / X-Frame-Options',
    description: 'Removes restrictions on iframe embedding and inline scripts for local debugging.',
    target: 'response',
    operation: 'remove',
    headers: ['Content-Security-Policy', 'X-Frame-Options'],
    editableValue: false,
  },
  authOverride: {
    label: 'Auth override',
    description: 'Injects a test token into every request matching the rule, without changing the app.',
    target: 'request',
    operation: 'set',
    headers: ['Authorization'],
    editableValue: true,
    defaultValue: 'Bearer ',
  },
  userAgent: {
    label: 'Custom User-Agent',
    description: 'Check how the site or API reacts to a different browser or device.',
    target: 'request',
    operation: 'set',
    headers: ['User-Agent'],
    editableValue: true,
    defaultValue: '',
  },
  disableCache: {
    label: 'Disable cache',
    description: 'Forces the browser to not reuse old responses while actively debugging an API.',
    target: 'response',
    operation: 'set',
    headers: ['Cache-Control'],
    editableValue: true,
    defaultValue: 'no-store',
  },
  featureFlag: {
    label: 'Feature-flag header',
    description: 'Forces a custom header (e.g. X-Feature-Flags) onto every matching request.',
    target: 'request',
    operation: 'set',
    headers: [], // header name is user-defined for this preset
    editableHeaderName: true,
    editableValue: true,
    defaultHeaderName: 'X-Feature-Flags',
    defaultValue: '',
  },
};

const ACTIONS = ['block', 'redirect', 'modifyHeaders'];

const MAX_DYNAMIC_RULES = 5000;
