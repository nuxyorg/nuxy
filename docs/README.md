# Nuxy Documentation

Nuxy is an Electron desktop launcher (spotlight/command-palette style). The core shell is deliberately empty — all functionality is delivered by extensions installed in `~/.nuxy/extensions/`.

---

## Quick links

| I want to…                         | Go to                                                 |
| ---------------------------------- | ----------------------------------------------------- |
| Understand what Nuxy is            | [00. Overview](./00-overview.md)                      |
| See the full system design         | [Architecture map](./architecture.md)                 |
| Build an extension                 | [Extension authoring](./21-extension-access.md)       |
| Check what APIs are implemented    | [Documentation status index](./DOCUMENTATION.md)      |
| Understand the current file layout | [Structure & restructure plan](./restructure-plan.md) |
| See the MVP plan                   | [19. MVP Roadmap](./19-mvp-roadmap.md)                |
| See pain points and gaps           | [Pain points plan](./pain-points-plan.md)             |

---

## Türkçe Proje Analizi (Turkish Project Documentation)

Projenin yapısını, tüm eklentilerini ve gelecek vizyonunu açıklayan kapsamlı Türkçe dokümantasyon serisi:

- [01. Genel Bakış ve Çekirdek Mimarisi](./project-analysis/01-general-overview.md) — Nuxy'nin çekirdek felsefesi ve sistem mimarisi.
- [02. Eklentilerin Detaylı Analizi](./project-analysis/02-extensions-review.md) — 19 eklentinin ne işe yaradığı, artıları, eksileri ve gelişim noktaları.
- [03. Gelecekteki Evrimi ve Yol Haritası](./project-analysis/03-future-evolution.md) — Projenin gelecekte nereye evrilebileceği ve eklenti ekosistemi.

---

## Repository layout

```
nuxy/                          # pnpm monorepo root
├── src/                       # nuxy-desktop app (Electron + Web Components)
│   ├── electron/              # Main process (kernel)
│   │   ├── bootstrap/         # main.ts, preload.ts — app lifecycle
│   │   ├── config/            # paths, nuxyconfig, storage-path
│   │   ├── extensions/        # scanner, registry, broker
│   │   ├── ipc/               # register, validate, worker-invoke
│   │   ├── protocol/          # nuxy-ext:// handler
│   │   ├── spawn/             # worker spawn + host-call bridge
│   │   ├── media/             # now-playing (Linux MPRIS; macOS/Win stubs)
│   │   ├── window/            # BrowserWindow, spring animation
│   │   └── themes/            # bundled theme install
│   └── renderer/              # Vanilla Web Components bootstrap (main.ts, bootstrap.ts)
│
├── packages/
│   ├── core/                  # @nuxy/core — CoreContext type, manifest types, logger
│   ├── extension-host/        # @nuxy/extension-host — worker bootstrap + CoreContext proxy
│   ├── extension-sdk/         # @nuxy/extension-sdk — defineExtension helper, re-exports
│   ├── ext-template/          # Starter template for new extensions
│   └── ui/                    # @nuxy/ui — custom element stubs (type-only, framework-agnostic)
│
├── extensions/                # Sample extensions (synced to ~/.nuxy/extensions/ in dev)
│   ├── calculator/            # provider: math evaluator
│   ├── clipboard/             # tool: clipboard history
│   └── shell/                 # bootstrap: OmniBar shell UI
│
└── docs/                      # This directory
```

---

## How extensions work (short version)

1. Place a folder with `manifest.json` + `backend.js` in `~/.nuxy/extensions/`.
2. The kernel scanner reads the manifest and spawns one `worker_threads` Worker per backend.
3. `@nuxy/extension-host` runs inside the worker and calls `register(core)` on your module.
4. `core` is a `CoreContext` proxy — clipboard, storage, media, IPC, registry, logger.
5. The renderer loads frontend UIs via the `nuxy-ext://<manifest.id>/frontend.js` protocol — each frontend registers a `nuxy-tool-*` custom element.

Full API reference: [21. Extension Access & Permissions](./21-extension-access.md)  
Starter template: `packages/ext-template/`

---

## Runtime paths

| Path                          | Purpose                           |
| ----------------------------- | --------------------------------- |
| `~/.nuxy/nuxyconfig`          | User settings                     |
| `~/.nuxy/extensions/`         | Installed extensions              |
| `~/.nuxy/data/<manifest.id>/` | Extension storage (chroot-jailed) |
| `~/.nuxy/themes/`             | Runtime themes                    |

---

## Design docs

The numbered series covers the architectural decisions behind Nuxy:

- [00. Overview](./00-overview.md) — the "empty shell" philosophy
- [01. System Analysis](./01-system-analysis.md)
- [04. Modules](./04-modules.md)
- [10. Security](./10-security.md) _(if present)_
- [14. Rebuild Roadmap](./14-rebuild-roadmap.md)
- [15. Modular Plugin System](./15-modular-plugin-system.md)
- [18. Advanced Capabilities](./18-advanced-capabilities.md)
- [19. MVP Roadmap](./19-mvp-roadmap.md)
- [21. Extension Access & Permissions](./21-extension-access.md)
- [22. Store Extension Design & Implementation](./22-store-extension.md)

### Implementation guides

- [02. Core Infrastructure](./implementation/02-core-infrastructure.md)
- [03. Feature Implementation](./implementation/03-feature-implementation.md)
- [04. Integration](./implementation/04-integration.md)

### Plans & audits

- [Web Components renderer composition architecture](./architecture/lit-renderer-composition.md) — Composition API + Tool Host design for secure cross-extension UI
- [Architecture map](./architecture.md)
- [Structure & restructure plan](./restructure-plan.md)
- [Pain points plan](./pain-points-plan.md)
- [Electron fix plan](./electron-fix-plan.md)
- [MVP plan](./mvp-plan.md)
- [Documentation status index](./DOCUMENTATION.md)
- [Documentation audit report](./cleanup/documentation-audit-report.md)
