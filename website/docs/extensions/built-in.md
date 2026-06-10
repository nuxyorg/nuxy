---
title: Built-in Extensions
---

# Built-in Extensions

First-party extensions live in `extensions/` at the repo root. During `pnpm dev`, they are synced to `~/.nuxy/extensions/`.

## Current bundled extensions

| Folder           | Type               | ID                       | Role                                              |
| ---------------- | ------------------ | ------------------------ | ------------------------------------------------- |
| `shell/`         | `tool` (bootstrap) | `com.nuxy.shell`         | Launcher shell — omnibar, results list, tool host |
| `settings/`      | `tool`             | `com.nuxy.settings`      | App settings (theme, language, window, zoom)      |
| `notes/`         | `tool`             | `com.nuxy.notes`         | Note-taking with two-panel layout                 |
| `nyaa/`          | `tool`             | `com.nuxy.nyaa`          | Nyaa torrent search                               |
| `calculator/`    | `provider`         | `com.nuxy.calculator`    | Inline math evaluation in the omnibar             |
| `gradient/`      | `helper`           | `com.nuxy.gradient`      | Ambient gradient background overlay               |
| `ui-default/`    | `uikit`            | `com.nuxy.ui-default`    | Default UI kit — registers `window.UI` components |
| `icons-default/` | `iconpack`         | `com.nuxy.icons-default` | Default Lucide icon pack                          |
| `theme-sakura/`  | `theme`            | `com.nuxy.theme-sakura`  | Sakura theme variant                              |

## Reference implementations

| Extension     | What to learn from it                                                          |
| ------------- | ------------------------------------------------------------------------------ |
| `notes/`      | LitElement tool with controller pattern, two-panel layout, keyboard navigation |
| `settings/`   | Complex settings UI, SelectBox, theme/icon pickers                             |
| `shell/`      | Bootstrap extension, composition layer, tool host                              |
| `calculator/` | Provider pattern with `eval` channel                                           |
| `gradient/`   | Helper extension with viewmodel pattern                                        |

## File structure (Lit tool)

Modern tool extensions follow this layout:

```
extensions/nyaa/           # reference tool (same layout as notes)
  manifest.json
  backend.ts
  frontend.ts              # LitElement inline (@customElement('nuxy-tool-nyaa'))
  controller.ts
  types.ts
  settings.json
  locales/{en,tr,ja}.json
  utils/
  tests/
```

The custom element uses `LitElement` from `@nuxy/core` with light DOM (`createRenderRoot() { return this }`).

## Installing user extensions

Place any extension folder in `~/.nuxy/extensions/<id>/` with a valid `manifest.json`. Restart Nuxy or run `pnpm dev` to pick up changes.

## Related

- [Extension Overview](/extensions/overview)
- [Frontend Structure](/extensions/frontend-structure)
