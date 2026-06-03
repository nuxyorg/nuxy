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
├── src/                   # The Nuxy Kernel (Electron) & Shell (React)
│   ├── electron/          # Backend (Kernel), grouped by domain
│   │   ├── bootstrap/     # main.ts, preload.ts
│   │   ├── config/        # paths, nuxyconfig, storage-path
│   │   ├── extensions/    # scanner, registry
│   │   ├── spawn/         # worker spawn + host-handlers
│   │   ├── ipc/           # register, validate
│   │   ├── protocol/      # nuxy-ext://
│   │   ├── window/        # manager, runtime, spring
│   │   └── themes/        # install bundled themes → ~/.nuxy/themes/
│   ├── themes/            # Bundled theme JSON (Tailwind + runtime)
│   ├── renderer/          # Frontend (Canvas)
│   │   ├── App.tsx        # Central OmniBar and routing
│   │   ├── main.tsx       # React DOM mount
│   │   └── env.d.ts       # window.core.ipc typings
│   ├── package.json
│   └── vite.config.ts
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
- **Clear Boundaries**: `src` is completely devoid of application logic. It only handles IPC, React rendering, and Web Workers.
- **Small Files**: Keep logic focused. Instead of a massive `main.ts`, isolate `scanner.ts` from `worker/spawn.ts`.

---

## Related Documents

| Topic | Document | Notes |
| ----- | -------- | ----- |
| Architecture topology | [02-architecture.md](./02-architecture.md) | Kernel, worker threads, and React canvas roles |
| Kernel audit and canonical paths | [electron-fix-plan.md](./electron-fix-plan.md) | `~/.nuxy/` layout and completed remediation |
| Feature implementation status | [DOCUMENTATION.md](./DOCUMENTATION.md) | Implemented vs planned tracker with canonical path table |
