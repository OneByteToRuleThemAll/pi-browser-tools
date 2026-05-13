# Browser Smoke Checklist

Use this checklist only when validating against a real Chrome/Edge DevTools Protocol runtime. The standard `npm test` suite does not launch a browser.

## Command

```bash
RUN_BROWSER_TOOLS_SMOKE=1 npm run test:smoke
```

## Manual pi validation after reload

After reloading pi with this package enabled, validate representative tools in this order:

1. `browser_open_url` — open `https://example.com` and confirm title/url/text are returned.
2. `browser_snapshot` — confirm the current tab metadata matches the opened page.
3. `browser_list_tabs` — confirm at least one tab is listed.
4. `browser_new_tab` — open `about:blank` or another URL and confirm a `targetId` is returned.
5. `browser_switch_tab` — switch back to the original tab by index or target id.
6. `browser_wait_for_text` — wait for text that is visible on the current page.
7. `browser_get_html` — read document HTML or a selected element.
8. `browser_screenshot` — save a screenshot and confirm the file path exists.
9. `browser_close_tab` — close the extra tab created during the smoke flow.

## Optional deeper checks

- Form page: `browser_type`, `browser_click`, `browser_submit`, `browser_get_forms`.
- Debugging: `browser_console`, `browser_clear_console_logs`.
- Network: `browser_network_start`, navigate, `browser_get_network_log`, `browser_network_stop`.
- Storage: `browser_get_cookies`, `browser_set_cookie`, `browser_clear_cookies`.
- Viewport/screenshot: `browser_set_viewport`, `browser_element_screenshot`.

## Expected result

The smoke flow should complete without hanging, return structured `details`, and preserve clear error messages when selectors, tabs, or browser startup are invalid.
