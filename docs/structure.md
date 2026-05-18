# Nuxy File Structure Design

## Monorepo Layout

To enforce modular boundaries, Nuxy should be structured as a workspace (e.g. using `pnpm` workspaces), keeping Core API types, Shared UI, the Main Desktop App, and dummy MVP extensions separate.

```text
/
├── packages/
│   ├── core/                  # @nuxy/core
│   │   ├── src/index.ts       # Exposes CoreContext & Extension Types
│   │   └── package.json
│   └── ui/                    # @nuxy/ui
│       ├── src/index.ts       # Exports Shadcn components & useExtensionContext hook
│       └── package.json
├── apps/
│   ├── desktop/               # The Nuxy Kernel (Electron) & Shell (React)
│   │   ├── electron/          # Backend (Kernel)
│   │   │   ├── main.ts        # App boot, single instance lock
│   │   │   ├── window.ts      # Transparent BrowserWindow manager
│   │   │   ├── ipc.ts         # Message Broker & Validation
│   │   │   ├── scanner.ts     # Extension folder watcher
│   │   │   ├── protocol.ts    # nuxy-ext:// custom protocol
│   │   │   └── worker/        # Worker Thread Sandbox Logic
│   │   │       └── spawn.ts   # Node.js worker_threads launcher
│   │   ├── src/               # Frontend (Canvas)
│   │   │   ├── App.tsx        # Central OmniBar and routing
│   │   │   ├── main.tsx       # React DOM mount
│   │   │   └── env.d.ts       # window.core.ipc typings
│   │   ├── package.json
│   │   └── vite.config.ts
├── extensions/                # Local dummy extensions for MVP
│   ├── calculator/
│   │   ├── manifest.json
│   │   └── backend.js
│   └── clipboard/
│       ├── manifest.json
│       ├── backend.js
│       └── frontend.tsx       # Compiles to frontend.js via Vite
├── package.json               # Monorepo root scripts
└── pnpm-workspace.yaml        # Workspace definitions
```

## Guiding Principles
- **No Monoliths**: Every functional piece of logic (even basic OS utilities) must be an extension.
- **Clear Boundaries**: `apps/desktop` is completely devoid of application logic. It only handles IPC, React rendering, and Web Workers.
- **Small Files**: Keep logic focused. Instead of a massive `main.ts`, isolate `scanner.ts` from `worker/spawn.ts`.
