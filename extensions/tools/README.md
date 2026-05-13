# Tool Modules

Each file in this tree should implement one tool.

## Convention
- **One tool = one file**
- filename: `browser-<action>.ts`
- exported `register` function for pi registration
- domain folder readme documents usage and examples

## Registry flow
1. Each tool module exports a `register(pi)` function.
2. `extensions/tools/index.ts` imports and invokes all tool registrations.
3. `extensions/browser-tools.ts` delegates to `registerTools()`.

## Domain map
- `navigation/`
  - page load/navigation/waits
- `tabs/`
  - single-tab or multi-tab management
- `interaction/`
  - click/type/keyboard/forms/scroll/input helpers
- `extraction/`
  - HTML/text/element/form extraction
- `observability/`
  - console capture and lightweight runtime capture
- `network/`
  - network capture + background network lifecycle tools
- `storage/`
  - cookie + viewport/session storage helpers
- `screenshot/`
  - page and element screenshot helpers
- `aliases/`
  - compatibility wrappers and deprecated aliases

## Note
These docs are designed for agent handoff and troubleshooting. If a tool changes behavior,
update the corresponding domain README before marking it implemented.
