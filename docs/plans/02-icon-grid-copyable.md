# Copyable icon grid

## Request

"İkon grid kopyalanabilir olmalı" — the Icon Browser extension's grid items
(added in `30eb132 feat: introduce Icon Browser extension`) should be
copyable.

## Scope decision

Copy two things per icon, both useful to a consumer:

- icon name (string) — default click/Enter action
- raw SVG markup — secondary action (e.g. `Shift+Enter` or a context action)

## Plan

1. Read `extensions/icon-browser/` (frontend element + grid component) to find
   the per-cell render and existing keyboard nav (grid navigation/filtering
   already implemented).
2. Add a copy action using the extension's `core.clipboard.writeText`
   permission (declare `clipboard` permission in manifest if not present).
3. Wire it to: click/Enter on a focused cell copies name; provide a visible
   affordance (small "copy" icon/button on hover/focus) and a toast/inline
   confirmation ("Copied `icon-name`").
4. Keyboard-accessible: must work via the existing grid keyboard navigation,
   not just mouse hover.
5. Tests: extension-level test for the copy handler (mock `CoreContext.clipboard`).

## Acceptance

- Focusing a grid cell and pressing Enter (or clicking) copies the icon name
  to clipboard with visible confirmation.
- Works with existing grid filtering/navigation without regressions.
- `pnpm -C src test` and `pnpm typecheck` pass.
