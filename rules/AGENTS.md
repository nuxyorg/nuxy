# 🤖 AI Agent Guidelines for Nuxy

When modifying or generating code for this repository, you **MUST** strictly adhere to the following architectural rules based on the system docs.

---

## 1. The Core is an "Empty Shell" (Useless Core)

- **DO NOT** add user-facing features (notes, search, launcher, AI tools) to the Core.
- The Core is strictly a **Kernel**. Its ONLY jobs are: Extension Loading, Sandboxed Execution, IPC Routing, and Window Management.
- If it can be an extension, it **MUST** be an extension.

---

## 2. Extension Architecture (Gnome-Style)

- Extensions live in `~/.nuxy/extensions/` and run in completely isolated **Node.js Worker Threads** (`src/electron/spawn/`).
- Extensions **NEVER** use raw `require()`, `fs`, `http`, or `child_process`. They must use the secure, injected `CoreContext` proxy.
- Extensions are full-stack (React Frontend + Node.js Backend). UI is loaded via `nuxy-ext://<manifest.id>/…`.
- **Before writing any extension**, read [`rules/EXTENSION_GUIDE.md`](EXTENSION_GUIDE.md) in full.

---

## 3. Security & Communication

- **Zero-Trust (Default Deny)**: Host privileges require `permissions` in `manifest.json` (see `src/electron/permissions.ts`).
- Extensions **CANNOT** communicate directly. Cross-extension calls use `core.extensions.invoke` via `src/electron/broker.ts`.
- Use `pnpm` for package management.

**Failure to follow these rules breaks the fundamental architecture of Nuxy.**

---

## 4. Documentation & Logging

- Every change **MUST** be logged in the `docs/changelog` directory.
- Logs must be created in a new file for each day, using the format `docs/changelog/YYYY-MM-DD.md`.
- Detail all modifications, additions, and deletions clearly.

---

## 5. TDD Requirement

- **TDD is mandatory for all new features.** Write tests first; they must fail initially. Write the minimum code to make them pass. Do not consider a feature done until the full suite passes.
- Run `pnpm -C src test` to verify.

---

## 5b. Quality Gates (mandatory after code changes)

After writing or modifying code, run these before considering the task done:

```bash
pnpm format        # or: pnpm exec prettier --write <edited-files>
pnpm lint:fix      # fix auto-fixable ESLint issues
pnpm typecheck     # src/ + extensions/
```

- Fix **all** errors in files you touched. Do not leave type errors or lint errors behind.
- One-shot: `pnpm check:fix` runs format + lint:fix + typecheck.
- Read-only CI equivalent: `pnpm check`.

Cursor project hooks (`.cursor/hooks.json`) auto-format on edit and verify edited files on each agent turn. If the stop hook reports failures, fix them before stopping.

---

## 6. Shared Extension Utilities

Files under `extensions/shared/` are cross-extension utilities. Import from there, do **not** copy them into individual extensions.

| File                                               | Purpose                                             |
| -------------------------------------------------- | --------------------------------------------------- |
| `extensions/ui-default/src/hooks/two-panel-nav.ts` | Dual-pane keyboard navigation (`TwoPanelNav` class) |
| `extensions/store.ts`                              | Reactive store (`createStore`)                      |
| `extensions/shell-i18n.ts`                         | Shell i18n translator factory                       |

---

## 7. UI Components

- Use **LitElement** with `html\`\`` for all new extension frontends.
- The legacy `h()` / `host()` DOM factories in ui-default have been **removed**. Use Lit `<nuxy-*>` tags or `@nuxyorg/core` `html` templates.
- `ce-utils.ts` has been **removed** — do not reference it anywhere.
- All Lit imports must come from `@nuxyorg/core`, never directly from `lit`.
- Light DOM is **mandatory**: every tool element must override `createRenderRoot()` to return `this`.
- **Never use `unsafeCSS`** (or any other `unsafe*` Lit API). Use the `css` tagged template literal from `@nuxyorg/core` only. If you need the same declarations in two selectors, duplicate them — do not interpolate a shared string via `unsafeCSS`.

---

## 8. Rules & Skill Files

This `rules/` directory contains all AI agent guidance:

| File                                 | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `rules/AGENTS.md`                    | This file — architecture and behaviour rules           |
| `rules/EXTENSION_GUIDE.md`           | Comprehensive extension development guide              |
| `rules/LIT_MIGRATION_GUIDE.md`       | Converting legacy h() extensions to LitElement         |
| `rules/FRONTEND_STRUCTURE_GUIDE.md`  | UI vs Controller vs Viewmodel split                    |
| `rules/MANIFEST_GUIDE.md`            | Extension manifest rules and schema reference          |
| `rules/EXTENSIONS_README.md`         | High-level roadmap and checklist for extension authors |
| `rules/EXTENSION_README_TEMPLATE.md` | Markdown template for individual extension READMEs     |

The `.agents/skills/` directory contains Antigravity skill definitions:

| Skill                             | Trigger                                 |
| --------------------------------- | --------------------------------------- |
| `.agents/skills/write-extension/` | Writing or reviewing any Nuxy extension |
