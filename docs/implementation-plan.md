# Nuxy Incremental Implementation Plan

This outlines the exact steps to implement the MVP step-by-step. Stop and verify after each milestone.

---

## 🛠 Prerequisites: Monorepo Scaffold

1. Create `pnpm-workspace.yaml` defining `packages/*` and `apps/*`.
2. Scaffold `@nuxy/core` package with `CoreContext` interfaces.
3. Scaffold `@nuxy/ui` package exporting minimal dummy Shadcn components to start.

---

## ✅ Milestone 1: The Bare Metal Shell

**Goal:** Run a blank React/Electron window that stays alive and responds to a global toggle shortcut.

**Steps:**

1. **`src/package.json`**: Initialize Vite + React + Electron dependencies.
2. **`src/vite.config.ts`**: Configure Vite to build for Electron renderer and main process.
3. **`src/electron/main.ts`**:
   - Boot Electron app.
   - Request single instance lock (`app.requestSingleInstanceLock()`).
4. **`src/electron/window.ts`**:
   - Create a `BrowserWindow` with `transparent: true`, `frame: false`.
   - Implement `showWindow()` and `hideWindow()` (using `setBackgroundThrottling(true)`).
5. **`src/src/main.tsx` & `App.tsx`**:
   - Render a centered, styled "OmniBar" `div` using tailwind.
   - Display a fallback message: _"Nuxy MVP: Ready"_.

---

## ✅ Milestone 2: The Extension Engine

**Goal:** Scan the local filesystem, spawn a Node Worker, and execute basic IPC.

**Steps:**

1. **`src/electron/protocol.ts`**:
   - Register `nuxy-ext://` custom scheme to fetch files from `~/.nuxy/extensions`.
2. **`src/electron/scanner.ts`**:
   - Implement a simple watcher/scanner to read `manifest.json` from extension directories.
3. **`src/electron/worker/spawn.ts`**:
   - Spawns a `worker_threads` Worker for an extension's `backend.js`.
   - Passes a `MessagePort` to the worker as a mock `CoreContext`.
4. **`src/electron/ipc.ts`**:
   - Bridge `ipcMain.handle` calls from the React Renderer to the specific Worker via its `MessagePort`.
5. **Verification**:
   - Ensure the React UI can call `window.core.ipc.invoke('test:ping')` and get a reply from a spawned worker.

---

## ✅ Milestone 3: The First Provider (Calculator)

**Goal:** Live real-time execution of math text via a sandboxed worker.

**Steps:**

1. **`extensions/calculator/manifest.json`**: Define as `"type": "provider"`.
2. **`extensions/calculator/backend.js`**:
   - Implement basic string parsing and `eval()` (safe enough for math).
   - Register the provider handler via the injected `CoreContext`.
3. **`src/src/App.tsx`**:
   - Add an `<input>` for the OmniBar.
   - On change, send text via `window.core.ipc` to the provider.
   - Display returned string below the input.

---

## ✅ Milestone 4: The First Tool (Clipboard)

**Goal:** Dynamically import an external React UI into the Nuxy Canvas.

**Steps:**

1. **`extensions/clipboard/manifest.json`**: Define as `"type": "tool"`.
2. **`extensions/clipboard/backend.js`**:
   - Read OS clipboard history. Store locally or just in memory for MVP.
3. **`extensions/clipboard/frontend.js`** (Pre-compiled React code):
   - Export a React component that fetches data via IPC and renders it.
4. **`src/src/App.tsx`**:
   - Add command listener (e.g., `>clip`).
   - Use dynamic import `const ExtView = React.lazy(() => import('nuxy-ext://clipboard/frontend.js'))`.
   - Render `<ExtView />` inside a `Suspense` boundary in the Canvas Zone.
