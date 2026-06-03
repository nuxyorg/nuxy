---
title: Installation
---

# Installation

## From Source (Development)

Nuxy is currently distributed as source code. Install from the repository and run in development mode.

```bash
git clone https://github.com/nuxy/nuxy
cd nuxy
pnpm install
pnpm dev
```

Development mode (`pnpm dev`) starts Electron with HMR enabled. The renderer reloads on frontend changes; the main process restarts on backend changes. Extensions are copied from `extensions/` in the repo to `~/.nuxy/extensions/` on startup.

## Building for Production

```bash
# Run tests, then build renderer + Electron main process
pnpm build

# Build + package a distributable (electron-builder)
pnpm package
```

`pnpm build` produces a compiled Electron app. `pnpm package` creates platform-specific distributables in `dist/`.

::: warning Build required for E2E tests
Playwright E2E tests (`pnpm -C src test:e2e:core`) require a completed `pnpm build` first — they launch the real app.
:::

## Directory Structure (Runtime)

After first launch, Nuxy creates the following directories in your home folder:

```
~/.nuxy/
  nuxyconfig          # Key=value configuration file (auto-created)
  extensions/         # Installed extensions (each in its own subfolder)
    com.nuxy.shell/
    com.nuxy.settings/
    com.nuxy.clipboard/
    ...
  data/               # Extension storage (chrooted per extension ID)
    com.nuxy.clipboard/
      history.json
    com.nuxy.notes/
      notes.db
    ...
  themes/             # JSON theme files (built-in + theme extensions)
    dark.json
    light.json
    ocean.json
    ...
```

## Installing Extensions

To install a third-party extension:

1. Create a folder with the extension's id inside `~/.nuxy/extensions/`:

   ```bash
   mkdir -p ~/.nuxy/extensions/com.example.my-tool
   ```

2. Place `manifest.json`, `backend.ts`, and `frontend.tsx` (and any other extension files) in that folder.

3. Restart Nuxy. The scanner picks up new extensions on every launch. In development mode, it also watches for changes.

::: tip Dev mode auto-copy
During `pnpm dev`, the bundled extensions in the repo's `extensions/` directory are automatically synced to `~/.nuxy/extensions/`. Use `NUXY_DEV_OVERWRITE=1` to force a full replacement instead of skipping unchanged files.
:::

## Logging

Nuxy uses structured logging with configurable verbosity:

```bash
# Maximum verbosity (includes all trace output)
LOG_LEVEL=silly pnpm dev

# Available levels: silly | info | warn | error
LOG_LEVEL=info pnpm dev
```

Logs appear in the terminal where Nuxy was started. Extension workers log through `core.logger.*`, which is scoped to the extension's ID.
