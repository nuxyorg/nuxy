# Messy Tokens

CSS custom property'leri `var(--token, fallback)` şeklinde kullanılıyor ama tanımlı değil.
Sonuç: tema değişince fallback (dark-mode sabit değer) devreye giriyor, UI bozuluyor.

**Kaynak:** `base.css` ve tüm tema JSON'ları sadece syntax/spacing/radius/z-index token'larını tanımlıyor.
Semantic UI token'larının hiçbiri tanımlı değil (53 adet).

---

## Tanımsız Token'lar

### Metin

| Token                | Kullanılan fallback                            | Dosyalar                                                            |
| -------------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| `--text`             | `#fff` / `rgba(255,255,255,.8)`                | TabBar/index.css, notes extension                                   |
| `--text-primary`     | `#f4f4f5` / `rgba(255,255,255,.85-.92)`        | ChatMessage, WizardSection, PropertiesPanel, time-calculator        |
| `--text-secondary`   | `rgba(255,255,255,.5-.75)`                     | MarkdownText/index.css, time-calculator                             |
| `--text-muted`       | `#888` / `#a1a1aa` / `rgba(255,255,255,.3-.6)` | ChatMessage, TabBar, ConversionCard, SectionHeader, time-calculator |
| `--text-dim`         | `rgba(255,255,255,.3)`                         | time-calculator                                                     |
| `--text-subtle`      | `#71717a` / `rgba(255,255,255,.35)`            | time-calculator                                                     |
| `--text-accent`      | `#a78bfa`                                      | MarkdownText/index.css                                              |
| `--text-on-accent`   | `#fff`                                         | MediaPreview/index.css                                              |
| `--color-text`       | `#fff`                                         | shortcut-overlay, notes                                             |
| `--color-text-muted` | `rgba(255,255,255,.4-.6)`                      | shortcut-overlay, status-clock                                      |
| `--error`            | `#ef4444` / `#f87171`                          | NotesRightPanel.tsx                                                 |

### Yüzeyler / Arka planlar

| Token                     | Kullanılan fallback                             | Dosyalar                                                                     |
| ------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| `--surface-overlay`       | `rgba(0,0,0,.45)` — **5+ dosyada farklı değer** | ChatMessage, ConversionCard, PropertiesPanel, shortcut-overlay, status-clock |
| `--surface-raised`        | `#1e1e1e` / `rgba(255,255,255,.06)`             | shortcut-overlay, time-calculator                                            |
| `--surface-inset`         | `rgba(255,255,255,.08)`                         | time-calculator                                                              |
| `--surface-accent`        | `rgba(120,80,255,.18)`                          | time-calculator                                                              |
| `--surface-accent-subtle` | `rgba(120,80,255,.18)`                          | ChatMessage/index.css                                                        |
| `--surface-1`             | `#09090b`                                       | —                                                                            |
| `--surface-2`             | `#27272a`                                       | —                                                                            |
| `--bg-subtle`             | `rgba(255,255,255,.06)`                         | ItemLeading/index.css                                                        |
| `--color-surface`         | `rgba(255,255,255,.05)`                         | ClipboardRightPanel.tsx                                                      |
| `--color-preview-bg`      | `rgba(0,0,0,.2)`                                | ClipboardPreview.tsx                                                         |

### Kenarlık

| Token              | Kullanılan fallback                                                    | Dosyalar                          |
| ------------------ | ---------------------------------------------------------------------- | --------------------------------- |
| `--border`         | `rgba(255,255,255,.08)`                                                | TwoPanel/index.css                |
| `--border-accent`  | `rgba(120,80,255,.35)`                                                 | time-calculator/frontend.tsx      |
| `--border-default` | `rgba(255,255,255,.2)`                                                 | shortcut-overlay, time-calculator |
| `--border-color`   | `rgba(255,255,255,.1)`                                                 | store/StoreExtensionList.tsx      |
| `--color-border`   | `rgba(128,128,128,.2)` / `rgba(255,255,255,.1)` — **iki farklı değer** | nyaa, clipboard                   |

### Vurgu / Accent

