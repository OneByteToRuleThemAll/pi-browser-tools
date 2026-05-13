# pi-browser-tools — Status & Roadmap

_Last updated: 2026-05-13_

## What we have built so far

In this repo (`C:/Users/matty/pi-browser-tools`), we created a clean, standalone pi extension package for browser tooling.

### Implemented

- New publishable package scaffold
  - `package.json`
  - `README.md`
  - `LICENSE`
  - `.gitignore`
  - `extensions/browser-tools.ts`

- Base CDP toolset now available in pi:
  - `browser_open_url` — open URL in a real Chrome/Edge session via CDP and return snapshot
  - `browser_snapshot` — capture title, URL, visible text preview, and top links
  - `browser_eval` — run arbitrary JS in page context
  - `browser_google_search` — open Google search query in browser and parse candidate result links
  - `browser_screenshot` — save PNG screenshot to disk (`.pi/browser-screenshots/` by default)

- Browser lifecycle + connection:
  - auto-start Chrome with remote debugging
  - shared session/target handling in helper functions
  - safe page capture + optional full-page screenshot behavior

- README updated for usage and install guidance.

### Important notes

- BrowserCode integration has been removed from this package.
- The reliable path proven in this environment is the direct CDP tools above.
- The package is intentionally scoped to deterministic CDP automation.

---

## Roadmap to completion

### Phase 1 — Stabilize CDP foundation (now)

1. **Evaluate and clean command surface**
   - [x] Keep extension intentionally scoped to deterministic CDP actions.
   - [x] Remove BrowserCode/`browser_run` from this package.

2. **Tool behavior hardening**
   - Improve error handling for missing targets/chrome startup.
   - Add clearer errors for blocked/empty snapshots.
   - Return consistent `details` in tool responses.

3. **Docs alignment**
   - [x] Update README to explicitly state this is CDP-only.
   - Add quick examples for each implemented tool with expected outputs.

### Phase 2 — Add core interaction tools (next)

Primary interaction primitives for real QA workflows:

- `browser_click`
  - click by CSS selector (or safe fallback selectors)
- `browser_type`
  - fill inputs/textarea, optional clear + delay
- `browser_wait`
  - wait by milliseconds; optional selector/text polling
- `browser_tabs`
  - list/open/switch/close tabs
- `browser_get_html`
  - return DOM HTML or selected element HTML
- `browser_get_element`
  - extract selected element text/attributes/value/href

### Phase 3 — Add observational/debug tools

- `browser_console`
  - capture and return recent console logs/errors
- `browser_network`
  - expose recent network calls (url/method/status/type/size)
- `browser_scroll`
  - scroll to bottom/selector/y position
- `browser_cookie_jar`
  - list/set/delete cookies for current domain

### Phase 4 — Polish / package readiness

Status: complete for package/test readiness.

- [x] Add lightweight schema/validation for selectors and actions via TypeBox parameter schemas.
- [x] Add examples and a smoke-test checklist (`README.md`, `SMOKE_CHECKLIST.md`).
- [x] Add release notes + version bump for publishing (`CHANGELOG.md`, version `0.2.0`).
- [x] Add a bundled publish entry (`dist/browser-tools.js`) so local/GitHub installs do not rely on Node stripping TypeScript under `node_modules`.
- [x] Add fast standard Vitest coverage for registry parity, structure, package readiness, and docs.

## Completion criteria

- [x] pi package installs cleanly from local tarball/local path equivalent (`npm pack`, temp install, import `dist/browser-tools.js`, register 42 tools).
- [ ] Core deterministic CDP tools work reliably across pi reloads. Current status: package smoke test passes; manual pi reload validation still requires reloading pi with the updated package.
- [x] Users can run at least one complete browser smoke workflow:
  - open URL → wait → snapshot → screenshot → tab management.
- [x] README accurately describes tool scope, testing, smoke checks, and limitations.
- [x] Roadmap items from Phase 2 are implemented and validated by standard Vitest registry/structure tests.

---

## Suggested next immediate action

1. Rebuild the bundled extension after BrowserCode removal.
2. Implement `browser_click`, `browser_type`, `browser_wait`, and `browser_tabs`.
3. Add a short `USAGE_EXAMPLES.md` (or extend README) with local-playground workflows.
4. Re-run smoke tests on:
   - `http://localhost:3000`
   - a normal site
   - Google search
   - screenshot save path behavior

---

## Exhaustive CDP tool candidates (with descriptions)

