---
title: Quick Start
---

# Quick Start

Get Nuxy running locally in under five minutes.

## Prerequisites

- **Node.js 20+** — Worker threads and `node:sqlite` require Node 20
- **pnpm** — enforced by the monorepo (`npm install -g pnpm`)
- **Linux, macOS, or Windows** — Linux MPRIS support needs `dbus-next`

## Install and run

```bash
git clone https://github.com/nuxy/nuxy
cd nuxy
pnpm install
pnpm dev
```

`pnpm dev` will:

1. Build and watch `ui-default`
2. Sync `extensions/` → `~/.nuxy/extensions/`
3. Start the Vite renderer with HMR
4. Launch Electron

::: tip Custom extensions source
`NUXY_EXTENSIONS_SRC=/path/to/extensions` overrides the sync source.  
`NUXY_DEV_OVERWRITE=1` forces a full replace instead of skipping unchanged files.
:::

## First launch

On first run Nuxy creates:

| Path                  | Purpose                                          |
| --------------------- | ------------------------------------------------ |
| `~/.nuxy/nuxyconfig`  | Window, theme, and behavior settings             |
| `~/.nuxy/extensions/` | Bundled extensions (shell, notes, calculator, …) |
| `~/.nuxy/data/`       | Per-extension storage                            |

The launcher appears centered on your primary display.

### Try it

| Action              | What happens                              |
| ------------------- | ----------------------------------------- |
| Type `2 + 2`        | Calculator provider returns `4` inline    |
| Tab to **Notes**    | Opens the notes tool                      |
| Tab to **Settings** | Theme, language, window options           |
| `Ctrl+,`            | Settings shortcut when Settings is active |

See [Built-in Extensions](/extensions/built-in) for the full bundled list.

## Keyboard shortcuts

| Shortcut            | Action                       |
| ------------------- | ---------------------------- |
| `Escape`            | Hide launcher (configurable) |
| `Tab` / `Shift+Tab` | Cycle tools                  |
| `Enter`             | Activate result or tool      |
| `↑` / `↓`           | Navigate results list        |

Tool-specific shortcuts appear in the shell footer when a tool is active.

## Show and hide

```bash
echo "toggle" | nc -U /tmp/nuxy.sock   # toggle visibility
echo "show"   | nc -U /tmp/nuxy.sock   # force show
```

Bind these to a global shortcut in your desktop environment for instant access.

## Next steps

| I want to…                  | Go to                                               |
| --------------------------- | --------------------------------------------------- |
| Install for production      | [Installation](/guide/installation)                 |
| Customize window & theme    | [Configuration](/guide/configuration)               |
| Understand the architecture | [Architecture](/guide/architecture)                 |
| Build an extension          | [Your First Extension](/extensions/first-extension) |
