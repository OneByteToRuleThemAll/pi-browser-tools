# Changelog

## 0.2.0 - 2026-05-13

### Added
- CDP-first browser automation package surface with 42 registered browser tools.
- Modular one-file-per-tool wrapper structure under `extensions/tools/`.
- Fast Vitest suite covering tool registration, registry parity, docs coverage, and repository structure.
- Optional real-browser smoke-test command guarded by `RUN_BROWSER_TOOLS_SMOKE=1`.
- Repository structure documentation and smoke checklist.

### Changed
- `extensions/browser-tools.ts` now delegates to the modular tool registry.
- Removed BrowserCode integration and the `browser_run` tool; deterministic CDP tools are the package surface.

### Notes
- `extensions/browser-tools-core.ts` is intentionally retained as the compatibility/reference implementation during modular migration.