> Scope note: these are additional tool ideas grouped by capability area. Each item is a practical CDP-facing primitive we can add later.

### 1. Core navigation/session control

1. `browser_new_tab` – Open a new empty tab or URL in the current browser context.
2. `browser_switch_tab` – Switch active tab by index, tabId, or title match.
3. `browser_close_tab` – Close a specific tab.
4. `browser_list_tabs` – Return metadata for all open tabs/windows.
5. `browser_close_all_tabs` – Close all tabs except one designated base tab.
6. `browser_set_active_tab` – Set active page/tab by identifier.
7. `browser_get_active_tab` – Return current tab metadata and URL.
8. `browser_navigate` – Navigate current tab to a given URL.
9. `browser_back` – Navigate browser history backward.
10. `browser_forward` – Navigate browser history forward.
11. `browser_reload` – Reload current page.
12. `browser_stop_load` – Stop page load in progress.
13. `browser_wait_navigation` – Wait for navigation or load completion.
14. `browser_set_user_agent` – Override user-agent string for the page session.
15. `browser_set_timezone` – Set emulated timezone for CDP session.
16. `browser_set_geolocation` – Override navigator geolocation values.
17. `browser_clear_cache` – Clear browser HTTP cache.
18. `browser_clear_cookies` – Clear all cookies in profile.
19. `browser_clear_storage` – Clear local/session storage for current origin.
20. `browser_set_http_auth` – Configure basic auth credentials per domain.
21. `browser_set_extra_headers` – Attach request headers for subsequent requests.
22. `browser_set_request_interception` – Enable/disable request interception.
23. `browser_set_bypass_cache` – Toggle cache bypass for navigation.
24. `browser_set_download_behavior` – Configure download directory/auto-accept.
25. `browser_set_viewport` – Set viewport width/height/device pixel ratio.
26. `browser_set_emulation_profile` – Apply a reusable emulation preset (mobile/desktop).
27. `browser_set_device_scale_factor` – Set device scale factor for render sizing.
28. `browser_set_permissions` – Grant/revoke page permissions (notifications, clipboard, etc.).
29. `browser_install_extension` – Load a Chrome extension into the session (if supported).
30. `browser_restart_engine` – Restart browser/target session and reconnect.
31. `browser_shutdown` – Close browser process cleanly.
32. `browser_ping` – Health-check CDP connectivity.

### 2. DOM interaction

33. `browser_click` – Click element by selector and optional timeout.
34. `browser_double_click` – Perform a double-click on target element.
35. `browser_right_click` – Open context menu on a target element.
36. `browser_hover` – Trigger mouse hover state on element.
37. `browser_type` – Type text into form controls.
38. `browser_press_key` – Send a single key to focused element.
39. `browser_key_combo` – Send key chords (e.g., Ctrl+Enter).
40. `browser_clear_input` – Clear text-like input value.
41. `browser_submit` – Submit nearest enclosing form.
42. `browser_check_checkbox` – Check a checkbox or toggle true state.
43. `browser_uncheck_checkbox` – Uncheck a checkbox.
44. `browser_toggle` – Toggle a control where current state may vary.
45. `browser_select_option` – Choose an option by visible text/value/index.
46. `browser_set_select_value` – Set `<select>` value directly.
47. `browser_get_select_options` – Return available options for a select.
48. `browser_drag_drop` – Drag one element and drop onto another.
49. `browser_focus` – Focus an element programmatically.
50. `browser_blur` – Blur currently focused element.
51. `browser_scroll_to` – Scroll to coordinates in page space.
52. `browser_scroll_by` – Scroll by x/y offsets.
53. `browser_scroll_to_bottom` – Scroll to page end.
54. `browser_scroll_to_top` – Scroll back to top of page.
55. `browser_scroll_to_selector` – Scroll until selector is in view.
56. `browser_wheel` – Dispatch wheel/scroll gesture with delta.
57. `browser_upload_file` – Attach file path(s) to file input.
58. `browser_set_range_value` – Set `<input type=range>` value.
59. `browser_set_input_files` – Set file list for modern file inputs.
60. `browser_clear_selection` – Remove current text selection.
61. `browser_copy_text` – Read selected text/clipboard read path.
62. `browser_paste` – Paste text via keyboard event into focused element.
63. `browser_set_contenteditable_text` – Set text in contenteditable element.
64. `browser_click_if_exists` – Conditional click only when selector exists.
65. `browser_wait_for_selector` – Wait until element appears.
66. `browser_wait_for_text` – Wait until text is visible in DOM.
67. `browser_wait_for_invisible` – Wait until selector disappears.
68. `browser_wait_for_network_idle` – Wait until network quiescence threshold.
69. `browser_wait_for_idle` – Wait for page/network/activity idle combined.
70. `browser_wait_for_url` – Wait until URL matches pattern.
71. `browser_wait_for_load_state` – Wait for DOMReady/complete/etc states.
72. `browser_await_element_stable` – Wait until element geometry/stability settles.

