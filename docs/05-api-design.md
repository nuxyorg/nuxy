# 05 - API Design

## 1. Context Bridge Design Principles

Electron's `contextBridge` is the only safe way to pass data between the Chromium renderer (React) and the Node.js backend. To prevent "wildcard" vulnerabilities, Nuxy strictly forbids exposing raw `ipcRenderer.send` or `.invoke`.

Instead, the Host exposes a highly constrained, statically typed `window.core.ipc` object.

## 2. The Universal IPC Contract

### 2.1 Standardized Response Wrapper

Every IPC handler must return a normalized response object. This guarantees the Frontend never crashes due to unexpected thrown errors in the Backend.

```typescript
// src/shared/types/ipc.ts
export interface IpcResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  code?: 'NOT_FOUND' | 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR'
}
```

### 2.2 The `CoreContext` Interface

This is the interface injected into every Extension's isolated Worker Thread. It acts as an abstraction layer over native Electron APIs.

```typescript
// @nuxy/core (NPM package)
export interface CoreContext {
  // Storage API abstracts node:fs and enforces a Chroot Jail
  storage: {
    read: <T>(file: string) => Promise<T>
    write: <T>(file: string, data: T) => Promise<void>
  }

  // IPC API for direct communication with its own Frontend UI
  ipc: {
    handle: <T, R>(channel: string, handler: (payload: T) => Promise<IpcResponse<R>>) => void
    broadcast: <T>(channel: string, payload: T) => void
  }

  // Extension Schema Registry (For Tool/Provider/Orchestrator definition)
  registry: {
    registerTool: (config: ToolConfig) => void
    registerProvider: (config: ProviderConfig) => void
    registerOrchestrator: (handler: OrchestratorHandler) => void
    getCallableTools?: () => ToolSchema[] // Only available if 'caller: true'
  }

  // Cross-Extension Execution API (Only available if 'caller: true')
  extensions: {
    invoke?: (extensionName: string, params: any) => Promise<any>
  }

  // Notification API abstracts OS Notifications
  notify: (title: string, body: string) => void
}
```

## 3. Data Validation (Zod)

Because data flowing across the IPC bridge originates from a potentially compromised Chromium renderer, **the Backend must never trust IPC payloads**.

We utilize [Zod](https://zod.dev/) for runtime schema validation on every IPC handler.

```typescript
// Example: Validating Note Creation
import { z } from 'zod'

const CreateNoteSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string(),
})

export function register(core: CoreContext) {
  core.ipc.handle('notes:create', async (payload) => {
    // 1. Validate incoming data
    const parseResult = CreateNoteSchema.safeParse(payload)

    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error.message,
        code: 'VALIDATION_ERROR',
      }
    }

    // 2. Proceed safely
    const data = parseResult.data
    // ... logic
  })
}
```

## 4. Frontend Type Declarations

To ensure React can access `window.core.ipc` with TypeScript autocomplete, we declare the global interface in the root `env.d.ts`.

```typescript
// src/env.d.ts
interface Window {
  core: {
    ipc: {
      invoke: <T, R>(channel: string, payload?: T) => Promise<IpcResponse<R>>
      on: <T>(channel: string, listener: (payload: T) => void) => () => void // Returns unsubscribe fn
    }
  }
}
```

---

**Next Step:** [State Management](./06-state-management.md) | **Previous:** [Modules](./04-modules.md)

---

## Related Documents

| Topic                               | Document                                                     | Notes                                                           |
| ----------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Extension access and permissions    | [21-extension-access.md](./21-extension-access.md)           | Full API implementation status, renderer bridge, manifest rules |
| Plugin system and CoreContext proxy | [15-modular-plugin-system.md](./15-modular-plugin-system.md) | How CoreContext is injected via MessagePort                     |
| Security model and IPC trust        | [10-security.md](./10-security.md)                           | Why the backend must never trust IPC payloads                   |
