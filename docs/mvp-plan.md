# Nuxy MVP Breakdown

**Goal**: Prove the "Empty Shell + Worker Thread Extension" paradigm works.

**Scope Exclusions**: 
- AI Orchestrator integration (Ollama/Functiongemma)
- Strict Chroot Jails and Sandbox Permissions (Trust by default for MVP)
- Dynamic Permission Consent UI
- WebAssembly (WASM) & Hot Reloading

## Milestone 1: The Bare Metal Shell
- **Scope**: Scaffold the core application and UI canvas.
- **Goal**: Have a blank transparent window that utilizes a Single Instance Daemon pattern.
- **Key Features**:
  - Vite + React + Electron setup
  - Transparent, frameless window logic
  - OmniBar UI (Central input component displaying "Nuxy MVP: Ready")
  - `app.requestSingleInstanceLock()` to toggle visibility via global hotkeys (simulated via `/tmp/nuxy.sock` or OS shortcuts).

## Milestone 2: The Extension Engine
- **Scope**: Build the Core Kernel components that discover and sandbox plugins.
- **Goal**: The Kernel can find an extension folder and spawn its backend in a `worker_threads` instance.
- **Key Features**:
  - `ExtensionScanner` to watch `~/.nuxy/extensions/`
  - Spawn dedicated `Worker` threads for detected `backend.js` files
  - Inject minimal `CoreContext` via `MessagePort` to allow pinging the Kernel
  - Register custom `nuxy-ext://` protocol in Electron to serve frontend files locally.

## Milestone 3: The First Provider (Calculator)
- **Scope**: Prove real-time input arbitration ("Provider" pattern).
- **Goal**: User types math, the Calculator extension evaluates it via worker thread.
- **Key Features**:
  - `nuxy-ext-calculator` dummy extension folder
  - Simple math evaluation logic in `backend.js`
  - React UI sends typed text to Kernel -> Calculator Worker evaluates -> Returns answer -> React dropdown displays it.

## Milestone 4: The First Tool (Clipboard)
- **Scope**: Prove custom UI mounting ("Tool" pattern).
- **Goal**: User invokes the tool, and its React UI is dynamically mounted.
- **Key Features**:
  - `nuxy-ext-clipboard` dummy extension folder
  - Backend polls `electron.clipboard` to track history
  - `frontend.js` exports a React component
  - Nuxy shell dynamically imports and renders the component into the Canvas Zone when invoked (`>clip`).