| Token               | Kullanılan fallback     | Dosyalar                                 |
| ------------------- | ----------------------- | ---------------------------------------- |
| `--accent`          | `#6366f1`               | TabBar/index.css, CalendarMonthGrid.tsx  |
| `--accent-fg`       | `#fff`                  | CalendarMonthGrid.tsx                    |
| `--accent-fg-muted` | `rgba(255,255,255,.7)`  | CalendarMonthGrid.tsx                    |
| `--accent-subtle`   | `rgba(99,102,241,.15)`  | TabBar/index.css, CalendarMonthGrid.tsx  |
| `--color-accent`    | `rgba(160,130,255,.9)`  | time-calculator/frontend.tsx             |
| `--hover`           | `rgba(255,255,255,.06)` | TabBar/index.css, ShortcutHint/index.css |

### Durum Renkleri

| Token                   | Kullanılan fallback   | Dosyalar                                |
| ----------------------- | --------------------- | --------------------------------------- |
| `--color-danger`        | `#e55`                | Alert/index.css, ClipboardFileAlert.tsx |
| `--color-danger-bg`     | `rgba(220,50,50,.08)` | ClipboardFileAlert.tsx                  |
| `--color-danger-border` | `rgba(220,50,50,.2)`  | ClipboardFileAlert.tsx                  |
| `--color-warning`       | `#eab308`             | Alert/index.css, calendar               |
| `--color-info`          | `#3b82f6`             | Alert/index.css                         |
| `--color-success`       | `#22c55e`             | Alert/index.css                         |

### Tipografi

| Token             | Kullanılan fallback | Dosyalar                       |
| ----------------- | ------------------- | ------------------------------ |
| `--font-mono`     | `monospace`         | shortcut-overlay, status-clock |
| `--font-sans`     | `system-ui`         | shortcut-overlay               |
| `--font-semibold` | `bold`              | MediaPreview/index.css         |
| `--font-size-lg`  | `16px`              | shortcut-overlay               |
| `--font-size-sm`  | `12px` / `13px`     | shortcut-overlay, status-clock |
| `--font-size-xs`  | `11px`              | shortcut-overlay               |

### Gölge / Diğer

| Token                | Kullanılan fallback                          | Dosyalar                               |
| -------------------- | -------------------------------------------- | -------------------------------------- |
| `--shadow-dark`      | `rgba(0,0,0,.4)`                             | time-calculator                        |
| `--overlay-backdrop` | `rgba(0,0,0,.75)`                            | shortcut-overlay                       |
| `--radius`           | `6px`                                        | —                                      |
| `--radius-1`         | `4px`                                        | shortcut-overlay, status-clock         |
| `--radius-2`         | `8px`                                        | shortcut-overlay                       |
| `--radius-xs`        | `2px`                                        | MediaPreview/index.css                 |
| `--space-8`          | `32px`                                       | converter/frontend.tsx                 |
| `--syntax-number`    | `#f78c6c`                                    | Code/index.css                         |
| `--syntax-string`    | `#7aa2f7` / `#c3e88d` — **iki farklı değer** | MarkdownText/index.css, Code/index.css |

---

## Kritik Sorunlar

### 1. Tutarsız isimlendirme — aynı anlam, farklı isimler

- `--text` / `--color-text` / `--text-primary` — üçü de "ana metin rengi" için
- `--border` / `--border-color` / `--border-default` / `--color-border` — dört farklı isim
- `--text-muted` / `--color-text-muted` — aynı şey

### 2. `--surface-overlay` — 5+ dosyada farklı fallback

Herkes kendi değerini yazmış: `rgba(0,0,0,.45)`, `rgba(20,20,20,.65)`, vs.

### 3. `--color-border` — iki farklı fallback

`rgba(128,128,128,.2)` (nyaa) vs `rgba(255,255,255,.1)` (clipboard) — hangi renk doğru?

### 4. `--syntax-string` — iki farklı fallback

`#7aa2f7` (mavi, MarkdownText) vs `#c3e88d` (yeşil, Code) — tutarsız

---

## Çözüm

1. Token isimlerini standartlaştır (tekrar edenleri birleştir)
2. Canonical değerleri `base.css`'e ekle
3. Tema JSON formatına bu semantic token'ları dahil et — temaların override edebilmesi için