### 3. Content extraction / parsing

73. `browser_snapshot` – Return compact text and top-link snapshot.
74. `browser_snapshot_html` – Return full page HTML snapshot metadata.
75. `browser_get_html` – Return complete `document.documentElement.innerHTML`.
76. `browser_get_outer_html` – Return element outerHTML for selector.
77. `browser_get_inner_html` – Return element innerHTML for selector.
78. `browser_get_text` – Return `document.body.innerText`.
79. `browser_get_element_text` – Extract `textContent` for selector(s).
80. `browser_get_element_value` – Read value/checked value from input-like fields.
81. `browser_get_element_attr` – Read specific attribute from selector.
82. `browser_get_element_props` – Read selected DOM properties map.
83. `browser_get_attributes` – Read all attributes from selector.
84. `browser_query_selector` – Return first node metadata for selector.
85. `browser_query_selector_all` – Return all matching elements metadata.
86. `browser_find_text` – Find matching text nodes across DOM.
87. `browser_count_elements` – Count nodes matching selector.
88. `browser_get_links` – List anchors with text, href, and status.
89. `browser_get_buttons` – List interactive buttons and basic state.
90. `browser_get_forms` – Extract forms + field metadata.
91. `browser_get_inputs` – Extract input elements and types.
92. `browser_get_images` – Extract image elements and sources.
93. `browser_get_tables` – Extract tables and rows.
94. `browser_get_headings` – Extract heading hierarchy.
95. `browser_get_meta` – Extract common meta tags and values.
96. `browser_get_title` – Return current document title.
97. `browser_get_url` – Return current page URL.
98. `browser_get_ua` – Return effective user agent.
99. `browser_get_cookies` – Return all cookies for current domain.
100. `browser_set_cookie` – Add/update cookie for current domain/path.
101. `browser_delete_cookie` – Delete named cookie(s) for host.
102. `browser_clear_all_cookies` – Remove all cookies in profile.
103. `browser_get_javascript_variables` – Read global JS variables safely.
104. `browser_get_local_storage` – Fetch all localStorage entries.
105. `browser_set_local_storage` – Set localStorage key/value.
106. `browser_remove_local_storage` – Remove one localStorage key.
107. `browser_clear_local_storage` – Clear localStorage.
108. `browser_get_session_storage` – Fetch all sessionStorage entries.
109. `browser_set_session_storage` – Set sessionStorage key/value.
110. `browser_remove_session_storage` – Remove one sessionStorage key.
111. `browser_clear_session_storage` – Clear sessionStorage.
112. `browser_get_document_ready_state` – Return `document.readyState`.
113. `browser_get_performance_metrics` – Return basic frame timing metrics.
114. `browser_take_screenshot` – Capture viewport screenshot alias.
115. `browser_take_element_screenshot` – Capture screenshot clipped to selector.
116. `browser_get_screenshot_as_base64` – Return screenshot bytes in base64.
117. `browser_get_accessible_name` – Return computed accessible name.
118. `browser_get_css_styles` – Return computed styles map for selector.
119. `browser_get_bounding_box` – Return element x/y/width/height.
120. `browser_highlight_element` – Draw debug highlight around selector.
121. `browser_get_iframe_docs` – Return iframe list and sources.
122. `browser_switch_to_frame` – Enter iframe context for scoped actions.
123. `browser_switch_to_parent_frame` – Exit iframe to parent context.
124. `browser_list_frames` – Enumerate nested frame hierarchy.
125. `browser_get_frame_tree` – Return full frame tree snapshot.
126. `browser_get_timeline` – Return timeline marks collected via tracing-like data.
127. `browser_get_dom_snapshot` – Return serialized DOM-like snapshot.

### 4. Visual inspection

