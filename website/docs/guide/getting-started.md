---
title: Getting Started
---

# Getting Started

This guide walks you from zero to a running Nuxy instance in under five minutes.

## Prerequisites

- **Node.js 20+** — Nuxy uses Worker threads and `node:sqlite` which require Node 20.
- **pnpm** — The monorepo enforces pnpm via a `preinstall` hook. Install it with `npm install -g pnpm`.
- **Linux, macOS, or Windows** — Electron supports all three. Linux MPRIS (media) support requires `dbus-next`.

## Installation

```bash
# Clone the repository
git clone https://github.com/nuxy/nuxy
cd nuxy

# Install all workspace dependencies
pnpm install

# Start in development mode (hot-reload, copies extensions)
pnpm dev
```

`pnpm dev` does several things:

1. Copies `extensions/` from the repo into `~/.nuxy/extensions/` (skips if already up to date, unless `NUXY_DEV_OVERWRITE=1` is set)
2. Starts the Vite renderer dev server with HMR
3. Launches Electron pointing at the dev server
4. Watches for changes and restarts Electron when main-process files change

::: tip Custom extensions source
Set `NUXY_EXTENSIONS_SRC=/path/to/my/extensions` to override the default copy source.
:::

## First Launch

When Nuxy starts for the first time:

- It creates `~/.nuxy/nuxyconfig` with sensible defaults
- It creates `~/.nuxy/extensions/` and copies the bundled extensions into it
- It creates `~/.nuxy/data/` for extension storage
- The launcher window appears in the center of your primary display

You should see the omnibar. Try typing a math expression like `2 + 2` — the Calculator provider will return `4` inline. Type `clip` to activate the Clipboard Manager.

## Keyboard Shortcuts

| Shortcut            | Action                                                          |
| ------------------- | --------------------------------------------------------------- |
| `Escape`            | Hide the launcher (configurable — can minimize or quit instead) |
| `Tab` / `Shift+Tab` | Cycle through available tools                                   |
| `Enter`             | Activate the selected result or tool                            |
| `Arrow Up / Down`   | Navigate the results list                                       |
| `Ctrl+,`            | Open Settings (when the Settings extension is active)           |

The exact shortcuts available depend on the active tool. Each tool registers its shortcuts via `useToolKeyActions`, and the shell's footer bar shows contextual hints.

## Showing and Hiding

Nuxy runs as a single-instance application. A UNIX socket at `/tmp/nuxy.sock` accepts two commands:

```bash
# Toggle the window (show if hidden, hide if shown)
echo "toggle" | nc -U /tmp/nuxy.sock

# Force show
echo "show" | nc -U /tmp/nuxy.sock
```

You can bind these to a global shortcut in your desktop environment (e.g. GNOME keyboard shortcuts, i3/sway keybindings, KDE global shortcuts) for instant access from anywhere.

## Next Steps

- [Configuration](/guide/configuration) — Customize window size, position, theme, and behavior
- [Architecture](/guide/architecture) — Understand how the kernel, IPC, and extensions fit together
- [Your First Extension](/extensions/first-extension) — Build a custom extension in minutes
