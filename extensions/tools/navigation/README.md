# Navigation Tools

Tools used for page lifecycle and navigation-related flow.

## browser_open_url
Open a URL in the active browser session and return a snapshot (title/url/body preview/links).

- required: `url`
- optional: `settleMs`
- example: `browser_open_url` with `url: 'http://localhost:3000'`

## browser_snapshot
Capture current page state without navigation.

- includes: title, URL, text preview, top links
- use for: quick assertions after interactions

## browser_eval
Execute JavaScript in the current page.

- required: `expression`
- returns evaluated result

## browser_wait
Pause execution.

- modes:
  - timeout-only (`ms`)
  - optional `selector` wait
  - optional `text` wait
- returns: waited duration + whether selector/text found

## browser_wait_for_selector
Wait for selector presence.

- required: `selector`
- optional: `ms` and `timeout`

## browser_wait_for_text
Wait until body text contains target text.

- required: `text`
- optional: `ms`, `caseSensitive`

## browser_wait_for_load_state
Wait for page lifecycle state.

- `domcontentloaded | load | networkidle0`
- optional: `ms`

## browser_wait_for_network_idle
Alias-meaning wait for network idle from CDP-style `networkidle0` semantics.

- optional: `ms`

## browser_wait_for_invisible
Wait until a selector is detached or hidden.

- required: `selector`
- optional: `ms`

## browser_google_search
Search via browser UI and parse candidate result links.

- required: `query`
- optional: `timeout`
- note: search reliability may vary by page state and anti-bot behavior
