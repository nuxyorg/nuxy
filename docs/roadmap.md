# Nuxy — Teknik Yol Haritası

Tamamlanmamış mimari hedefler ve bilinen teknik borç listesi.

> Bu dosya yaşayan bir belge. Her tamamlanan madde `[x]` olarak işaretlenip bir changelog girişi eklenerek güncellenmeli.

> **2026-06-17 audit**: Liste mevcut koda karşı tek tek doğrulandı. Tamamlananlar `[x]` işaretlendi, dosya/yaklaşım artık geçersizse `OBSOLETE` notu eklendi.

---

## Shell Extension

### ShellController parçalanması

OBSOLETE (dosya yeniden adlandırıldı): `shell-controller.ts` artık yok, `extensions/shell/controller.ts` oldu. Aşağıdaki bölünme zaten tamamlandı; `command-palette-controller.ts`'e ek olarak `init-controller.ts`, `settings-controller.ts`, `sync-controller.ts`, `keyboard-controller.ts` de eklendi.

- [x] `QueryController` — `ReactiveController` implement et (`controllers/query-controller.ts`)
- [x] `NavigationController` (`controllers/navigation-controller.ts`)
- [x] `ToolController` (`controllers/tool-controller.ts`)
- [x] `ProviderController` (`controllers/provider-controller.ts`)
- [x] `WindowController` (`controllers/window-controller.ts`)
- [x] `shell-dom.ts` kaldır — Lit template'e taşı (dosya artık yok)
- [x] `bindGlobalKeyboard()` → `controllers/keyboard-controller.ts` (`KeyboardController`, planlanan `KeyManager` ismi değil ama aynı amaç)

### `nuxy-shell-view.ts` — LitElement'e geçiş

OBSOLETE (dosya yeniden adlandırıldı): `nuxy-shell-view.ts` → `nuxy-shell.ts`. Zaten `LitElement`, `shell-dom.ts` yok.

- [x] `nuxy-shell-view.ts` → `LitElement` (`nuxy-shell.ts` olarak)
- [x] `shell-dom.ts` → sil (dosya artık yok)

### `nuxy-shell-omni-bar.ts`

- [x] `MutationObserver` döngüsünü kaldır — gerçek `<slot>` kullanılıyor
- [x] `innerHTML` binding → kaldırıldı — `searchIconHtml` zaten çağıran yoktu (dead code), setter + `.innerHTML=` dalı tamamen silindi, ikon her zaman `<nuxy-icon name="Search">` ile render ediliyor
- [x] `searchIconHtml` setter → kaldırıldı (madde gereksiz hale geldi, bkz. yukarı)

### `nuxy-command-palette.ts`

- [x] `role="dialog"` ve focus trap ekle — panel'e `role="dialog"` eklendi, `trapTabKey()` (yeni `packages/core/src/focus-trap.ts`) `_onKeyDown` içinde çağrılıyor
- [x] `aria-modal="true"` ekle

### Bilinen CSS sorunları (shell.css → `nuxy-shell.css` ve `nuxy-command-palette.ts` içi stiller)

