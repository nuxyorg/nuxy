# Nuxy — Teknik Yol Haritası

Tamamlanmamış mimari hedefler ve bilinen teknik borç listesi.

> Bu dosya yaşayan bir belge. Her tamamlanan madde `[x]` olarak işaretlenip bir changelog girişi eklenerek güncellenmeli.

---

## Shell Extension

### ShellController parçalanması

`extensions/shell/shell-controller.ts` 992 satır, god-class. Sorumluluk bazlı modüllere bölünmeli:

```
extensions/shell/controllers/
  query-controller.ts       # query state, debounce
  navigation-controller.ts  # selectedIndex, klavye nav
  tool-controller.ts        # activeTool, tool lifecycle
  provider-controller.ts    # provider states, loading
  window-controller.ts      # drag, resize, spring
  command-palette-controller.ts
shell-controller.ts         # Lit ReactiveController, compose above
```

- [ ] `QueryController` — `ReactiveController` implement et
- [ ] `NavigationController`
- [ ] `ToolController`
- [ ] `ProviderController`
- [ ] `WindowController`
- [ ] `shell-dom.ts` kaldır — Lit template'e taşı
- [ ] `bindGlobalKeyboard()` → ayrı `KeyManager` sınıfı

### `nuxy-shell-view.ts` — LitElement'e geçiş

Şu an vanilla `HTMLElement`. `LitElement` olmalı; `render()` lifecycle ile manuel DOM sync ortadan kalkar. `shell-dom.ts` factory fonksiyonları tamamen gereksiz hale gelir.

- [ ] `nuxy-shell-view.ts` → `LitElement`
- [ ] `shell-dom.ts` → sil (içerik render metodlarına taşındıktan sonra)

### `nuxy-shell-omni-bar.ts`

- [ ] `MutationObserver` döngüsünü kaldır — `slot` element veya `data-portal-managed` attribute kullan
- [ ] `innerHTML` binding → Lit template (XSS)
- [ ] `searchIconHtml` setter → `requestUpdate()` çağır

### `nuxy-command-palette.ts`

- [ ] `role="dialog"` ve focus trap ekle
- [ ] `aria-modal="true"` ekle

### Bilinen CSS sorunları (shell.css)

- [ ] `overflow-y: overlay` → `auto` (deprecated)
- [ ] `max-height: 350px` → CSS variable
- [ ] Hard-coded `rgba` renkleri → CSS token

---

## UI Component Library (extensions/ui-default)

### Kaldırılacaklar (CSS class veya factory fonksiyona çevrilecek)

Layout/style-only custom element'ler lifecycle overhead taşıyor, custom element olmamalı:

- [ ] `NuxyBoxElement` → CSS utility class
- [ ] `NuxyStackElement` → CSS utility class
- [ ] `NuxyDividerElement` → `<hr>` veya CSS utility class
- [ ] `NuxyBadgeElement` → CSS class ile `<span>`

### Tam yeniden yazım gereken component'ler

- [ ] `NuxyButtonElement` — `innerHTML` slot yerine gerçek slot; ARIA (`aria-expanded`, `aria-pressed`)
- [ ] `NuxySelectBoxElement` — 3 component'e böl: trigger + dropdown + option; `document.body.appendChild` kaldır
- [ ] `NuxyModalElement` — `reparentSlots()` → `<slot name="...">`; focus trap ekle
- [ ] `NuxyCollapsibleElement` — `reparentChildren()` → named slot
- [ ] `NuxyTooltipElement` — keyboard erişimi; `aria-hidden`
- [ ] `NuxyRadioGroupElement` — arrow key navigation (WAI-ARIA radio group pattern)

### Shared utilities çıkarılacak

- [ ] `utils/parse.ts` — `parseOptions()`, `parseNum()`, `parseDataListItems()` (5 yerde tekrarlıyor)
- [ ] `utils/mirror-attrs.ts` — `MIRROR_ATTRS` utility (Button, Input, SearchInput'da tekrarlıyor)
- [ ] `utils/focus-trap.ts` — Modal için

### CSS

- [ ] `nuxy-select-box.css`, `nuxy-button.css` gibi CSS'lerde hard-coded renkleri token'a taşı
- [ ] `unsafeHTML` SVG → inline Lit template veya `<nuxy-icon>` ile

---

## packages/core — IPC Güvenilirliği

- [ ] Worker mesaj discriminated union tipi ekle (`kind: 'call' | 'reply' | 'event'`)
- [ ] Host call timeout — 30s, sonra `reject` + pending'den sil
- [ ] Worker error state — `registry.markFailed(extId)` + renderer'a bildir

---

## Extension Scanner (`src/electron/extensions/scanner.ts`)

612 satır → 5 modüle bölünmeli:

```
src/electron/extensions/
  manifest-loader.ts    # JSON parse + Zod validation
  worker-manager.ts     # spawn, terminate, timeout
  theme-registrar.ts    # theme JSON yükle
  icon-registrar.ts     # icon pack JSON yükle
  dev-sync.ts           # dev mode kaynak kopyalama
  index.ts              # sadece orchestrate eder
```

- [ ] `manifest-loader.ts` + Zod schema
- [ ] `worker-manager.ts`
- [ ] `theme-registrar.ts` / `icon-registrar.ts`
- [ ] `dev-sync.ts`

---

## CSS Token Sistemi

53 adet tanımsız CSS token var — `var(--token, fallback)` şeklinde kullanılıyor ama token tanımlı değil. Tema değişince fallback devreye giriyor.

**Öncelikli tokenlar:**

| Token                                            | Standart isim       | Canonical değer           |
| ------------------------------------------------ | ------------------- | ------------------------- |
| `--text-primary` / `--text` / `--color-text`     | `--text-primary`    | `#f4f4f5`                 |
| `--text-muted` / `--color-text-muted`            | `--text-muted`      | `rgba(255,255,255,.5)`    |
| `--surface-overlay`                              | `--surface-overlay` | `rgba(0,0,0,.45)`         |
| `--border` / `--border-color` / `--color-border` | `--border`          | `rgba(255,255,255,.1)`    |
| `--color-danger`                                 | `--color-danger`    | `#ef4444`                 |
| `--color-warning`                                | `--color-warning`   | `#eab308`                 |
| `--font-mono`                                    | `--font-mono`       | `ui-monospace, monospace` |

Adım adım:

- [ ] Token isimlendirmesini standartlaştır (birleştirilecek aliaslar yukarıdaki tabloda)
- [ ] Canonical değerleri `src/themes/base.css`'e ekle
- [ ] Tema JSON formatına semantic token'ları dahil et
- [ ] `extensions/` altındaki fallback'leri token ile değiştir

---

## Test Coverage

- [ ] Her `ipcMain.handle` için: happy path, missing params, malformed payload, extension not found
- [ ] `pressOmnibarKey` e2e helper — gerçek input ile çalışmalı (workaround kaldır)
- [ ] `nuxy-command-palette` e2e — keyboard navigation testi
- [ ] Protocol path traversal güvenlik testi

---

## Geciktirilecekler (ikinci versiyon için)

- Virtual scroll (binlerce sonuç henüz yok)
- Extension hot-reload
- Plugin marketplace / Store
- Multi-monitor aware window positioning
