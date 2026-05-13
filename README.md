# pi-browser-tools

Browser automation tools for [pi](https://pi.dev) agents.

This package uses Chrome DevTools Protocol for deterministic automation.

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

### `browser_tabs`

Manage browser tabs with one tool:

- `list` existing tabs
- `open` a new tab by URL
- `switch` to an existing tab by `index` or `targetId`
- `close` an existing tab by `index` or `targetId`

Example:

```text
Use browser_tabs with action=list.
```

### `browser_new_tab`

Open a fresh tab (optionally with a URL).

Example:

```text
Use browser_new_tab with url:'https://example.com'.
```

### `browser_list_tabs`

List all current tabs.

Example:

```text
Use browser_list_tabs.
```

### `browser_switch_tab`

Switch to a tab by `targetId` or `index`.

Example:

```text
Use browser_switch_tab with index:0.
```

### `browser_close_tab`

Close a tab by `targetId` or `index`.

Example:

```text
Use browser_close_tab with index:2.
```

### `browser_click`

Click a DOM element by CSS selector.

Example:

```text
Use browser_click on selector '#login' to open the login modal.
```

### `browser_type`

Fill an input/textarea/contenteditable element.

Example:

```text
Use browser_type for selector '#email' with text 'user@example.com'.
```

### `browser_submit`

Submit a form by selector.

Example:

```text
Use browser_submit on selector 'form' or 'button.submit'.
```

### `browser_press_key`

Dispatch keyboard key events to active element or a specified selector.

Example:

```text
Use browser_press_key with key:'Enter' selector:'#search'.
```

### `browser_wait`

Wait by timeout, or wait for selector/text appearance.

Example:

```text
Use browser_wait with ms:5000 selector:'#dashboard' text:'Welcome'.
```

### `browser_wait_for_selector`

Wait until a selector appears.

Example:

```text
Use browser_wait_for_selector with selector '.modal.open'.
```

### `browser_wait_for_text`

Wait until text appears in body content.

Example:

```text
Use browser_wait_for_text with text 'Welcome'.
```

### `browser_wait_for_load_state`

Wait for a page lifecycle milestone:

- `domcontentloaded`
- `load`
- `networkidle0`

Example:

```text
Use browser_wait_for_load_state with state:'load'.
```

### `browser_console`

Capture recent browser console output, including console and exception events.

Example:

```text
Use browser_console to collect messages for 1000ms.
```

### `browser_network`

Capture recent network events (url/method/status/type/size) from the current tab.

Example:

```text
Use browser_network for 1500ms while submitting a form.
```

### `browser_scroll`

Scroll viewport to top, bottom, relative offsets, or a selector position.

Example:

```text
Use browser_scroll with kind:'by' x:0 y:300.
```

### `browser_scroll_to_selector`

Scroll the page so a selector is brought into viewport.

Example:

```text
Use browser_scroll_to_selector with selector '.pricing'.
```

### `browser_clear_console_logs`

Clear browser console output on the current page context.

Example:

```text
Use browser_clear_console_logs to reset message accumulation.
```

### `browser_wait_for_network_idle`

Wait until the page reports network idle (`networkidle0`).

Example:

```text
Use browser_wait_for_network_idle with ms:2000.
```

### `browser_wait_for_invisible`

Wait until an element is removed or hidden.

Example:

```text
Use browser_wait_for_invisible for selector '.spinner'.
```

### `browser_get_network_log`

Get a short network log capture summary with optional URL/method filtering.

Example:

```text
Use browser_get_network_log with ms:1000 method:'GET'.
```

### `browser_network_start`

Start background network capture for persistent retrieval.

Example:

```text
Use browser_network_start.
```

### `browser_network_stop`

Stop background network capture.

Example:

```text
Use browser_network_stop.
```

### `browser_network_clear`

Clear buffered background network events.

Example:

```text
Use browser_network_clear.
```

### `browser_cookie_jar`

List/set/delete cookies for the current document domain.

Example:

```text
Use browser_cookie_jar with action:'list'.
```

### `browser_get_cookies`

Return full cookie metadata for the current page URL.

Example:

```text
Use browser_get_cookies.
```

### `browser_set_cookie`

Set a cookie by name/value.

Example:

```text
Use browser_set_cookie with name:'auth' value:'token'.
```

### `browser_clear_cookies`

Clear all browser cookies.

Example:

```text
Use browser_clear_cookies.
```

### `browser_set_viewport`

Set viewport dimensions/device scale for deterministic screenshots.

Example:

```text
Use browser_set_viewport with width:1280 height:900.
```

### `browser_get_select_options`

Return metadata and option values for a `<select>`.

Example:

```text
Use browser_get_select_options for selector 'select#country'.
```

### `browser_get_html`

Return page HTML (`document.documentElement.innerHTML`) or selected element HTML by selector.

Example:

```text
Use browser_get_html to capture HTML for assertions.
```

### `browser_get_element`

Extract text/attributes/value/href from a selected element.

Example:

```text
Use browser_get_element for selector '.price' mode:text.
```

### `browser_get_element_text`

Get element text content only.

Example:

```text
Use browser_get_element_text for selector 'h1'.
```

### `browser_get_forms`

Extract all forms and their field metadata.

Example:

```text
Use browser_get_forms to inspect all form fields.
```

### `browser_screenshot`

Capture a PNG screenshot of the current browser page.

Example:

```text
Use browser_screenshot with path .pi/browser-screenshots/home.png.
```

### `browser_element_screenshot`

Capture a screenshot of a single DOM element by selector.

Example:

```text
Use browser_element_screenshot with selector '#hero' path .pi/browser-screenshots/hero.png.
```

### `browser_take_element_screenshot`

Alias for browser_element_screenshot.

Example:

```text
Use browser_take_element_screenshot with selector '#hero'.
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
Use browser_google_search to search Google for browser automation tools.
```

## Requirements

- pi coding agent
- Chrome or Edge installed locally
- Node runtime used by pi

## Install

### From a local checkout

If your shell is inside this repository:

```bash
pi install .
```

If your shell is in the parent directory:

```bash
pi install ./pi-browser-tools
```

Then restart/reload pi so it loads the package extension from `dist/browser-tools.js`.

### Direct extension loading for development

For one-off local testing without installing the package:

```bash
pi -e ./extensions/browser-tools.ts
```

### From GitHub

After publishing this folder to GitHub:

```bash
pi install https://github.com/OneByteToRuleThemAll/pi-browser-tools
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

The CDP tools in this package do not intentionally send browser content to any third-party service. They expose browser page content to the active pi agent as tool output.

## Testing and smoke checks

Run the standard fast Vitest suite:

```bash
npm test
```

Run all Vitest files, including smoke tests skipped by default:

```bash
npm run test:all
```

Run the optional real-browser smoke check only when Chrome/CDP validation is desired:

```bash
RUN_BROWSER_TOOLS_SMOKE=1 npm run test:smoke
```

See `SMOKE_CHECKLIST.md` for manual pi validation after reloading the package.

## Notes

- The tools launch Chrome/Edge with a dedicated temporary user data directory.
- They connect via local Chrome DevTools Protocol.
- The existing browser session remains alive across tool calls while pi is running.
- `browser_google_search` may be affected by Google's consent, anti-bot, or regional pages.

## Example browser smoke QA flow

A minimal deterministic smoke flow:

```text
1) browser_open_url
2) browser_console
3) browser_type
4) browser_click
5) browser_scroll
6) browser_wait
7) browser_network
8) browser_snapshot
9) browser_screenshot
```