- [x] `overflow-y: overlay` → `auto`
- [x] `max-height: 350px` → CSS variable (`var(--nuxy-command-palette-list-max-height, 300px)`)
- [x] Hard-coded `rgba` renkleri → CSS token — box-shadow siyahları `var(--shadow-dark, ...)` oldu; rainbow/bit-mode gradient renkleri kasıtlı dekoratif sabitler olarak bırakıldı (token'a taşımak anlam katmıyor)

---

## UI Component Library (extensions/ui-default)

### Kaldırılacaklar (CSS class veya factory fonksiyona çevrilecek)

Layout/style-only custom element'ler lifecycle overhead taşıyor, custom element olmamalı:

- [x] `NuxyBoxElement` → CSS utility class (component artık yok)
- [x] `NuxyStackElement` → CSS utility class (component artık yok)
- [x] `NuxyDividerElement` → `<hr>` veya CSS utility class (component artık yok)
- [x] `NuxyBadgeElement` → CSS class ile `<span>` (component artık yok)

### Tam yeniden yazım gereken component'ler

- [x] `NuxyButtonElement` — gerçek `<slot>` kullanıyor, `innerHTML` yok; ARIA mevcut (`mirrorAttrs` ile aria-label/aria-disabled)
- [x] `NuxySelectBoxElement` — `document.body.appendChild` kaldırıldı, `<nuxy-portal>` kullanıyor; artık 3 alt component'e bölündü: `nuxy-select-trigger.ts`, `nuxy-select-dropdown.ts`, `nuxy-select-option.ts` (hepsi `SelectBox/` altında, light DOM). `nuxy-select-box.ts` sadece state/keyboard/positioning mantığını tutuyor ve üç alt component'i compose ediyor; host'un public API'si (attribute/property/event) değişmedi. Mevcut 8 test + her alt component için yeni testler (`nuxy-select-trigger.test.ts`, `nuxy-select-dropdown.test.ts`, `nuxy-select-option.test.ts`) geçiyor.
- [x] `NuxyModalElement` — tamamen yeniden yazıldı: `reparentSlots()` kaldırıldı, gerçek named slot'lar (`<slot name="title">`, `<slot name="footer">`, default slot), `<nuxy-portal>`, `role="dialog"`/`aria-modal="true"`, focus trap (`bindDialogKeyHandlers`, `extensions/ui-default/src/utils/focus-trap.ts` → `packages/core/src/focus-trap.ts`'i sarmalıyor)
- [x] `NuxyCollapsibleElement` — `reparentChildren()` kaldırıldı, gerçek named slot kullanıyor (`slot="trigger"`, `slot="content"`)
- [x] `NuxyTooltipElement` — `@focusin`/`@focusout` ile klavye erişimi var, `aria-hidden`/`role="tooltip"` mevcut
- [x] `NuxyRadioGroupElement` — arrow key navigation zaten var: seçenekler gerçek `<input type="radio">` olarak render ediliyor ve hepsi aynı `name`'i paylaşıyor, bu da tarayıcının native radio-group klavye davranışını (Arrow/Tab) otomatik sağlıyor — ek JS handler gerekmiyor

### Shared utilities çıkarılacak

- [x] `utils/parse.ts` — `parseJsonArray<T>()` ve `parseNum()` eklendi; SelectBox/RadioGroup'taki `parseOptions`, Table'daki `parseDataListItems`, NumberInput/Slider/ProgressBar'daki `parseNum` artık bunu kullanıyor
- [x] `utils/mirror-attrs.ts` — `mirrorAttrs(el, attrs)` eklendi; Button ve IconButton artık kendi döngülerini değil bunu kullanıyor (her component kendi `MIRROR_ATTRS` listesini tutuyor, sadece döngü mantığı paylaşılıyor)
- [x] `utils/focus-trap.ts` — roadmap'teki konum yerine `packages/core/src/focus-trap.ts`'e eklendi (Modal _ve_ command-palette ortak kullanabilsin diye); Modal'da artık kullanılıyor

### CSS

