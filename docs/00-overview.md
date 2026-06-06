# 00 - System Overview

## 1. Executive Summary

Nuxy is not an application; it is an **Empty Shell (A Kernel)**.
By itself, Nuxy does absolutely nothing. It has no app launcher, no clipboard manager, no notes, and no UI other than a blank transparent frame. Its sole purpose is to act as an operating system for productivity extensions.

Inspired entirely by the **Gnome Extensions** ecosystem, Nuxy provides a secure Runtime Environment (VM Sandboxing, IPC bridging, Window Management) and expects the user to populate the `~/.nuxy/extensions/` directory with community-built or official plugins to give the application purpose.

## 2. The Legacy State (Vue 3 Monolith)

The previous iteration of Nuxy suffered from "fat main process" syndrome. It hardcoded features like the Password Vault and App Scanner directly into the core source code. If a user didn't want the YT-DLP feature, they couldn't remove it. If a developer wanted to add a Spotify controller, they had to fork the entire repository.

## 3. The New Paradigm (The Bare Metal Kernel)

The rebuild is guided by a radical engineering tenet: **The Core Must Be Useless**.

### Tenet A: The Empty Shell

When a user launches Nuxy for the first time without extensions, they see a message: "No extensions loaded. Please place extensions in ~/.nuxy/extensions/". Every piece of functionality—even the search bar itself—must be an extension.

### Tenet B: Absolute Extension Autonomy

Extensions are pre-compiled bundles (Frontend React + Backend Node.js) created by developers anywhere in the world. They are dropped into the extensions folder. Nuxy reads their `manifest.json`, executes their backend in a dedicated `worker_threads` sandbox, and dynamically injects their React UI via a custom `nuxy-ext://` protocol.

### Tenet C: Zero-Trust Security

Because Nuxy executes third-party code from the filesystem, it implements draconian security measures. Extensions cannot import raw Node built-ins (`fs`, `child_process`) or Electron APIs. They are isolated inside a `worker_threads` Worker and only have access to the `CoreContext` proxy injected by the kernel, limiting them to their own sandboxed data directories.

---

**Next Step:** [System Analysis](./01-system-analysis.md) | **Previous:** [README](./README.md)

---

## Related Documents

| Topic                         | Document                                                     | Notes                                      |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------------ |
| Architecture deep dive        | [02-architecture.md](./02-architecture.md)                   | Kernel, thread isolation, React canvas     |
| Plugin system philosophy      | [15-modular-plugin-system.md](./15-modular-plugin-system.md) | Extension loading sequence and CoreContext |
| Omni-input arbitration        | [16-omni-input-system.md](./16-omni-input-system.md)         | Tool / Provider / Orchestrator roles       |
| MVP execution plan            | [19-mvp-roadmap.md](./19-mvp-roadmap.md)                     | Sprint-by-sprint minimal scope             |
| Feature implementation status | [DOCUMENTATION.md](./DOCUMENTATION.md)                       | Implemented vs planned tracker             |
