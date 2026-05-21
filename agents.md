# 🤖 AI Agent Guidelines for Nuxy

When modifying or generating code for this repository, you **MUST** strictly adhere to the following architectural rules based on the system docs.

## 1. The Core is an "Empty Shell" (Useless Core)

- **DO NOT** add user-facing features (notes, search, launcher, AI tools) to the Core.
- The Core is strictly a **Kernel**. Its ONLY jobs are: Extension Loading, Sandboxed Execution, IPC Routing, and Window Management.
- If it can be an extension, it **MUST** be an extension.

## 2. Extension Architecture (Gnome-Style)

- Extensions live in `~/.nuxy/extensions/` and run in completely isolated **Node.js Worker Threads** (`src/electron/worker/`).
- Extensions **NEVER** use raw `require()`, `fs`, `http`, or `child_process`. They must use the secure, injected `CoreContext` proxy.
- Extensions are full-stack (React Frontend + Node.js Backend). UI is loaded via `nuxy-ext://<manifest.id>/…`.

## 3. Security & Communication

- **Zero-Trust (Default Deny)**: Host privileges require `permissions` in `manifest.json` (see `src/electron/permissions.ts`).
- Extensions **CANNOT** communicate directly. Cross-extension calls use `core.extensions.invoke` via `src/electron/broker.ts`.
- Use `pnpm` for package management.

**Failure to follow these rules breaks the fundamental architecture of Nuxy.**

## 4. Documentation & Logging

- Every change **MUST** be logged in the `docs/changelog` directory.
- Logs must be created in a new file for each day, using the format `docs/changelog/YYYY-MM-DD.md`.
- Detail all modifications, additions, and deletions clearly.
