# Request Conditions - Plugin for Chromium browsers

Request Conditions lets you create rules for browser requests on selected domains. 
Use it to block unwanted network calls, redirect matching URLs, modify request or response headers, 
and test how web apps behave when specific resources fail to load.

It is useful for API development, frontend debugging, failure testing, 
and cleaning up noisy network behavior on sites you use.

## What you can do

- Block matching requests
- Redirect matching URLs
- Modify request and response headers
- Apply rules only on domains you choose
- Target specific resource types, such as scripts, stylesheets, images, media, documents, WebSocket, and API requests
- Test missing resources and partial loading failures
- Override headers for local development and debugging
- Export and import your rule configuration as JSON

## Installation

1. Download this repository as ZIP or clone it locally.
2. Open `chrome://extensions` in a Chromium browser.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the `src` directory from this project.
6. Set up the extension configuration in [Getting started](#getting-started).

## Common use cases

### Debug web apps and APIs

Create rules for specific endpoints, scripts, stylesheets, images, media files, or JSON responses.
This helps you test fallback states, loading errors, broken dependencies, and edge cases that are hard to reproduce otherwise.

### Control unwanted requests

Block noisy or unnecessary requests on selected domains, such as tracking calls, statistics endpoints, 
heavy dynamic content, or other resources you do not want the page to load.

### Adjust headers

Use built-in presets or custom header rules to change request and response behavior while developing or testing.

Header rules can target either requests or responses, so you can adjust what the browser sends and what the page receives.

Common examples:

- Set `Access-Control-Allow-Origin` to test a frontend before backend CORS is fully configured
- Remove `Content-Security-Policy` or `X-Frame-Options` while debugging iframe, embedding, or script behavior
- Override `Authorization` to test different users, roles, or tokens without changing application code
- Set a custom `User-Agent` to check browser, device, or API-specific behavior
- Set `Cache-Control: no-store` to avoid stale responses during active API debugging
- Send feature-flag headers, such as `X-Feature-Flags`, to force experimental backend paths
- Add or remove custom request or response headers for project-specific workflows

## Getting started

Open the extension settings and configure the domains where your rules should be active.

### Activation domains

Add one hostname per line:

```text
example.com
dev.example.com
```

Rules are applied only on activation domains. Subdomains are included automatically, so `example.com` also covers `api.example.com`.

### URL pattern

Each rule uses an [RE2 URL pattern](https://github.com/google/re2/wiki/Syntax) to match browser requests.

Match all API requests on a domain:

```text
^https?://.*\.example\.com/api/.*$
```

Match JavaScript files:

```text
^https?://.*\.example\.com/.*\.js$
```

Match images from a CDN path:

```text
^https?://cdn\.example\.com/images/.*$
```

### Action

Choose what should happen when a request matches the pattern:

- `block` stops the matching request
- `redirect` sends the request to another URL
- `modifyHeaders` changes request or response headers

Use `block` to test missing files, failed API calls, or unwanted dynamic loading.\
Use `redirect` to point a request to a local or test endpoint.\
Use `modifyHeaders` for CORS, authorization, cache, feature flags, or custom header workflows.

### Resource types

Limit a rule to the types of resources you want to affect, such as scripts, stylesheets, 
images, media, documents, WebSocket, or API requests.

For example, you can block only images from a CDN, only JavaScript files, 
or only API requests matching a specific path.

### Priority and saving

The first rule in the list has the highest priority.

Reorder rules when you need one rule to take precedence over another. 
Save the configuration after editing domains, rules, actions, or resource types.

The popup shows whether Request Conditions is active on the current tab.

## Import and export

Use **Export JSON** to save your configuration.

Use **Import JSON** to replace the current configuration with a previously exported file.

## License

[ISC License](LICENSE)
