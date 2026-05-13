# pi-browser-tools

Browser automation tools for [pi](https://pi.dev) agents.

This package adds fast, deterministic browser tools powered by Chrome DevTools Protocol (CDP), plus optional support for [BrowserCode](https://github.com/browser-use/browsercode) for autonomous browser tasks.

## Tools

### `browser_open_url`

Open a URL in a real Chrome/Edge browser and return:

- page title
- current URL
- visible text preview
- links

Example:

```text
Use browser_open_url to open http://localhost:3000 and summarize the page.
```

### `browser_snapshot`

Read the current browser tab state without navigating.

Example:

```text
Use browser_snapshot and tell me what is on the current page.
```

### `browser_eval`

Evaluate JavaScript in the current browser page.

Example:

```text
Use browser_eval to return document.title.
```

### `browser_google_search`

Perform a Google search in the browser and return parsed result links when available.

Example:

```text
Use browser_google_search to search Google for browser-use browsercode.
```

### `browser_screenshot`

Capture a PNG screenshot of the current browser page.

Example:

```text
Use browser_screenshot with path .pi/browser-screenshots/home.png.
```

### `browser_run`

Optional autonomous browser task runner using BrowserCode's `bcode run`.

Use this for complex browser tasks. Prefer the deterministic `browser_*` tools for simple page inspection, screenshots, JavaScript evaluation, and Google searches.

## Requirements

- pi coding agent
- Chrome or Edge installed locally
- Node runtime used by pi

Optional:

- BrowserCode installed for `browser_run`

```bash
curl -fsSL https://bcode.sh/install | bash
```

## Install locally

From this folder:

```bash
pi install ./pi-browser-tools
```

Or add the extension directly for testing:

```bash
pi -e ./extensions/browser-tools.ts
```

## Install from GitHub

After publishing this folder to GitHub:

```bash
pi install git:https://github.com/YOUR_USER/pi-browser-tools
```

## Configuration

The CDP browser uses port `9224` by default.

Override with:

```bash
PI_BROWSER_CDP_PORT=9333 pi
```

Screenshots default to:

```text
.pi/browser-screenshots/
```

## Privacy and security

These tools control a real browser and can access pages you are logged into. Only install this package from sources you trust.

`browser_run` uses BrowserCode if installed. BrowserCode telemetry can be disabled with:

```bash
DO_NOT_TRACK=1
```

The deterministic CDP tools in this package do not intentionally send browser content to any third-party service. They expose browser page content to the active pi agent as tool output.

## Notes

- The tools launch Chrome/Edge with a dedicated temporary user data directory.
- They connect via local Chrome DevTools Protocol.
- The existing browser session remains alive across tool calls while pi is running.
- `browser_google_search` may be affected by Google's consent, anti-bot, or regional pages.
