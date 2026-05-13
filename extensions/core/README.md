# Core CDP and Runtime Layer

Shared primitives used by all tools.

## cdp.ts
Central CDP connection helpers.

- connect target
- safe send wrappers
- close lifecycle

## chrome.ts
Bootstrap Chrome/Edge with remote debugging and manage reusable process handle.

## session.ts
Track active target/session metadata.

## targets.ts
Discover, open, activate, and close browser targets/tabs.

## files.ts
Path normalization, artifact directory utilities.

## schemas.ts
Shared TypeBox schema helpers.

## errors.ts
Canonical error constructors/messages for stable contract tests.
