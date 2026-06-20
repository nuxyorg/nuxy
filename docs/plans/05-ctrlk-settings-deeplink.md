# Ctrl+K → settings deeplink

**Blocked on [#4 deeplink system](04-deeplink-system.md)** — consumes the
manifest `caller`/`deeplinks` fields and `nuxy://settings/extension/:extId`
route defined there.

## Request

Inside any extension's Ctrl+K palette, selecting e.g. "Nyaa settings" (in the
`nyaa` extension) should navigate to the Settings tool with the Nyaa
extension's settings panel pre-selected. Governed via manifest `caller`-style
declarations; the settings app may also expose its deeplink schemes outward.
READMEs should document this.

## Plan

1. In each extension's manifest, add a `caller` declaration of the form:
   ```json
   "caller": {
     "commands": [
       { "label": "Nyaa settings", "deeplink": "nuxy://settings/extension/nyaa" }
     ]
   }
   ```
   so the command palette can list extension-declared deeplink shortcuts
   without each extension hand-rolling palette wiring.
2. `extensions/shell/nuxy-command-palette.ts` (and `controller.ts`): read
   `caller.commands` from every scanned extension's manifest and merge them
   into the Ctrl+K result list, alongside existing built-in commands.
3. Selecting a `caller.commands` entry triggers the same `deeplink:open`
   dispatch path built in #4 (no separate codepath).
4. Settings tool (`extensions/settings`): when receiving
   `nuxy://settings/extension/:extId`, pre-select that extension's panel in
   `settingsOptions.ts` / `settings-controller.ts` state on mount.
5. Settings extension's own manifest exposes its accepted deeplink schemes
   (`deeplinks.schemes: ["extension/:extId"]`) — documents outward what the
   settings app accepts, per the "dışarıya deeplink şemalarını da verebilir"
   note.
6. Apply the `caller.commands` entry to at least one real extension (`nyaa`)
   as the worked example.
7. Update README.md for `extensions/nyaa`, `extensions/settings`, and
   `extensions/shell` to document the `caller` manifest field and this flow.
   Cross-link to `website/docs/guide/deeplinks.md`.

## Acceptance

- Opening Ctrl+K inside Nyaa, typing "settings", shows "Nyaa settings";
  selecting it opens Settings with Nyaa's panel active — covered by a
  Playwright e2e test.
- `caller.commands` manifest field documented in
  `rules/EXTENSION_GUIDE.md` and the three extension READMEs above.