128. `browser_screenshot` – Capture screenshot using current viewport.
129. `browser_fullpage_screenshot` – Capture entire page height screenshot.
130. `browser_viewport_screenshot` – Capture only current viewport content.
131. `browser_element_screenshot` – Capture target element only.
132. `browser_pdf_print` – Render current page to PDF.
133. `browser_highlight_diagnostics_overlay` – Show clickable overlay markers.
134. `browser_capture_visible_bbox` – Capture only visible bounding box.
135. `browser_capture_region` – Capture screenshot at coordinates/size.
136. `browser_capture_selector_bbox` – Capture screenshot for selector bounds.
137. `browser_capture_fullpage_with_scroll` – Scroll/stitch full page capture.
138. `browser_screenshot_after` – Capture after optional delay/trigger.
139. `browser_screenshot_on_error` – Capture automatic diagnostic shot on failure.

### 5. Console / JS runtime telemetry

140. `browser_enable_console` – Subscribe to console events in session.
141. `browser_get_console_logs` – Read buffered console messages.
142. `browser_clear_console_logs` – Clear runtime console buffer.
143. `browser_evaluate_safe` – Evaluate JS with guard timeout/try-catch.
144. `browser_inject_script` – Inject script into page context.
145. `browser_remove_script` – Remove previously injected script handle.
146. `browser_execute_snippet` – Execute one-off JS snippet with arguments.
147. `browser_execute_and_capture` – Run JS and capture console + return value.
148. `browser_get_runtime_exceptions` – Read uncaught exception events.
149. `browser_get_performance_mark` – Read custom performance marks.
150. `browser_get_counters` – Read runtime counters/memory-style metrics.
151. `browser_get_v8_stats` – Gather V8 heap stats where available.
152. `browser_start_cpu_profile` – Begin CPU profiling session.
153. `browser_stop_cpu_profile` – Stop CPU profiling and return profile.
154. `browser_start_js_coverage` – Begin JS code coverage sampling.
155. `browser_stop_js_coverage` – Stop coverage and return report.

### 6. Network & protocol-level inspection

156. `browser_network_start` – Enable network event collection.
157. `browser_network_stop` – Disable network collection.
158. `browser_network_clear` – Clear collected network events.
159. `browser_get_network_log` – Return recent captured network events.
160. `browser_network_filter` – Filter network log by URL/method/status/type.
161. `browser_wait_for_request` – Wait for matching request.
162. `browser_wait_for_response` – Wait for matching response.
163. `browser_get_request_headers` – Return request header data for URL match.
164. `browser_set_response_override` – Override response headers/body for match.
165. `browser_block_urls` – Block matching URL patterns.
166. `browser_allow_urls` – Allowlist patterns and deny others.
167. `browser_set_offline_mode` – Toggle offline simulation.
168. `browser_set_cache_disabled` – Explicitly disable browser cache for runtime.
169. `browser_har_start` – Begin HAR-style request capture.
170. `browser_har_stop_export` – End capture and export HAR JSON.
171. `browser_websocket_events` – Capture websocket frames/open/close.
172. `browser_get_response_body` – Fetch response body for request id/url.
173. `browser_get_request_post_data` – Read POST body payload metadata.
174. `browser_list_web_requests` – Return currently in-flight request IDs.

### 7. Accessibility / validation / audit tools

175. `browser_a11y_snapshot` – Return condensed accessibility node tree.
176. `browser_get_a11y_tree` – Return CDP accessibility tree.
177. `browser_get_aria_roles` – List inferred ARIA roles in viewport.
178. `browser_get_aria_errors` – Run lightweight ARIA best-practice checks.
179. `browser_get_outline_violations` – Detect duplicate/invalid outline usage.
180. `browser_get_tabindex_issues` – Detect bad tabindex ordering/state.
181. `browser_get_heading_hierarchy` – Validate heading structure consistency.
182. `browser_check_color_contrast` – Estimate text/background contrast pairs.
183. `browser_check_alt_texts` – Find images lacking alt text.
184. `browser_detect_duplicate_ids` – Detect duplicate DOM IDs.
185. `browser_form_accessibility_report` – Build form label/name coverage report.
186. `browser_focus_trap_check` – Basic keyboard focus trap heuristics.
187. `browser_aria_label_audit` – Validate labels, roles, and name/description mappings.

### 8. Search / crawling utilities