- [ ] `nuxy-select-box.css`, `nuxy-button.css` gibi CSS'lerde hâlâ `var(--token, rgba(...))` fallback'leri var (primary token'lar `base.css`'te tanımlı olsa da fallback'ler temizlenmedi)
- [x] `unsafeHTML` SVG → `<nuxy-icon>` / inline template'e taşındı, `unsafeHTML` kullanımı kalmadı

---

## packages/core — IPC Güvenilirliği

- [x] Worker mesaj discriminated union tipi ekle (`kind: 'call' | 'reply' | 'event'`) — `packages/core/src/messages.ts`
- [x] Host call timeout — 30s, sonra `reject` + pending'den sil — `packages/extension-host/src/call-host.ts` (`HOST_CALL_TIMEOUT_MS = 30_000`)
- [x] Worker error state — `registry.markFailed(extId, error)` / `clearFailed(extId)` eklendi (`src/electron/extensions/registry.ts`); `registry:error` ve worker crash/non-zero exit yollarından çağrılıyor, başarılı `registry:sync`'te temizleniyor. Renderer'a bildirim push-event ile değil, mevcut `listInstalledExtensions` kanalının zaten döndürdüğü `LoadedExtension` objesine `status`/`lastError` eklenmesiyle sağlandı (yeni bir IPC kanalı icat edilmedi)

---

## Extension Scanner (`src/electron/extensions/scanner.ts`)

```
src/electron/extensions/
  manifest-loader.ts    # JSON parse + Zod validation
  worker-manager.ts     # spawn, terminate, timeout
  theme-registrar.ts    # theme JSON yükle
  icon-registrar.ts     # icon pack JSON yükle
  dev-sync.ts           # dev mode kaynak kopyalama
  index.ts              # sadece orchestrate eder
```

- [x] Track A — `scanner.ts` (652 satır) 6 dosyaya bölündü (2026-06-17): `manifest-loader.ts`
      (JSON parse, Node-builtin import taraması, izin/imza doğrulama, dedupe, extract+register
      orchestration helper'ları), `worker-manager.ts` (`registerExtensionByType`), `theme-registrar.ts`
      / `icon-registrar.ts` (ince re-export wrapper'lar — gerçek mantık hâlâ
      `themes/extension-themes.ts` ve `icons/registry.ts`'te), `dev-sync.ts`
      (`startExtensionWatcher`), `index.ts` (orchestration: `scanExtensions` + `rescanExtensions`,
      77 satır). `scanner.ts` artık `index.js`'ten re-export yapan 21 satırlık bir backward-compat
      shim. Bölmeden önce karakterizasyon testleri eklendi (`scanner.test.ts`, 32 test); her yeni
      modülün kendi test dosyası var (`manifest-loader.test.ts` 16, `worker-manager.test.ts` 11,
      `dev-sync.test.ts` 2, `index.test.ts` 3). `pnpm -C src test` (981 test), `pnpm typecheck`,
      `pnpm lint` hepsi yeşil.

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

- [x] Token isimlendirmesini standartlaştır — `extensions/ui-default/src/styles/base.css`'te tablodaki tüm tokenlar (`--text-primary`, `--text-muted`, `--surface-overlay`, `--border`, `--color-danger`, `--color-warning`, `--font-mono`) tanımlı
- [x] Canonical değerleri base.css'e ekle (not: dosya yolu roadmap'te `src/themes/base.css` deniyor ama gerçek konum `extensions/ui-default/src/styles/base.css`)
- [x] Tema JSON formatına semantic token'ları dahil et — `ThemeDefinition.colors` (`text-primary`, `text-muted`, `border` vb.) ve `ThemeDefinition.tokens` (spacing/radius/font) zaten dört theme.json'da (`extensions/theme-{dark,light,black,sakura}/theme.json`) mevcut
- [x] `extensions/` altındaki fallback'leri token ile değiştir (Track C, handover-2026-06-17.md) — ChatMessage, ConversionCard, ItemLeading, MarkdownEditor, MarkdownText, MediaPreview, PropertiesPanel, SectionHeader, ShortcutHint, TabBar, TwoPanel, WizardSection (`extensions/ui-default/src/components/`) tarandı; tam eşleşen 13 token×dosya çifti (26 occurrence) sadeleştirildi: `--bg-subtle`, `--text-accent`, `--syntax-string`, `--text-on-accent`, `--radius-xs`, `--hover`, `--border`, `--text-muted` (TabBar'daki tek 0.45 occurrence), `--accent-subtle`, `--accent`. Eşleşmeyen/şüpheli fallback'ler **silinmeden** bırakıldı: `--text-primary` (canonical `#f4f4f5`, çoğu yerde `rgba(255,255,255,.85-.92)` fallback kullanılmış — ChatMessage, PropertiesPanel, WizardSection), `--text-muted` çoğu yerde 0.4/0.3 fallback (canonical `.45` — ChatMessage, ConversionCard, SectionHeader), `--surface-overlay` (canonical `rgba(0,0,0,.45)` ama ChatMessage/ConversionCard/PropertiesPanel/MediaPreview'da `rgba(20,20,20,.65)`/`rgba(0,0,0,.8)`/`rgba(255,255,255,.05)` gibi tamamen farklı fallback'ler var), `--surface-accent-subtle` (ChatMessage'da fallback `rgba(120,80,255,.18)`, canonical `rgba(99,102,241,.12)`), `--text-secondary` (canonical `.7`, fallback'ler `.55/.65/.75` — MarkdownEditor/MarkdownText), `--syntax-function` (canonical `#00feca`, fallback `#a78bfa` — MarkdownText, görünüşe göre yanlışlıkla `--text-accent` rengiyle kopyalanmış), `--font-semibold` (canonical `600`, fallback `bold` — MediaPreview), `--space-2` (canonical `6px`, fallback `8px` — SectionHeader), `--text` (TabBar'da çoğu yerde canonical `#f4f4f5` yerine `rgba(255,255,255,.8)` fallback'i var), `--border-subtle` ve `--text-tertiary` (base.css'te **tanımsız tokenlar** — ConversionCard, PropertiesPanel, MarkdownEditor). Bunların hepsi görsel regresyon riski taşıdığı için dokunulmadı; ayrı bir takip işi gerekiyor.

