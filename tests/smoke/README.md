# Real-Browser Smoke Tests

Smoke tests perform a minimal runtime check against a real Chrome DevTools Protocol endpoint.
They are intentionally separate from the default Vitest suite because browser startup and host state can be slow or flaky.

Run them explicitly:

```bash
RUN_BROWSER_TOOLS_SMOKE=1 npm run test:smoke
```

The standard `npm test` command should stay fast and deterministic without launching Chrome.
