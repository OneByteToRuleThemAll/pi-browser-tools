# Tests Layout

- `unit/`: fast static checks and helper behavior assertions
- `smoke/`: optional real-browser Chrome/CDP smoke checks
- `fixtures/`: shared static assets/pages

Run the standard fast Vitest suite:

```bash
npm test
```

Run every Vitest file, including guard-skipped smoke tests:

```bash
npm run test:all
```

Run real-browser smoke tests only:

```bash
RUN_BROWSER_TOOLS_SMOKE=1 npm run test:smoke
```

The default test command stays deterministic and does not launch Chrome.
