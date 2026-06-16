---
name: project-extension-guide
description: Extension development rules, current violations in bundled extensions, and Core API gaps that must be filled
metadata:
  type: project
---

Extension development guide created at `rules/EXTENSION_GUIDE.md` and referenced in `CLAUDE.md`. All AI agents must read it before writing or reviewing extensions.

**Why:** Extensions were being written at varying quality — some used direct Node.js imports, hardcoded colors, mouse-only interactions, and custom UI components outside the UI kit.

**How to apply:** Before writing any extension code, read `rules/EXTENSION_GUIDE.md`. Flag any violation found during review.

## Known violations in bundled extensions (as of 2026-05-25)

### angrysearch/backend.js — critical

- Direct `import` of `os`, `path`, `fs`, `child_process`, `node:sqlite`
- `execFile('xdg-open', ...)` — direct OS shell call
- Constructs `~/.nuxy/data/com.nuxy.angrysearch` path manually
- All of these must move to `core.fs`, `core.db`, `core.shell` once those APIs are added

### clipboard/frontend.js — moderate

- Right panel is entirely inline styles with hardcoded colors (`rgba(0,0,0,0.2)`, `rgba(255,255,255,0.05)` etc.)
- Should use theme tokens (`var(--surface-overlay)` etc.) and UI kit layout components
- `onClick` on `ListItem` without keyboard equivalent for some actions

### angrysearch/frontend.js — minor

- `onClick` on `ListItem` (keyboard nav exists via `useListNavigation`, so acceptable as secondary)
- `style={{ color: '#ef4444' }}` hardcoded danger color — should be `var(--color-danger)`
- Emoji icons (`📁`, `📄`) — should use `IconFile` / UI kit icons

### settings/frontend.js — minor

- `onClick={() => setSelectedRow(i)}` on `ListItem` — acceptable since keyboard nav also works
- Emoji icons (`⚙️`, `🪟`) in SECTIONS config

## Core APIs (Implemented)

These APIs have been implemented in `packages/core` and are accessible in `CoreContext`:

- `core.fs` — sandboxed and full file system operations (`fileExists`, `readDir`, `readFile`, `writeFile`, etc.)
- `core.db.open(name)` — sandboxed SQLite database
- `core.shell.open` — opens files / URLs via system handler
- `core.shell.exec` / `core.shell.spawn` — runs subprocesses with shell capability
