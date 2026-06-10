---
title: API Reference
---

# API Reference

Nuxy exposes two API surfaces for extension authors:

| Surface                      | Where                              | Used by              |
| ---------------------------- | ---------------------------------- | -------------------- |
| **Backend** (`CoreContext`)  | Worker thread via `register(core)` | `backend.ts`         |
| **Renderer** (`window.core`) | Preload bridge in the main window  | Lit frontends, shell |

## Backend

| API                                                          | Page                             |
| ------------------------------------------------------------ | -------------------------------- |
| CoreContext (clipboard, fs, storage, db, shell, media, i18n) | [CoreContext](/api/core-context) |
| Tool / provider / orchestrator registration                  | [Registry](/api/registry)        |
| Handler registration and cross-extension invoke              | [IPC](/api/ipc)                  |
| Sandboxed JSON storage                                       | [Storage](/api/storage)          |
| OS clipboard read/write                                      | [Clipboard](/api/clipboard)      |

## Renderer

| API                                      | Page                  |
| ---------------------------------------- | --------------------- |
| Window resize, hide, drag, themes, icons | [Window](/api/window) |
| `core.ipc.invoke` from frontend          | [IPC](/api/ipc)       |

## Permissions

Every backend API requires a matching `permissions` entry in `manifest.json`. The kernel rejects undeclared calls at the host boundary.

See [Extension Access & Permissions](/extensions/extension-access) for the full implementation status table (implemented vs planned).

## Next steps

| I want to…              | Go to                                               |
| ----------------------- | --------------------------------------------------- |
| Build an extension      | [Your First Extension](/extensions/first-extension) |
| See all manifest fields | [Manifest Reference](/extensions/manifest)          |
| Understand IPC routing  | [IPC & Kernel](/guide/ipc-kernel)                   |
