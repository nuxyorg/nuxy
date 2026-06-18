# NuxyCore responsibility audit

## Question
Are these really `@nuxyorg/core` responsibilities?

- `trapTabKey` (`packages/core/src/focus-trap.ts`)
- `resolveHoldMs`, `HOLD_MS_BY_PRESET` (`packages/core/src/hold-ms.ts`)
- `applyUiFontSettings`, `DEFAULT_FONT_FAMILY_MAP`, `resolveFontFamily` (`packages/core/src/ui-font.ts`)

## Why this is suspicious
`@nuxyorg/core` is described in CLAUDE.md as "shared types, logger, IPC message
types" — i.e. the contract between the Electron host and extension backends.
These six exports are DOM/UI behaviors (keyboard focus trapping, press-and-hold
timing presets, font CSS variable application) consumed by the renderer/UI
layer, not by `CoreContext`/backends. They currently leak DOM assumptions into
a package that workers (no DOM) also depend on.

## Plan
1. Grep every consumer of these 6 exports (`src/renderer`, `extensions/ui-default`,
   `extensions/shell`, `extensions/settings`) to map real usage.
2. Decide destination:
   - `trapTabKey` → `extensions/ui-default/src/utils/` (a copy already exists there —
     check for duplication/drift, consolidate to one source of truth).
   - `resolveHoldMs`/`HOLD_MS_BY_PRESET` → likely `extensions/shell` (command palette
     hold-to-confirm) or a new `packages/ui` helper if shared across uikits.
   - `applyUiFontSettings`/`DEFAULT_FONT_FAMILY_MAP`/`resolveFontFamily` → `extensions/settings`
     or `extensions/ui-default` (font application is a renderer/DOM concern).
3. Move code + tests, update imports across `src/`, `extensions/`, keep
   `@nuxyorg/core`'s `index.ts` exporting only IPC/type contracts.
4. Run `pnpm typecheck` and `pnpm -C src test` after each move; commit per export group.
5. Update `website/docs/guide/core-package.md` to reflect the narrowed scope.

## Acceptance
- `packages/core/src/index.ts` no longer exports DOM-behavior helpers.
- All existing tests for these utilities still pass at their new location.
- No remaining duplicate implementation (e.g. `focus-trap.ts` existing both in
  `packages/core` and `extensions/ui-default`).
