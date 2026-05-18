# 18 - Advanced Capabilities

## 1. WebAssembly (WASM) Backend Support
While standard extensions use JavaScript/TypeScript for their backend logic, Nuxy supports high-performance **WebAssembly (WASM)** binaries.

- **Use Case**: Extensions requiring heavy computation (e.g., local image processing, cryptography, or a local SQLite engine).
- **Architecture**: Developers write their logic in Rust, Go, or C++, and compile it to a `.wasm` file. Because Node's `Worker` threads natively support WebAssembly, the Nuxy Kernel can instantiate the `.wasm` module securely, providing the same `CoreContext` bindings via imported functions.
- **Security**: WASM runs in a mathematically proven sandbox, making it even more secure than standard V8 JavaScript execution.

## 2. Developer Experience (DX) & Hot Reloading
To foster a vibrant extension ecosystem, Nuxy provides a flawless Developer Experience.

By launching the application via `nuxy --dev`, the Kernel enters Watch Mode. 
1. The developer points Nuxy to their local working directory (e.g., `~/Projects/my-nuxy-ext`).
2. Nuxy binds a filesystem watcher (via `chokidar`).
3. Whenever the developer saves `backend.ts` or `frontend.tsx`, Nuxy **instantly kills the old Worker thread**, spawns a new one, and triggers a React Fast Refresh for the UI. The developer sees their changes in real-time without ever restarting the Nuxy host.

## 3. Headless Extensions (Background Daemons)
Not all extensions require a User Interface. Nuxy supports `headless` extensions that run purely in the background as system daemons.

- **Use Case**: A Cron Job that syncs notes to GitHub every hour, a system resource monitor, or an extension that strictly acts as a hidden API for other extensions.
- **Manifest Definition**: By setting `"type": "headless"` in the `manifest.json`, the Kernel skips UI mounting entirely. The Worker thread simply spins up, executes its `register` function, and listens to IPC events or `setInterval` timers silently in the background.

## 4. The Extension Dependency Graph
Because the Nuxy ecosystem relies heavily on extensions calling other extensions (e.g., the AI Orchestrator calling the Vault), Nuxy implements a strict Dependency Graph.

- **Implementation**: Extensions declare their dependencies in `manifest.json` under `"peerExtensions"`.
- **Validation**: During boot, the Nuxy Kernel builds a topological graph of all extensions in `~/.local/share/nuxy/extensions/`.
- **Resolution**: If Extension A requires Extension B (e.g., `"com.nuxy.vault": "^1.2.0"`), but Extension B is missing, Extension A is placed in a `Suspended` state. The React UI will prompt the user: *"AI Orchestrator requires the Vault extension to function. Click here to download it."*
