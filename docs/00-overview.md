# 00 - System Overview

## 1. Executive Summary
Nuxy is not an application; it is an **Empty Shell (A Kernel)**. 
By itself, Nuxy does absolutely nothing. It has no app launcher, no clipboard manager, no notes, and no UI other than a blank transparent frame. Its sole purpose is to act as an operating system for productivity extensions.

Inspired entirely by the **Gnome Extensions** ecosystem, Nuxy provides a secure Runtime Environment (VM Sandboxing, IPC bridging, Window Management) and expects the user to populate the `~/.local/share/nuxy/extensions/` directory with community-built or official plugins to give the application purpose.

## 2. The Legacy State (Vue 3 Monolith)
The previous iteration of Nuxy suffered from "fat main process" syndrome. It hardcoded features like the Password Vault and App Scanner directly into the core source code. If a user didn't want the YT-DLP feature, they couldn't remove it. If a developer wanted to add a Spotify controller, they had to fork the entire repository.

## 3. The New Paradigm (The Bare Metal Kernel)
The rebuild is guided by a radical engineering tenet: **The Core Must Be Useless**.

### Tenet A: The Empty Shell
When a user launches Nuxy for the first time without extensions, they see a message: "No extensions loaded. Please place extensions in ~/.local/share/nuxy/extensions/". Every piece of functionality—even the search bar itself—must be an extension.

### Tenet B: Absolute Extension Autonomy
Extensions are pre-compiled bundles (Frontend React + Backend Node.js) created by developers anywhere in the world. They are dropped into the extensions folder. Nuxy reads their `manifest.json`, executes their backend in a secure V8 Sandbox (Node `vm`), and dynamically injects their React UI via a custom `nuxy-ext://` protocol.

### Tenet C: Zero-Trust Security
Because Nuxy executes third-party code from the filesystem, it implements draconian security measures. Extensions cannot run raw `require('fs')`. They are injected with a restricted `CoreContext` API that limits them to their own sandboxed data directories.

---

**Next Step:** [System Analysis](./01-system-analysis.md) | **Previous:** [README](./README.md)
