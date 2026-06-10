---
title: Philosophy
---

# The Empty Shell

Nuxy is not a feature-packed app — it is a **kernel for productivity extensions**.

By itself it provides only a frameless window, an extension loader, and a secure IPC bridge. The omnibar, tool list, calculator, notes, settings, and every other feature come from extensions installed in `~/.nuxy/extensions/`.

This design is inspired by the **GNOME Extensions** model: a minimal runtime that developers populate with plugins.

## Three Principles

### 1. The core must be useless

If you launch Nuxy without extensions, you get an empty shell — not a half-finished product. Even the search bar lives in the shell extension, not the kernel. Every feature is optional and removable.

### 2. Extensions are autonomous

An extension is a self-contained folder with `manifest.json`, a backend Worker, and optionally a Lit frontend. Drop it into `~/.nuxy/extensions/`, restart, and it works. No core rebuild required.

### 3. Zero-trust execution

Extensions cannot import Node built-ins or Electron APIs. Each backend runs in an isolated Worker and talks to the OS only through a `CoreContext` proxy. Data is chroot-jailed per extension ID.

## What the kernel provides

| Capability        | Description                                                                         |
| ----------------- | ----------------------------------------------------------------------------------- |
| Window management | Frameless transparent `BrowserWindow`, spring resize, global toggle via UNIX socket |
| Extension scanner | Discovers manifests, spawns Workers, registers themes and icon packs                |
| IPC bridge        | Routes renderer calls to kernel built-ins or extension backends                     |
| Protocol server   | Serves extension assets via `nuxy-ext://<id>/…` with path-escape protection         |
| Permission gate   | Rejects undeclared `CoreContext` API calls at the host boundary                     |

## Extension types at a glance

| Type                 | Role                                                      |
| -------------------- | --------------------------------------------------------- |
| `tool`               | User-activated feature with a custom UI (Notes, Settings) |
| `provider`           | Real-time omnibar results (Calculator)                    |
| `orchestrator`       | Fallback Enter handler, typically AI routing              |
| `helper`             | Background service called by other extensions             |
| `uikit`              | Registers shared UI components into `window.UI`           |
| `theme` / `iconpack` | Visual assets consumed by the kernel                      |

See [Extension System](/guide/extension-system) for the full type reference.

## Learn more

- [Architecture Map](/design/architecture-map) — how the pieces connect
- [System Architecture](/design/system-architecture) — kernel, Workers, renderer
- [Security Model](/design/security) — isolation and permissions
- [Build your first extension](/extensions/first-extension) — hands-on tutorial
