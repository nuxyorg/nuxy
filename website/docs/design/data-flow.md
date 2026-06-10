---
title: Data Flow
---

# Data Flow

## 1. Unidirectional Data across Boundaries

Because Nuxy is an Empty Shell acting as a router, the data flow occurs between the user's downloaded custom element UI (running in the Chromium Renderer) and the user's downloaded Backend Node.js code (running in the V8 Sandbox). The Nuxy kernel only acts as the bridge.

```mermaid
sequenceDiagram
    participant User
    participant ExtUI as External Extension UI (Web Components)
    participant CoreBridge as Nuxy Core IPC Bridge
    participant ExtBackend as External Ext Backend (V8 Sandbox)
    participant CoreStorage as Nuxy Core Storage API

    User->>ExtUI: Types into search/notes/etc.
    ExtUI->>CoreBridge: window.core.ipc.invoke('ext_id:action', data)
    CoreBridge->>ExtBackend: Routes to sandboxed backend.js
    ExtBackend->>ExtBackend: Processes logic safely
    ExtBackend->>CoreStorage: core.storage.write('data.json')
    CoreStorage-->>ExtBackend: Success
    ExtBackend-->>CoreBridge: Resolves standard response
    CoreBridge-->>ExtUI: Resolves IPC Promise
    ExtUI->>User: Renders UI Update
```

## 2. Real-Time Event Streams

For push-based updates (e.g., a background monitor pushing state to its frontend), the planned flow uses `core.ipc.broadcast` from the backend and `window.core.ipc.on` in the frontend. This API is not yet implemented — frontends currently poll via `setInterval` or re-fetch on `query` changes.

---

**See also:** [Modules](/design/modules) · [IPC & Kernel](/guide/ipc-kernel) · [System Architecture](/design/system-architecture)
