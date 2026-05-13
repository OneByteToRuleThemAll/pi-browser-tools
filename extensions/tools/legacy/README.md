# Legacy Bridge

This folder contains the temporary compatibility loader used during modular migration.

`legacy-loader.ts` builds a catalog from `extensions/browser-tools-core.ts` and lets each one-file-per-tool wrapper register exactly one legacy tool by name. This keeps behavior stable while implementations move into domain modules over time.