188. `browser_search_links` – Search extracted links by keyword/regex.
189. `browser_filter_links_by_domain` – Filter current links to domain set.
190. `browser_extract_outbound_links` – Extract external links only.
191. `browser_extract_internal_links` – Extract same-origin links.
192. `browser_extract_images` – Extract image URLs and alt metadata.
193. `browser_extract_emails` – Regex scan page for email addresses.
194. `browser_extract_phones` – Regex scan page for phone patterns.
195. `browser_extract_addresses` – Heuristic address-like text extraction.
196. `browser_extract_structured_blocks` – Extract schema-like content blocks.
197. `browser_extract_jsonld` – Return JSON-LD script payloads.
198. `browser_extract_open_graph` – Return Open Graph meta tags.
199. `browser_extract_schema_types` – Return detected schema/type hints.
200. `browser_extract_hreflang` – Return hreflang/canonical relations.
201. `browser_extract_canonical` – Return canonical link if present.
202. `browser_extract_breadcrumbs` – Extract breadcrumb items/path labels.
203. `browser_favicon` – Read favicon URL and relation metadata.
204. `browser_link_graph` – Build one-hop graph of links.
205. `browser_url_fingerprint` – Generate URL/content fingerprint metadata.
206. `browser_sitemap_check` – Fetch and parse `/sitemap.xml` if present.
207. `browser_robots_check` – Fetch and summarize `/robots.txt` directives.
208. `browser_link_health_scan` – Probe collected links for status hints.

### 9. Auth/session workflow helpers

209. `browser_fill_login_form` – Targeted login form auto-fill helper.
210. `browser_handle_prompt` – Accept/dismiss JS prompt dialogs.
211. `browser_handle_confirm` – Accept/dismiss JS confirm dialogs.
212. `browser_handle_auth_dialog` – Handle auth dialogs when shown.
213. `browser_handle_file_download_prompt` – Handle save/open download confirmations.
214. `browser_wait_for_login_state` – Wait until logged-in indicator appears.
215. `browser_check_auth_cookie_presence` – Verify auth cookies exist.
216. `browser_rotate_profile` – Switch to new ephemeral profile directory.
217. `browser_export_cookies` – Export current cookie jar as JSON.
218. `browser_import_cookies` – Import cookies from JSON into session.

### 10. Debugging + reliability

219. `browser_retry` – Retry a prior action with exponential backoff.
220. `browser_safe_click` – Click only if visible/enabled/clickable.
221. `browser_retry_block` – Retry only on configured failure classes.
222. `browser_snapshot_with_timing` – Snapshot plus timing and load metrics.
223. `browser_dom_ready_probe` – Probe for DOM and framework readiness state.
224. `browser_stall_detector` – Detect long tasks / loading stalls.
225. `browser_wait_for_idle_network_and_dom` – Combined DOM+network idle waiter.
226. `browser_element_exists` – Return boolean existence of selector.
227. `browser_element_visible` – Return element visibility state.
228. `browser_element_enabled` – Return enabled/disabled state.
229. `browser_element_clickable` – Return actionable/clickable assessment.
230. `browser_element_editable` – Return editable status for form control.
231. `browser_isolated_eval` – Evaluate in isolated world to reduce page interference.
232. `browser_set_default_timeout` – Configure default timeouts used by waits.
233. `browser_action_guard` – Validate selector/action before execution.
234. `browser_enable_debug_mode` – Enable verbose tool-level diagnostics.
235. `browser_disable_js` – Toggle JavaScript execution off.
236. `browser_enable_js` – Re-enable JavaScript execution.

### 11. Devtools-like helpers

237. `browser_get_css_coverage` – Return CSS selector usage stats.
238. `browser_take_heap_snapshot` – Capture heap snapshot data.
239. `browser_get_memory_usage` – Return memory pressure and JS heap stats.
240. `browser_get_layout_shift_info` – Return CLS and layout-shift metrics.
241. `browser_get_fonts` – Enumerate used fonts from the page.
242. `browser_get_css_rules` – Extract stylesheet rule summaries.
243. `browser_get_computed_styles_bulk` – Return computed styles for many elements.
244. `browser_set_dom_mutation_observer` – Install DOM observer for changes.
245. `browser_get_mutation_log` – Read collected mutation events.
246. `browser_get_event_listeners` – Return high-level event listener map.
247. `browser_get_resource_timing` – Return performance resource timing entries.
248. `browser_get_paint_timing` – Return paint timing markers.
249. `browser_get_navigation_timing` – Return navigation timing fields.

### 12. Data extraction / export

