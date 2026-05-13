# Network Tools

Network request tracing and lifecycle control.

## browser_network
Capture one-off network events for a period.

- optional: `ms`
- optional filters: `onlyErrors`, `method`, `urlContains`

## browser_get_network_log
Get normalized network log with optional filters and size limits.

- optional: `ms`, `urlContains`, `method`, `onlyErrors`, `limit`

## browser_network_start
Start background network collection.

- optional `ms` not required (starts until stopped)

## browser_network_stop
Stop background collection and flush state.

- no args

## browser_network_clear
Clear buffered network events.

- no args
