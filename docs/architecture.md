# Nuxy Architecture Map

## 1. System Overview

Nuxy is an **Empty Shell** Kernel. It acts as an operating system for productivity extensions, providing a secure runtime environment, IPC bridging, and window management. It has zero built-in features.

- **Reference**: [`00-overview.md`](./00-overview.md)

## 2. Core Modules

- **Kernel (`src/electron/`)**: The main process with OS access. Acts as the filesystem firewall and schema validator. Routes messages via a Kernel Message Broker.
- **Isolated Threads (`worker_threads`)**: Dedicated Node.js environments for extension backends. Ensures strict memory and execution isolation.
- **Web Components Renderer (`src/renderer/`)**: A vanilla bootstrap that registers custom elements and mounts `<nuxy-shell-view>`. Extension UIs are loaded as `nuxy-tool-*` custom elements via the `nuxy-ext://` protocol.
- **Reference**: [`02-architecture.md`](./02-architecture.md), [`04-modules.md`](./04-modules.md)

## 3. Data Flow

- **Unidirectional Bridge**: Chromium Renderer (UI) ↔ Core Bridge ↔ V8 Sandbox (Backend). The UI never directly calls the OS; it invokes the Kernel, which forwards validated payloads to the backend worker.
- **Real-Time Events**: Backend emits events → Kernel routes to UI → UI updates.
- **Reference**: [`03-data-flow.md`](./03-data-flow.md)

## 4. API Design (CoreContext)

Extensions are injected with a restricted `CoreContext` proxy over `worker_threads` IPC (`parentPort`).

- **`storage`**: Chroot-jailed filesystem access.
- **`ipc`**: Communication with the extension's UI.
- **`registry`**: Registering schemas (`Tool`, `Provider`, `Orchestrator`).
- **`extensions`**: Safely invoking other extensions (if permitted).
- **Reference**: [`05-api-design.md`](./05-api-design.md), [`15-modular-plugin-system.md`](./15-modular-plugin-system.md)

## 5. Extension Ecosystem

Extensions live in `~/.nuxy/extensions/` and declare capabilities in `manifest.json`.

- **Capabilities**: `callable` (can be executed by others), `caller` (can execute others).
- **Types**: `Tool` (standard utility), `Provider` (real-time dropdown), `Orchestrator` (AI/logic fallback).
- **Reference**: [`16-omni-input-system.md`](./16-omni-input-system.md)

## 6. Shared UI (`@nuxy/ui`)

Extensions use a globally shared custom element library injected at runtime by the `ui-default` extension. `packages/ui` provides type-only stubs; the actual `nuxy-*` custom elements are registered by `ui-default/frontend.js`. This guarantees visual consistency and tiny per-extension bundle sizes.

- **Reference**: [`17-frontend-extensions.md`](./17-frontend-extensions.md)

## 7. Web Components Renderer

The renderer runs React-free. Extension UIs are `nuxy-tool-*` custom elements implementing the `NuxyToolElement` interface (`query`, `committedQuery`, `extensionId` properties + `connectedCallback`/`disconnectedCallback`). DOM is composed with the `h()` helper from `ce-utils.ts`; state is managed by controller classes. Two renderer-side APIs handle cross-extension UI integration securely:

- **`core.composition`** — named shell slots (`background-layer`, `footer-portal`); manifest-validated claims
- **`<nuxy-tool-host>`** — dynamic tool mounting; forwards `query` via JS property (not attribute)

- **Reference**: [`architecture/lit-renderer-composition.md`](./architecture/lit-renderer-composition.md), [`react-to-lit-migration.md`](./react-to-lit-migration.md)

## 8. Missing Gaps / Ambiguities

- **Dynamic Permission Prompts**: Specifics of pausing a worker while waiting for user consent UI are not finalized.
- **Vite Externalization**: Detailed build config for seamlessly externalizing `@nuxy/ui` is not fully documented yet.
- **Native Modules in Workers**: Handling native node modules (`.node` files) inside `worker_threads` across different platforms.
