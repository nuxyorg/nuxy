# 20 — Logging System

## Overview

Nuxy uses a structured, leveled logging system built into the Kernel. All logging is done through the `createLogger` / `kernelLogger` utilities exported from `packages/core/src/logger.ts`.

**Do NOT use `console.log` / `console.error` directly.** Always use the logger.

---

## Log Levels

| Level   | Value | When to use                                                                             |
| ------- | ----- | --------------------------------------------------------------------------------------- |
| `error` | 3     | Unrecoverable runtime failures, unhandled exceptions                                    |
| `warn`  | 2     | Non-fatal issues, unexpected-but-handled states. **Default.**                           |
| `info`  | 1     | Normal lifecycle events (module loads, IPC registration, worker spawns).                |
| `silly` | 0     | Hyper-verbose trace: every IPC message payload, every manifest field, every regex match |

Levels are additive upwards — setting `silly` shows everything.

---

## Controlling Verbosity

Set the `LOG_LEVEL` environment variable before starting the app:

```bash
# Show everything (development)
LOG_LEVEL=silly pnpm --dir /home/xava/Documents/functiongemma dev

# Normal verbosity (shows info + warn + error)
LOG_LEVEL=info pnpm --dir /home/xava/Documents/functiongemma dev

# Quiet (default) — only warnings and errors
pnpm --dir /home/xava/Documents/functiongemma dev
```

---

## Kernel Logger (Main Process)

```ts
import { kernelLogger } from '../../../packages/core/src/logger.js'

const log = kernelLogger.child('MyModule')

log.info('Module initialized')
log.silly('Raw payload received', payload)
log.warn('Unexpected state', { state })
log.error('Fatal error', err)
```

### Namespaces

Each module creates a child logger so output is easy to filter:

| Namespace                 | Module                     |
| ------------------------- | -------------------------- |
| `Kernel:App`              | `electron/main.ts`         |
| `Kernel:Scanner`          | `electron/scanner.ts`      |
| `Kernel:IPC`              | `electron/ipc.ts`          |
| `Kernel:Spawn`            | `electron/worker/spawn.ts` |
| `Worker:<extId>:IPC`      | Injected into each worker  |
| `Worker:<extId>:Registry` | Injected into each worker  |

---

## Worker Logger (Extension Threads)

Workers run in isolated threads and cannot import from the main process.  
The Kernel **injects an inline logger** into each worker via `spawn.ts`, forwarding the host `LOG_LEVEL`.

Extensions receive a scoped logger through `core.logger`:

```js
// extensions/my-ext/backend.js
module.exports = {
  register: (core) => {
    core.logger.info('Extension booted')

    core.ipc.handle('my-channel', async (payload) => {
      core.logger.silly('Received payload', payload)
      // ...
    })
  },
}
```

> Extensions **MUST NOT** use `console.log` directly. Use `core.logger` instead.

---

## What Gets Logged

### `silly`

- Every IPC message payload (id, channel, payload, result)
- Every file found during extension scan
- Manifest fields after parse
- Worker postMessage / reply details
- Window resize dimensions
- Active worker map state

### `info`

- App lifecycle: ready, window created, bootstrap complete
- Extension scan start/end
- Worker spawned for extension X
- IPC handlers registered
- Module loaded / `ext.register()` called
- Tool / Provider / Orchestrator registered

### `warn`

- Worker not found for `ext:invoke`
- Extension has no backend entry
- Worker exited with non-zero code
- Second app instance attempted
- No `register()` function on extension module

### `error`

- Module import failed
- Worker emitted error event
- Failed to load/parse extension manifest

---

## Output Format

```
2026-05-18 13:04:22.123 INFO  [Kernel:Scanner] Scanning extension directory: /path/to/extensions
2026-05-18 13:04:22.130 INFO  [Kernel:Scanner] Loading extension: calculator (backend: backend.js)
2026-05-18 13:04:22.145 SILLY [Worker:calculator:Loader] Module loaded successfully.
2026-05-18 13:04:22.146 INFO  [Worker:calculator:Registry] Registered Provider: calculator
2026-05-18 13:04:22.147 INFO  [Worker:calculator:IPC] Registered handler for channel: eval
```

Colors are applied automatically when running in a TTY.
