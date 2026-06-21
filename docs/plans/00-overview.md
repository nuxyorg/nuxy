# Backlog: 6 parallel initiatives (2026-06-19)

Tracking doc for six work items raised in review. Each has its own plan file
and is implemented on an isolated git worktree/branch, merged to `main`
independently once its tests/checks pass.

| #   | Plan                                                           | Branch                         | Depends on    | Status      |
| --- | -------------------------------------------------------------- | ------------------------------ | ------------- | ----------- |
| 1   | [NuxyCore responsibility audit](01-nuxycore-audit.md)          | `task/nuxycore-audit`          | —             | done        |
| 2   | [Copyable icon grid](02-icon-grid-copyable.md)                 | `task/icon-grid-copyable`      | —             | done        |
| 3   | [Download manager extension](03-download-manager-extension.md) | `task/download-manager`        | #4 (deeplink) | done        |
| 4   | [Deeplink system](04-deeplink-system.md)                       | `task/deeplink-system`         | —             | done        |
| 5   | [Ctrl+K → settings deeplink](05-ctrlk-settings-deeplink.md)    | `task/ctrlk-settings-deeplink` | #4 (deeplink) | in progress |
| 6   | [Linux DE install/config docs](06-linux-de-install-docs.md)    | `task/linux-de-docs`           | —             | done        |

Items #3 and #5 consume the deeplink scheme/API defined in #4, so they are
queued until #4 lands on `main` to avoid two incompatible deeplink designs.

---

## Backlog: UI & extensions polish (2026-06-21)

Twelve review items grouped into seven workstreams (settings, list scroll,
store, angrysearch, clipboard, shell Ctrl+K, ollama). See
[07-ui-extensions-backlog.md](07-ui-extensions-backlog.md) for phased order and
blockers.

| Group | Scope                                      | Blocked by | Status |
| ----- | ------------------------------------------ | ---------- | ------ |
| A     | Store tab-bar fix, Ollama icon             | —          | done   |
| B     | List forward-scroll edge snap              | —          | done   |
| C     | Settings Esc, bool→switch, list field type | —          | done   |
| D     | Ctrl+K submenu Esc + selection memory      | —          | done   |
| E     | Angrysearch repair + ignored-dirs list     | E2 → C3    | done   |
| F     | Clipboard poll perf                        | —          | done   |
| G     | Ollama models, loader, copy/retry          | G3 → D     | done   |

All seven groups landed on `main` (2026-06-21 implementation pass): store/ollama
icon fixes, angrysearch index-status polling + locale-driven empty states, the
scroll edge-snap fix, settings Esc/bool-switch/list-field-type, Ctrl+K submenu
index restoration, angrysearch ignored-dirs migrated to the new list field,
clipboard poll-interval sync, and Ollama model refresh/inline loader/copy-retry.
Full test suite green (only 3 pre-existing, unrelated failures remain:
`notes`/`download-manager` hint-text copy mismatches and `nuxy-kbd` hold-ms);
`pnpm typecheck` and `pnpm lint` clean.
