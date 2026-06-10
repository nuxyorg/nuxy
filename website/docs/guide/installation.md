---
title: Installation
---

# Installation

## Development

```bash
git clone https://github.com/nuxy/nuxy
cd nuxy
pnpm install
pnpm dev
```

Development mode runs Electron with HMR. The renderer hot-reloads on frontend changes; the main process restarts on backend changes.

## Production build

```bash
pnpm build      # tests + compile renderer + Electron main
pnpm package    # electron-builder distributable
```

::: warning E2E tests need a build
`pnpm test:e2e:core` requires `pnpm build` first — Playwright launches the real app.
:::

## Runtime directories

After first launch:

```
~/.nuxy/
  nuxyconfig              # key=value settings (auto-created)
  extensions/
    com.nuxy.shell/
    com.nuxy.settings/
    com.nuxy.notes/
    com.nuxy.calculator/
    ...
  data/                   # chrooted per extension ID
    com.nuxy.notes/
    com.nuxy.settings/
    ...
  themes/                 # user-installed theme JSON files
```

Bundled extensions are synced from `extensions/` in the repo during `pnpm dev`.

## Installing third-party extensions

1. Create a folder under `~/.nuxy/extensions/`:

   ```bash
   mkdir -p ~/.nuxy/extensions/com.example.my-tool
   ```

2. Add `manifest.json`, `backend.ts`, and optionally `frontend.ts` + `nuxy-tool-*.ts`.

3. Restart Nuxy — the scanner picks up new extensions on launch.

::: tip Dev sync
`pnpm dev` auto-syncs repo extensions to `~/.nuxy/extensions/`. Use `NUXY_DEV_OVERWRITE=1` to force a full replace.
:::

## Logging

```bash
LOG_LEVEL=silly pnpm dev   # maximum verbosity
LOG_LEVEL=info  pnpm dev   # default in dev
```

Levels: `silly` · `info` · `warn` · `error`. Extension workers log via `core.logger.*`, scoped to the extension ID.

## Next steps

- [Configuration](/guide/configuration) — `nuxyconfig` reference
- [Built-in Extensions](/extensions/built-in) — what ships in the repo
- [Your First Extension](/extensions/first-extension) — build your own
