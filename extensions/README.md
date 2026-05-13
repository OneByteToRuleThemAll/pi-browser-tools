# Browser Tools — extensions/

This directory contains the modular browser extension source and tooling docs.

## Current plan
- `browser-tools.ts` remains the thin extension entrypoint.
- Tool implementations are organized under `extensions/tools/<domain>/`.
- Shared CDP/runtime logic lives in `extensions/core/`, `extensions/utils/`, and `extensions/types/`.

## For agents
When adding or updating a tool:
1. Place one tool per file in the appropriate domain folder.
2. Export a `register` function for that tool.
3. Keep domain README updated with usage examples and constraints.
4. Update `extensions/tools/index.ts` manifest.

## Current source of truth (temporary)
While refactor is in progress, legacy implementation currently remains in:
- `extensions/browser-tools-core.ts`

As tools are split out, this file will import from domain modules and become a simple re-export/wrapper.
