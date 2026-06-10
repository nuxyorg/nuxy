# Type Safety Report — nuxy

> **Historical report** — reflects the codebase before the React→Lit/Web Components migration (completed 2026-06-09). React types and `window.React` references describe the old architecture.

Generated: 2026-05-19

## Summary

| Severity | Count |
| -------- | ----- |
| High     | 3     |
| Medium   | 6     |
| Low      | 5     |

Strict mode is **enabled** (`"strict": true`) in both `tsconfig.json` and `src/tsconfig.json`.
All type issues below were found despite strict mode because they involve explicit escape hatches
(`as any`, missing prop types, unsafe casts) rather than inference gaps.

---

## Issues

### 1. `(window as any)` in `App.tsx` — IPC and window event calls

- **Problem**: `src/renderer/App.tsx:16`, `:44`, `:51` — three separate uses of `(window as any).core?.ipc` and `(window as any).core?.window?.onShow?.()`. The `as any` is unnecessary: `src/renderer/env.d.ts` already declares `interface Window { core: ... }` with a full typed shape.
- **Impact**: Silences the type checker on every call into the preload bridge. Typos in channel names, wrong argument types, and missing `undefined` guards are invisible to the compiler. **Runtime risk: medium** — the optional-chain mitigates crashes but hides contract drift.
- **Proposed Fix**: Remove `(window as any)` and use `window.core` directly. The global `Window` augmentation in `env.d.ts` already covers the full shape:
  ```ts
  // Before
  ;(window as any).core?.ipc?.invoke('kernel', 'listTools', {})
  // After
  window.core.ipc.invoke('kernel', 'listTools', {})
  ```
  The `env.d.ts` declaration makes `window.core` always non-nullable, so the optional chain `?.` can also be removed for `ipc` and `window`. If preload injection can genuinely fail in tests, use `window.core?.ipc` — but then the `Window` type should declare the property as optional.
- **Risk Level**: Low (purely additive; no runtime change)
- **Applied Automatically?**: No — requires confirming whether `core` should be optional in `env.d.ts`

---

### 2. `(window as any)` in `main.tsx` — exposing React, UI, and dev flag

- **Problem**: `src/renderer/main.tsx:6,7,8` — three `(window as any)` assignments expose `React`, `UI`, and `__NUXY_DEV__` to dynamically-loaded frontend extensions.
  ```ts
  ;(window as any).React =
    React(window as any).UI =
    UI(window as any).__NUXY_DEV__ =
      import.meta.env.DEV
  ```
- **Impact**: Any code reading `window.React` or `window.UI` in an extension gets an implicit `any`. Type errors in extensions that destructure these globals are silently ignored. **Runtime risk: low** (assignment is safe), **maintainability: high** (no discoverability, no refactor safety).
- **Proposed Fix**: Add three declarations to `src/renderer/env.d.ts`:

  ```ts
  import type React from 'react'
  import type * as UI from '@nuxy/ui'

  interface Window {
    // ...existing core shape...
    React: typeof React
    UI: typeof UI
    __NUXY_DEV__: boolean
  }
  ```

  Then replace the three `as any` assignments with plain `window.X = ...` in `main.tsx`.

- **Risk Level**: Low
- **Applied Automatically?**: No — `env.d.ts` was read-only during this session (permission denied)

---

### 3. All UI components use `props: any` — entire `@nuxy/ui` package

- **Problem**: Every component in `packages/ui/src/components/` accepts `any` as its props type. Affected files and lines:
  - `Button/index.tsx:4` — `({ children, className, variant, ...props }: any)`
  - `Input/index.tsx:4` — `React.forwardRef(({ className, ...props }: any, ref: any)`
  - `ListItem/index.tsx:4` — `({ children, active, className, ...props }: any)`
  - `List/index.tsx:8` — `({ children, className, maxHeight, ...props }: any)`
  - `Badge/index.tsx:4` — `({ children, active, className, ...props }: any)`
  - `Card/index.tsx:4` — `({ children, className, ...props }: any)`
  - `ListItemText/index.tsx:9` — `({ children, variant, className, ...props }: any)`
  - `ListItemMeta/index.tsx:4` — `({ children, className, ...props }: any)`
  - `ListItemBody/index.tsx:4` — `({ children, className, ...props }: any)`
  - `ListItemActions/index.tsx:4` — `({ children, className, ...props }: any)`
  - `ShortcutBar/index.tsx:4` — `({ children, className, ...props }: any)`
  - `ShortcutHint/index.tsx:4` — `({ children, className, ...props }: any)`
  - `Kbd/index.tsx:4` — `({ children, className, ...props }: any)`