---

## Test Coverage

- [x] Her `ipcMain.handle` için: happy path, missing params, malformed payload, extension not found — Track D: 4 kernel-handler modülü için test eklendi (`src/electron/ipc/kernel-handlers/extensions.test.ts` 21 test, `i18n.test.ts` 9 test, `system.test.ts` 6 test, `themes.test.ts` 16 test); `validate.test.ts`/`register.test.ts` zaten genel routing'i kapsıyordu, bu dosyalar handler-spesifik mantığı kapatıyor
- [x] `pressOmnibarKey` e2e helper (Track E) — artık `page.locator(...).focus()` + `page.keyboard.press()` kullanıyor (gerçek Playwright keyboard API), `dispatchEvent(new KeyboardEvent(...))` sentetik çağrısı kaldırıldı; çağrı imzası değişmedi, mevcut tüm call site'lar dokunulmadan çalışıyor. Ayrıca `typeInOmnibar` helper'ına 200ms list-provider debounce'unu (controller.ts `handleQueryChange`) bekleyen bir settle adımı eklendi — gerçek klavye event'lerinin zamanlaması senkronla yarış durumuna girip seçimi sıfırlayabiliyordu. Yan etki olarak `packages/core/src/index.ts`'te eksik olan `trapTabKey`/`getFocusableElements` export'u ve `src/electron/protocol/register.ts`'teki `nuxy-ext://core` virtual module listesi düzeltildi (bunlar olmadan shell extension hiç yüklenmiyordu, e2e suite'in büyük kısmı çalışmıyordu)
- [x] `nuxy-command-palette` e2e — keyboard navigation testi eklendi (Track F): `extensions/shell/tests/e2e.spec.ts` içinde yeni `command palette keyboard navigation` describe bloğu, 4 test — "ArrowDown/ArrowUp changes the selected item", "Enter executes the selected action", "Escape goes back / closes the palette", "ArrowRight opens a submenu when the selected action has children" (submenu testi için gerçek bir action yok, palette'in `.actions` setter'ına canlı olarak `children` içeren sahte bir action enjekte edildi). Not: aynı dosyada zaten var olan `command palette navigation`/`command palette rendering` bloklarındaki bazı eski testler (`.nuxy-command-palette__item`/`--active` gibi gerçek DOM'da hiç var olmayan class adlarını kullanıyor) halihazırda kırık — bu PR kapsamı dışında bırakıldı, ayrıca `emoji-picker`/`translate` extension'ları silindiği için onlara referans veren birkaç eski test de (Track E/F'den önce de) kırık
- [x] Protocol path traversal güvenlik testi — `src/electron/protocol/resolve.test.ts` ("blocks path traversal", "blocks ext-id with path traversal segments")

---

## Geciktirilecekler (ikinci versiyon için)

- Virtual scroll (binlerce sonuç henüz yok)
- Extension hot-reload
- Plugin marketplace / Store
- Multi-monitor aware window positioning
