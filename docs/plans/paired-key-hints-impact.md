# Paired keyboard hint groups — impact analysis

## Problem

Footer shortcut chips were 1:1 with `ShellAction` entries. Paired bindings (↑/↓, Shift+↑/↓) only put `hint` on the first key, so:

- Clicking a chip ran half the shortcut (e.g. Up only).
- Combined hints were incomplete (e.g. `⇧ ↑` without ↓).

## Solution

Introduce **display groups**: a parent action owns `hint` + `label`; real bindings live in `children`. Footer chips for groups are **non-clickable** by default.

### Core API (`@nuxyorg/core`)

| Symbol                     | Role                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `ShellAction.children`     | Keyboard bindings (already existed, now used)                 |
| `ShellAction.clickable?`   | Opt-out of footer click (default: true when `handler` exists) |
| `ShellAction.handler?`     | Optional on display-only parents                              |
| `flattenShellActions()`    | Expands groups for keyboard routing                           |
| `computeKeyHints()`        | Top-level hints only (unchanged filter semantics)             |
| `isShellActionClickable()` | Footer render helper                                          |

### Authoring helper

`extensions/ui-default/src/hooks/paired-key-action.ts` — `pairedKeyAction({ label, negative, positive, axis?, modifiers?, ... })`

## Shell / infra changes

| File                                                  | Change                             |
| ----------------------------------------------------- | ---------------------------------- |
| `packages/core/src/shell.ts`                          | `clickable?`, optional `handler`   |
| `packages/core/src/shell-actions.ts`                  | New utilities + tests              |
| `src/electron/bootstrap/shell-bridge.ts`              | Uses shared `computeKeyHints`      |
| `packages/ext-devserver/src/dev-bridges.ts`           | Same                               |
| `extensions/shell/controllers/keyboard-controller.ts` | Flattens actions before match      |
| `extensions/shell/frontend.ts`                        | Display-only chips, no click       |
| `extensions/ui-default/.../ShortcutHint/*`            | `--display` CSS (no pointer/hover) |

## Migrated extensions & hooks

| Location                                | Pattern                                         |
| --------------------------------------- | ----------------------------------------------- |
| `settings/controller.ts`                | Left/right navigate + Shift+↑↓ priority reorder |
| `clipboard/controller.ts`               | List navigate                                   |
| `angrysearch/controller.ts`             | List navigate                                   |
| `qbittorrent/controller.ts`             | List navigate                                   |
| `download-manager/controller.ts`        | List navigate                                   |
| `nyaa/controller.ts`                    | List navigate                                   |
| `store/controller.ts`                   | Tab + list navigate                             |
| `video-downloader/controller.ts`        | Tab + list navigate                             |
| `file-transfer/controller.ts`           | Menu navigate                                   |
| `ui-default/hooks/two-panel-nav.ts`     | Vertical navigate + flatten for right panel     |
| `ui-default/hooks/useListNavigation.ts` | List navigate                                   |
| `ui-default/hooks/grid-navigation.ts`   | ↑↓ and ←→ pairs                                 |

## Not migrated (intentional)

| Location                           | Reason                                             |
| ---------------------------------- | -------------------------------------------------- |
| `angrysearch` / `nyaa` Shift+Enter | Single combo binding; click = correct action       |
| `notes/controller.ts`              | Separate Previous/Next labels, no shared `↑↓` hint |
| `ollama`, `icon-browser`, etc.     | No paired-arrow footer pattern                     |

## Backward compatibility

- **Flat actions unchanged** — `{ key, hint, handler }` still works; footer chips remain clickable.
- **Tests** that locate actions by `key` must use `flattenShellActions()` when groups are used.
- **IDs** — paired groups use one parent id (e.g. `qbit-navigate`); children get `-neg`/`-pos` suffixes.

## UX outcome

| Before                        | After                              |
| ----------------------------- | ---------------------------------- |
| Navigate `↑↓` click → Up only | `↑↓` chip display-only             |
| Shift move shows `⇧ ↑` only   | Shows `⇧` + `↑↓`                   |
| Hover suggests click on pairs | No pointer/hover on display groups |

## Risk / follow-ups

1. **Docs** — `EXTENSION_GUIDE.md` / website dev guide still show legacy two-action pattern; update when convenient.
2. **Export** — `pairedKeyAction` not yet re-exported from `ui-default` index (import path: `../ui-default/src/hooks/paired-key-action.ts`).
3. **Palette** — Display groups are footer-only; children with `showInMenu` are unaffected.
4. **Hold progress** — Hold animations still bind to parent hint chip; paired groups are not hold targets today.

## Verification

- `packages/core/src/shell-actions.test.ts`
- `extensions/ui-default/src/hooks/paired-key-action.test.ts`
- `extensions/shell/tests/keyboard-controller.test.ts` (flatten routing)
- `src/electron/bootstrap/shell-bridge.test.ts` (display groups in snapshot)
- Full suite: `pnpm -C src test` (2019 tests)
