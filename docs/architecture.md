# Nuxy Architecture Map

## 1. System Overview

Nuxy is an **Empty Shell** Kernel. It acts as an operating system for productivity extensions, providing a secure runtime environment, IPC bridging, and window management. It has zero built-in features.

- **Reference**: [`00-overview.md`](./00-overview.md)

## 2. Core Modules

- **Kernel (`electron/main/`)**: The main process with OS access. Acts as the filesystem firewall and schema validator. Routes messages via a Kernel Message Broker.
- **Isolated Threads (`worker_threads`)**: Dedicated Node.js environments for extension backends. Ensures strict memory and execution isolation.
- **React Canvas (`src/`)**: A blank frontend shell that dynamically loads and renders extension UIs via the `nuxy-ext://` protocol.
- **Reference**: [`02-architecture.md`](./02-architecture.md), [`04-modules.md`](./04-modules.md)

## 3. Data Flow

- **Unidirectional Bridge**: Chromium Renderer (UI) ↔ Core Bridge ↔ V8 Sandbox (Backend). The UI never directly calls the OS; it invokes the Kernel, which forwards validated payloads to the backend worker.
- **Real-Time Events**: Backend emits events → Kernel routes to UI → UI updates.
- **Reference**: [`03-data-flow.md`](./03-data-flow.md)

## 4. API Design (CoreContext)

Extensions are injected with a restricted `CoreContext` proxy over `MessagePort`.

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

Extensions use a globally shared UI library based on Shadcn, injected at runtime by the host. This guarantees visual consistency and tiny bundle sizes.

- **Reference**: [`17-frontend-extensions.md`](./17-frontend-extensions.md)

## 7. Missing Gaps / Ambiguities

- **Dynamic Permission Prompts**: Specifics of pausing a worker while waiting for user consent UI are not finalized.
- **Vite Externalization**: Detailed build config for seamlessly externalizing `@nuxy/ui` is not fully documented yet.
- **Native Modules in Workers**: Handling native node modules (`.node` files) inside `worker_threads` across different platforms.
