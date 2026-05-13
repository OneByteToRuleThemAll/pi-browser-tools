# Repository Structure Plan (Modular Browser Tools)

## Goals
- Keep `extensions/browser-tools.ts` as a thin entrypoint.
- One tool per file for easy debugging and focused diffs.
- Centralize shared CDP/session logic.
- Make roadmap growth incremental and reviewable.

---

## Proposed Layout

```text
pi-browser-tools/
├─ README.md
├─ ROADMAP.md
├─ REPO_STRUCTURE.md              # (this file)
├─ package.json
├─ LICENSE
├─ .gitignore
├─ extensions/
│  ├─ browser-tools.ts            # tiny entrypoint (registers tools)
│  ├─ tools/
│  │  ├─ navigation/
│  │  ├─ tabs/
│  │  ├─ interaction/
│  │  ├─ extraction/
│  │  ├─ observability/
│  │  ├─ network/
│  │  ├─ storage/
│  │  ├─ screenshot/
│  │  ├─ aliases/
│  │  └─ index.ts                # register all tool modules
│  ├─ core/
│  │  ├─ cdp.ts
│  │  ├─ chrome.ts
│  │  ├─ session.ts
│  │  ├─ targets.ts
│  │  ├─ files.ts
│  │  ├─ schemas.ts
│  │  └─ errors.ts
│  ├─ types/
│  │  ├─ tool.ts
│  │  ├─ tool-context.ts
│  │  └─ network.ts
│  ├─ utils/
│  │  ├─ dom.ts
│  │  ├─ timing.ts
│  │  ├─ console-format.ts
│  │  ├─ network-normalize.ts
│  │  └─ browser-lock.ts
│  └─ registry/
│     ├─ register-tool.ts
│     ├─ tool-manifest.ts
│     └─ collect-tools.ts
└─ tests/
   ├─ unit/
   │  ├─ tool-registration.test.mjs
   │  ├─ tool-helpers.test.mjs
   │  ├─ README-coverage.test.mjs
   │  └─ tools/
   │     ├─ browser-open-url.test.ts
   │     ├─ browser-click.test.ts
   │     └─ ...
   ├─ smoke/
   │  ├─ README.md
   │  └─ browser-smoke.test.ts
   └─ fixtures/
      ├─ http/
      └─ pages/
```

---

## One-file-per-tool contract

Each tool module (e.g. `extensions/tools/<domain>/<tool-name>.ts`) exports:
- `name` (string)
- `schema` (TypeBox schema)
- `execute` function
- `register(pi)` function that registers exactly one tool

This keeps runtime behavior and docs/tests tied to a single place.

---

## Domain grouping

### `extensions/tools/navigation/`
- `browser-open-url.ts`
- `browser-snapshot.ts`
- `browser-eval.ts`
- `browser-wait.ts`
- `browser-wait-for-selector.ts`
- `browser-wait-for-text.ts`
- `browser-wait-for-load-state.ts`
- `browser-wait-for-network-idle.ts`
- `browser-wait-for-invisible.ts`

### `extensions/tools/tabs/`
- `browser-tabs.ts` (legacy action tool)
- `browser-new-tab.ts`
- `browser-list-tabs.ts`
- `browser-switch-tab.ts`
- `browser-close-tab.ts`

### `extensions/tools/interaction/`
- `browser-click.ts`
- `browser-type.ts`
- `browser-press-key.ts`
- `browser-submit.ts`
- `browser-scroll.ts`
- `browser-scroll-to-selector.ts`
- `browser-upload-file.ts`
- `browser-get-select-options.ts`

### `extensions/tools/extraction/`
- `browser-get-html.ts`
- `browser-get-element.ts`
- `browser-get-element-text.ts`
- `browser-get-forms.ts`

### `extensions/tools/storage/`
- `browser-cookie-jar.ts`
- `browser-get-cookies.ts`
- `browser-set-cookie.ts`
- `browser-clear-cookies.ts`
- `browser-set-viewport.ts`

### `extensions/tools/network/`
- `browser-console.ts`
- `browser-clear-console-logs.ts`
- `browser-network.ts`
- `browser-get-network-log.ts`
- `browser-network-start.ts`
- `browser-network-stop.ts`
- `browser-network-clear.ts`

### `extensions/tools/screenshot/`
- `browser-screenshot.ts`
- `browser-element-screenshot.ts`
- `browser-take-element-screenshot.ts` (alias wrapper)

### `extensions/tools/aliases/`
- Compatibility aliases or deprecated action maps as thin wrappers.

---

## Shared core responsibilities

- `core/cdp.ts`: connect/execute against CDP target, safe wrappers.
- `core/chrome.ts`: ensure Chrome is running, startup/teardown flags.
- `core/session.ts`: active tab/target bookkeeping.
- `core/targets.ts`: list/open/switch/close target helpers.
- `utils/timing.ts`: sleep + polling helpers.
- `utils/network-normalize.ts`: normalize/shape network payloads.
- `utils/dom.ts`: selector, event, and value helpers.

---

## Test strategy

- Unit tests remain fast:
  - registration + schema presence
  - per-tool helper existence
  - README/tool manifest coverage
- Optional real-browser smoke tests are runtime-gated via env flag (e.g. `RUN_BROWSER_TOOLS_SMOKE=1`).
- Smoke workflow:
  1. `browser_open_url`
  2. `browser_wait_for_text`
  3. `browser_snapshot`
  4. `browser_screenshot`
- Add fast Vitest tests with each tool file as it is implemented.

---

## Entry flow

`extensions/browser-tools.ts` should stay minimal:

1. import registry aggregator (`extensions/tools/index.ts`)
2. export default function calling all tool registrations
3. avoid tool logic in the entry file.

