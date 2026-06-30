# Stremio Search (`com.nuxy.stremio`)

A Nyaa-style tool that searches **Stremio stream addons** (Comet, Torrentio, MediaFusion, …) from the
omnibar and hands results off to qBittorrent, the clipboard, or an external player.

## How it works

Stremio stream addons are queried by **content id**, not free text, so this tool runs in two steps:

1. **Resolve** — your search text is sent to a Stremio metadata catalog (Cinemeta by default):
   `https://v3-cinemeta.strem.io/catalog/{movie,series}/top/search=<query>.json` → a list of titles
   with their IMDB ids.
2. **Stream** — selecting a title (and, for series, a season/episode) fetches streams from the
   configured addon: `<addon>/stream/<type>/<id>.json`.

### View flow

```
home (favorites grid)  ──type query──▶  search results grid
meta (titles, grid)  ──Enter──▶  streams        (movies)
meta (titles, grid)  ──Enter──▶  episodes  ──Enter──▶  streams   (series)
                      ◀── Esc ── back one view ──┘
```

- **Home / favorites** — with an empty omnibar the home screen shows your favorited titles as a
  poster grid. `Ctrl+F` toggles the selected title's favorite state (persisted via `core.storage`).
- **Grid + posters** — search results and favorites render as a keyboard-navigable poster grid
  (`nuxy-grid`), ordered by popularity (movies and series are interleaved by Cinemeta rank).
- **Episode stills** — series episodes list their thumbnail, title and a human-readable air date.

### Result kinds

Each stream is normalized into one of two kinds:

| Kind      | Addon returns        | Actions                                  |
| --------- | -------------------- | ---------------------------------------- |
| `torrent` | `infoHash` + sources | Add via qBittorrent · Copy Magnet        |
| `debrid`  | `url` (playback)     | Open / Play (system handler) · Copy Link |

The Enter key runs the highest-priority action that applies to the selected stream's kind
(see the **Enter Key Action Priority** setting); Shift+Enter runs the next one.

## Settings

| Key                   | Default                                           | Purpose                                                  |
| --------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `addonUrl`            | Torrentio public manifest                         | Manifest URL of any Stremio stream addon.                |
| `cinemetaUrl`         | `https://v3-cinemeta.strem.io`                    | Metadata catalog used to turn search text into IMDB ids. |
| `enterActionPriority` | `torrentClient, playStream, copyMagnet, copyLink` | Ordered Enter-key actions, resolved per stream kind.     |

## Getting results

The bundled default points at the public **Torrentio** instance, which returns torrent/magnet
results with no account or configuration — these work with the `torrentClient` / `copyMagnet` Enter
actions (and the qBittorrent handoff) out of the box.

For **debrid** streams (Open / Play, Copy Link) set `addonUrl` to:

- a **Comet | ElfHosted** config that includes a **debrid service** (RealDebrid / AllDebrid / Premiumize / …), or
- a **self-hosted** Comet with `enableTorrent: true` (returns torrent/magnet results), or
- another Stremio stream addon such as **MediaFusion**.

## Permissions

`network` (fetch addon/catalog), `clipboard` (copy magnet/link), `shell` (open playback URL),
`storage` (persist favorites).
`capabilities.caller` is set because the frontend hands magnets to `com.nuxy.qbittorrent`.
