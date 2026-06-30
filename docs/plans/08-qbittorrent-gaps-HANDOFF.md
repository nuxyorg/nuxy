# Handoff: qBittorrent gap closure

**For:** Claude Code (or any coding agent)  
**Repo:** `/home/xava/Documents/nuxy`  
**Full plan:** [`08-qbittorrent-gaps.md`](./08-qbittorrent-gaps.md)

---

## Mission

Implement P0 + P1 fixes for `extensions/qbittorrent/` per the plan. Use TDD. Do not commit unless asked.

## Read first

1. `rules/AGENTS.md` and `rules/EXTENSION_GUIDE.md`
2. `docs/plans/08-qbittorrent-gaps.md` (tracks, deps, acceptance)
3. Reference implementation: `extensions/download-manager/` (openFolder, multi-select patterns)

## Execution order (single agent — sequential)

If one agent, run tracks in this order on branch `task/qbit-p0-p1`:

| Step | Track | Summary                                                        |
| ---- | ----- | -------------------------------------------------------------- |
| 1    | T1    | Copy feedback bug + password field type                        |
| 2    | T2    | `torrent-link.ts` tests/edge cases                             |
| 3    | T3    | `openSavePath` backend + `shell` permission                    |
| 4    | T4    | `utils/state-label.ts` + frontend `statusLabel`                |
| 5    | T7    | `utils/format-meta.ts` + category/tags in list                 |
| 6    | T5+T8 | Connection UX + action errors (one PR — both touch controller) |
| 7    | T6    | openFolder shell action in controller                          |

Skip Wave 3 (T9–T11) unless user asks.

## Execution order (parallel — up to 4 agents)

**Wave 1** (simultaneous): T1, T2, T3, T4 — T7 can join if T7 only adds util + minimal frontend hook.

**Wave 2** (after Wave 1 merges): Agent A = T5+T8 combined; Agent B = T6 (needs T3).

## Key bugs to fix (P0)

1. `frontend.ts` line ~196: `copySavePath` flash shows `item.copiedMagnet` — use `item.copiedSavePath`
2. `settings.json`: password field should mask input
3. `controller.ts`: set `loading: true` before first `list`; map errors via `mapQbitError`
4. Action IPC failures: surface `actionError` in UI (no silent `void this.togglePause`)

## Key features (P1)

1. `openSavePath` IPC — copy from `download-manager/backend.ts` `openFolder`
2. Show `category` / `tags` in list meta when non-empty
3. `normalizeTorrentState()` for i18n keys (`forcedDL`, `forcedUP`, `checkingResumeData`)

## Constraints

- **TDD mandatory:** test first, then code
- **Do not hand-edit** `extensions/qbittorrent/locales/tr.json` or `ja.json`
- `en.json` new keys only if needed; prefer reusing existing keys
- New IPC channels stay **private** (only `getStatus` + `add` are public)
- Minimal diffs; match existing extension style
- Run after each track: `pnpm -C src test -- extensions/qbittorrent/` then `pnpm typecheck`

## Done when

All items in plan section "Minimal done definition (P0 + P1)" are checked and tests green.