- **Impact**: Callers get no autocomplete, no type errors on wrong props (e.g. passing a number for `className`), and no IDE hover docs. The `...props` spread onto native DOM elements is entirely unchecked — any attribute name or type is accepted. **Maintainability: high**, **Runtime risk: low**.
- **Proposed Fix**: Replace `any` with proper HTML-element-extending interfaces. Pattern for each component:

  ```ts
  // Button
  export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'ghost' | 'danger'
  }
  export function Button({ children, className, variant, ...props }: ButtonProps) { ... }

  // Input (forwardRef)
  export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => { ... }
  )

  // ListItem, Card, ListItemBody, ListItemActions, ShortcutBar, ShortcutHint
  // → extend React.HTMLAttributes<HTMLDivElement>
  // Badge → extend React.HTMLAttributes<HTMLSpanElement>
  // Kbd → extend React.HTMLAttributes<HTMLElement>
  // ListItemText → extend React.HTMLAttributes<HTMLSpanElement>
  ```

  Add a `variant` literal union where applicable (e.g. `ListItemText`'s `variant: 'default' | 'success'`).

- **Risk Level**: Medium (widespread change across exported public API; callers that pass non-standard props will see new errors)
- **Applied Automatically?**: No — the fix touches the entire public API surface; all downstream extension frontends need a compatibility check first

---

### 4. `CoreContext.registry` uses `unknown` for all config params

- **Problem**: `packages/core/src/index.ts:27-30`:
  ```ts
  registry: {
    registerTool: (config: unknown) => void
    registerProvider: (config: unknown) => void
    registerOrchestrator: (handler: unknown) => void
  }
  ```
- **Impact**: Extension authors calling `core.registry.registerTool({ name: 'my-tool' })` receive no type checking on the registration config object. The corresponding implementation in `core-proxy.ts` manually guards with `typeof cfg === 'object' && 'name' in cfg`, which will silently accept anything. **Maintainability: medium** — there is no shared schema that tooling can enforce.
- **Proposed Fix**: Define a typed config interface and use it:

  ```ts
  // In packages/core/src/types.ts
  export interface ToolConfig {
    name: string
    description?: string
    [key: string]: unknown
  }
  export interface ProviderConfig {
    name: string
    [key: string]: unknown
  }
  export type OrchestratorHandler = (...args: unknown[]) => unknown

  // In CoreContext
  registry: {
    registerTool: (config: ToolConfig) => void
    registerProvider: (config: ProviderConfig) => void
    registerOrchestrator: (handler: OrchestratorHandler) => void
  }
  ```

- **Risk Level**: Medium (changes the public SDK contract; existing extensions using the SDK will need to satisfy the new types)
- **Applied Automatically?**: No — requires a schema decision

---

### 5. `CoreContext.extensions.invoke` returns `Promise<unknown>`

- **Problem**: `packages/core/src/index.ts:33-37`:
  ```ts
  extensions: {
    invoke: (targetId: string, channel: string, payload?: unknown) => Promise<unknown>
  }
  ```
- **Impact**: Every caller of `core.extensions.invoke(...)` receives `unknown` and must cast or use type guards before using the result. The actual runtime value is an `IpcResult<unknown>` (see `broker.ts`), so callers face an untyped response. **Runtime risk: medium** — unchecked casts on the result can silently pass wrong types through.
- **Proposed Fix**: Return `Promise<IpcResult>` which is already defined in the same package:

  ```ts
  import type { IpcResult } from './types.js'

  extensions: {
    invoke: (targetId: string, channel: string, payload?: unknown) => Promise<IpcResult>
  }
  ```

  The implementation in `core-proxy.ts` already calls `callHost(HostChannel.BROKER_INVOKE, ...)` which returns `Promise<unknown>`, but it can be cast at the proxy boundary.

- **Risk Level**: Low (widens the type contract in a backwards-compatible direction)
- **Applied Automatically?**: No — requires updating both `index.ts` and `core-proxy.ts`

---

### 6. `host-handlers.ts` — unsafe `as` cast on `BROKER_INVOKE` payload

- **Problem**: `src/electron/spawn/host-handlers.ts:29-33`:
  ```ts
  const {
    targetId,
    channel: targetChannel,
    payload: pl,
  } = payload as {
    targetId: string
    channel: string
    payload?: unknown
  }
  ```
  `payload` arrives as `unknown` from a worker message. The cast directly to a structural type bypasses any runtime validation — a malformed or malicious worker message could cause a destructuring runtime error.
- **Impact**: If `payload` is not an object (e.g. `null`, a string, or an array), destructuring throws `TypeError: Cannot destructure property 'targetId' of ...`. **Runtime risk: high** for an IPC handler that processes cross-origin worker messages.
- **Proposed Fix**: Add a runtime guard before the cast:
  ```ts
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as Record<string, unknown>).targetId !== 'string' ||
    typeof (payload as Record<string, unknown>).channel !== 'string'
  ) {
    return { error: 'Invalid broker:invoke payload' }
  }
  const {
    targetId,
    channel: targetChannel,
    payload: pl,
  } = payload as {
    targetId: string
    channel: string
    payload?: unknown
  }
  ```
- **Risk Level**: High
- **Applied Automatically?**: No — requires a runtime change

---

### 7. `host-handlers.ts` — `payload as string` and `payload as { file, data }` casts

- **Problem**: `src/electron/spawn/host-handlers.ts:52,57,66`:
  ```ts
  case HostChannel.CLIPBOARD_WRITE:
    clipboard.writeText(payload as string)   // line 52
  case HostChannel.STORAGE_READ:
    const filePath = resolveStoragePath(dataDir, payload as string)  // line 57
  case HostChannel.STORAGE_WRITE:
    const { file, data } = payload as { file: string; data: unknown }  // line 66
  ```
  All three are bare casts with no runtime validation that `payload` actually satisfies the asserted type.
- **Impact**: A malformed payload causes `clipboard.writeText(undefined)` (silent), `resolveStoragePath(dataDir, undefined)` (throws with a confusing message), or a destructuring TypeError. **Runtime risk: medium**.
- **Proposed Fix**: Add narrow guards for each case. Example for `CLIPBOARD_WRITE`:
  ```ts
  case HostChannel.CLIPBOARD_WRITE:
    if (typeof payload !== 'string') return { error: 'clipboard:writeText requires a string payload' }
    clipboard.writeText(payload)
    return { result: true }
  ```
- **Risk Level**: Medium
- **Applied Automatically?**: No — requires runtime logic changes

---

### 8. `spawn.ts` — untyped worker `message` handler

- **Problem**: `src/electron/spawn/spawn.ts:40`:
  ```ts
  worker.on('message', async (msg) => {
  ```
  `msg` is implicitly typed as `any` because Node's `Worker` event typing uses `any` for message payloads (from `worker_threads`).
- **Impact**: All property accesses on `msg` (`msg.type`, `msg.ipcChannels`, `msg.displayName`, `msg.id`, `msg.channel`, `msg.payload`) are unchecked. **Maintainability: medium** — structural drift between worker send and main-process receive is invisible.
- **Proposed Fix**: Define a discriminated union for the worker-to-host message protocol:

  ```ts
  type WorkerToHostMessage =
    | { type: 'registry:sync'; ipcChannels: string[]; displayName?: string }
    | { type: 'host:call'; id: string; channel: string; payload?: unknown }

  worker.on('message', async (msg: WorkerToHostMessage) => {
    if (msg.type === 'registry:sync') { ... }
    if (msg.type === 'host:call') { ... }
  })
  ```

  A matching `HostToWorkerMessage` type would similarly cover the reverse direction in `extension-host/src/index.ts`.

- **Risk Level**: Medium
- **Applied Automatically?**: No — requires a new shared type definition (ideally in `@nuxy/core`)

---

### 9. `extension-host/src/index.ts` — `workerData` cast and message cast

- **Problem**: `packages/extension-host/src/index.ts:12`:
  ```ts
  const { extId, absolutePath, logLevel } = workerData as WorkerData
  ```
  And line 25:
  ```ts
  parentPort!.on('message', (msg: Record<string, unknown>) => {
  ```
  `workerData` is `any` from Node's types — the cast is reasonable but unvalidated. The `msg` type is a typed annotation on an untyped event.
- **Impact**: If the host spawns the worker with a malformed `workerData` object, destructuring silently yields `undefined` for fields. **Runtime risk: low** (the host always controls the `workerData`), but there is no defence-in-depth.
- **Proposed Fix**: Validate `workerData` at startup:
  ```ts
  function assertWorkerData(d: unknown): asserts d is WorkerData {
    if (
      typeof d !== 'object' ||
      d === null ||
      typeof (d as WorkerData).extId !== 'string' ||
      typeof (d as WorkerData).absolutePath !== 'string' ||
      typeof (d as WorkerData).logLevel !== 'string'
    )
      throw new TypeError('Invalid workerData')
  }
  assertWorkerData(workerData)
  const { extId, absolutePath, logLevel } = workerData
  ```
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 10. `load-extension.ts` — fallback cast `(def ?? extModule) as ExtensionModule`

- **Problem**: `packages/extension-host/src/load-extension.ts:22`:
  ```ts
  return (def ?? extModule) as ExtensionModule
  ```
  This is a last-resort cast: if no `register` function is found anywhere in the module tree, the code still returns the raw module object typed as `ExtensionModule`. The calling code checks `ext?.register` but the cast conceals the fact that the returned value may not actually implement the interface.
- **Impact**: **Maintainability: low** — the `if (ext?.register)` guard in `loadExtensionModule` makes this safe at runtime. However the cast removes the compiler's ability to warn if `ExtensionModule` ever gains required fields.
- **Proposed Fix**: Return `undefined` explicitly when no module is resolved, and let the caller handle it:
  ```ts
  // at the end of resolveExtensionModule
  return undefined // instead of (def ?? extModule) as ExtensionModule
  ```
  The caller `loadExtensionModule` already handles `ext?.register` with optional chaining so this is safe.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 11. `scanner.ts` — missing return type on exported `scanExtensions`

- **Problem**: `src/electron/extensions/scanner.ts:44`:
  ```ts
  export async function scanExtensions() {
  ```
  No explicit return type annotation. TypeScript infers `Promise<void>` correctly, but the omission is inconsistent with the file's other exported function `rescanExtensions(): Promise<void>` (line 21 has an explicit annotation).
- **Impact**: **Maintainability: low** — inferred correctly, but inconsistency undermines the codebase convention.
- **Proposed Fix**:
  ```ts
  export async function scanExtensions(): Promise<void> {
  ```
- **Risk Level**: Low
- **Applied Automatically?**: No — trivial but kept as no-auto since it requires an Edit permission

---

### 12. `register.ts` — `listByType` missing return type

- **Problem**: `src/electron/ipc/register.ts:24`:
  ```ts
  function listByType(type: 'tool' | 'provider' | 'orchestrator') {
  ```
  Return type is inferred as a complex mapped array type. Explicit annotation would make the intent clear and catch regressions.
- **Proposed Fix**:
  ```ts
  import type { LoadedExtension } from '@nuxy/core'
  function listByType(type: 'tool' | 'provider' | 'orchestrator'): LoadedExtension[] {
  ```
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 13. `nuxyconfig.ts` — `parseConfig` return type needs `as Partial<NuxyConfig>` cast

- **Problem**: `src/electron/config/nuxyconfig.ts:94`:
  ```ts
  return result as Partial<NuxyConfig>
  ```
  `result` is typed as `Record<string, unknown>` and then cast. The cast is structurally valid because each `switch` case only assigns values of the correct type, but the intermediate `Record<string, unknown>` loses that information.
- **Impact**: **Low** — the values actually are the right types due to the explicit `switch`/`if` guards. However a future contributor adding a new key to `NuxyConfig` without adding it to the `switch` would get no compiler error.
- **Proposed Fix**: Type `result` directly as `Partial<NuxyConfig>` from the start:
  ```ts
  const result: Partial<NuxyConfig> = {}
  // ... switch cases assign to result.theme, result.windowWidth, etc. directly
  return result // no cast needed
  ```
- **Risk Level**: Low
- **Applied Automatically?**: No

---

## Preload Interface Assessment

`src/renderer/env.d.ts` correctly declares `interface Window { core: { ipc, window } }` and `src/electron/bootstrap/preload.ts` exposes the exact matching shape via `contextBridge.exposeInMainWorld('core', ...)`. **The preload interface IS typed** — the `(window as any)` usage in `App.tsx` is therefore purely unnecessary and can be dropped without any other change.

The `env.d.ts` is missing declarations for the three globals set in `main.tsx` (`React`, `UI`, `__NUXY_DEV__`). These are consumed only by dynamically-loaded extension frontends at runtime and never by renderer TypeScript code, which is why no compiler error surfaces today. They should still be declared for completeness and to allow typed extension development.

## Extension SDK Assessment

`packages/extension-sdk/src/index.ts` has good type coverage:

- `ExtensionModule.register(core: CoreContext)` is fully typed
- `defineExtension` is properly typed and returns `ExtensionModule`
- All re-exports from `@nuxy/core` are clean type-only imports

The only gap is that `CoreContext.registry` accepts `unknown` (issue #4 above), which flows through the SDK into extension code.

## Automatic Fixes Applied

None were applied in this session. The Edit and Bash tools required additional permissions that were not granted. All proposed fixes are described in detail above and are safe to apply manually or in a follow-up session with the appropriate permissions granted.

The highest-priority manual fixes to address first:

1. **Issue #6** (High) — add runtime guard for `BROKER_INVOKE` payload destructuring in `host-handlers.ts`
2. **Issue #3** (Medium, widespread) — replace `any` props in all `@nuxy/ui` components with proper HTML attribute interfaces
3. **Issue #1** (Low, easy win) — remove `(window as any)` from `App.tsx`; the types already exist in `env.d.ts`
4. **Issue #2** (Low, easy win) — add `React`, `UI`, `__NUXY_DEV__` to `env.d.ts` and drop `(window as any)` from `main.tsx`