250. `browser_export_dom_json` – Export parsed DOM summary JSON.
251. `browser_export_page_text` – Export raw page text for archival.
252. `browser_export_links_csv` – Export discovered links to CSV.
253. `browser_export_forms_csv` – Export detected form fields to CSV.
254. `browser_export_tables_json` – Export table rows/headers to JSON.
255. `browser_export_network_json` – Export network log to JSON.
256. `browser_export_console_json` – Export console logs to JSON.
257. `browser_save_report` – Create consolidated markdown/json report artifact.
258. `browser_bundle_evidence` – Bundle screenshot + snapshot + logs + metadata.
259. `browser_log_result` – Append QA result entry to local log.
260. `browser_append_run_log` – Append structured event to run ledger.
261. `browser_get_run_state` – Return current run/session state.
262. `browser_clear_run_state` – Reset transient workflow state.

### 13. Safety and policy controls

263. `browser_set_allow_insecure_content` – Toggle mixed-content handling.
264. `browser_block_popups` – Block automatic popup windows.
265. `browser_toggle_javascript` – Global JS enable/disable.
266. `browser_sandbox_mode_on` – Enable stricter sandbox restrictions.
267. `browser_sandbox_mode_off` – Relax sandbox restrictions.
268. `browser_csp_bypass_warning` – Emit warning when CSP blocks inline scripts.
269. `browser_download_whitelist` — Restrict file downloads by extension/type.
270. `browser_set_domain_allowlist` – Set allowed domains only.
271. `browser_set_domain_blocklist` – Set blocked domain list.
272. `browser_redact_text` – Redact PII from snapshot/log outputs.
273. `browser_sanitize_console` – Redact sensitive tokens from console logs.

### 14. Workflow building blocks

274. `browser_execute_script` – Run a named script/pipeline step.
275. `browser_record_steps` – Start recording interaction events/actions.
276. `browser_replay_steps` – Replay previously recorded steps.
277. `browser_macro_start` – Begin macro capture session.
278. `browser_macro_stop` – Stop and persist macro session.
279. `browser_macro_save` – Save captured macro to file.
280. `browser_macro_run` – Execute macro by name.
281. `browser_step` – Run a one-off named QA step.
282. `browser_batch` – Execute batch of actions atomically.
283. `browser_transaction` – Execute grouped actions with rollback-like semantics.

### 15. Chrome-specific advanced features

284. `browser_set_download_path` – Set default download directory.
285. `browser_get_downloads` – List completed downloads.
286. `browser_wait_for_download` – Wait for download completion and return path.
287. `browser_get_page_security_state` – Return mixed content/security state.
288. `browser_print_to_pdf` – Alias for PDF print action.
289. `browser_sanitize_clipboard` – Clear or limit clipboard access surface.
290. `browser_get_client_hints` – Read client hints headers/data.
291. `browser_set_accept_language` – Set `Accept-Language` profile.
292. `browser_set_dpr` – Set device pixel ratio explicitly.
293. `browser_device_emulation` – Apply mobile/tablet/desktop emulation profile.
294. `browser_emulate_cpu_throttle` – Slow down CPU for performance testing.
295. `browser_emulate_network_throttle` – Slow down network for UX diagnostics.
296. `browser_start_tracing` – Start DevTools tracing session.
297. `browser_stop_tracing` – Stop tracing and return/flush stream.
298. `browser_capture_trace` – Export trace file to disk.
299. `browser_enable_lighthouse` – Hook into lighthouse run workflow (external).
300. `browser_set_cookie_policy` – Set strict/standard cookie behavior profile.

---

### Practical priority add-on (recommended first 30)

For immediate depth and reliability, implement first:

1. `browser_click` 2. `browser_type` 3. `browser_wait_for_selector` 4. `browser_wait_for_text` 5. `browser_wait_for_load_state` 6. `browser_scroll_to_selector` 7. `browser_new_tab` 8. `browser_switch_tab` 9. `browser_list_tabs` 10. `browser_close_tab` 11. `browser_snapshot` 12. `browser_get_html` 13. `browser_get_element_text` 14. `browser_wait_for_network_idle` 15. `browser_take_element_screenshot` 16. `browser_console` 17. `browser_network_start` 18. `browser_get_network_log` 19. `browser_set_viewport` 20. `browser_clear_console_logs` 21. `browser_wait` 22. `browser_press_key` 23. `browser_get_cookies` 24. `browser_set_cookie` 25. `browser_clear_cookies` 26. `browser_get_select_options` 27. `browser_submit` 28. `browser_upload_file` 29. `browser_cookie_jar` 30. `browser_get_forms`

These provide most of the workflow you need for deterministic local QA today.