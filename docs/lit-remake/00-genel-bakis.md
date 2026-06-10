# Nuxy — Lit Remake: Genel Bakış

Tüm codebase 5 paralel agent tarafından tarandı. Bu klasör altındaki belgeler her katmanı ayrı ayrı ele alır.

## Dosyalar

| Dosya                         | Kapsam                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `01-shell.md`                 | Shell extension — controller, view, DOM factory, CSS      |
| `02-ui-components.md`         | ui-default altındaki tüm componentler                     |
| `03-packages-core.md`         | packages/core, packages/ui, extension-host, SDK, ce-utils |
| `04-extensions.md`            | notes, nyaa, settings, calculator, gradient               |
| `05-electron-renderer.md`     | Electron main process, IPC, renderer bootstrap            |
| `06-yeniden-yazirim-plani.md` | Somut aksiyon planı, öncelik sırası                       |

---

## Projenin Temel Sorunu

Lit'e geçiş kararı alındı ama geçiş sırasında eski yapılar temizlenmedi. Şu an aynı anda üç paradigma çalışıyor:

1. **Eski vanilla custom element kodu** — `h()` helper'ları, `ceListItem()` sarmalayıcıları, manuel DOM manipülasyonu
2. **Yarım Lit kodu** — Lit element'leri var ama shadow DOM kullanılmıyor, reactive sistem atlanıyor, imperatif DOM işlemleri Lit'in lifecycle'ıyla çakışıyor
3. **Gerçek Lit kodu** — sadece birkaç component doğru yazılmış

Bu üçü bir arada olunca hiçbiri tam çalışmıyor.

---

## Kategorize Edilmiş Sorunlar

### Kritik (çalışmayı bozan)

- Shell omnibar focus ve klavye yönetimi dağınık — bugün yaşanan sorunların kaynağı
- Lit render cycle'ı ile manuel DOM sync çakışması (`queueMicrotask` vs `updateComplete`)
- Worker IPC promise'ları timeout yok — bellek sızıntısı
- Preload sinyali hata olsa bile gönderiliyor
- Extension cache bozuk dosyayı geçerli kabul ediyor

### Mimari (teknik borç)

- `ShellController` 992 satır, tek sorumluluk yok
- `shell-dom.ts` factory fonksiyonları — Lit'te template olması gereken şeyler
- `nuxy-shell-view.ts` vanilla HTMLElement — Lit element olmalı
- `packages/ui` stub katmanı pratikte ölü kod
- `ceListItem`, `ceList`, `h()` — JSX'i elle yeniden icat etmek
- CSS sorumluluğu belirsiz: shell CSS, ui-default CSS, inline style, CSS variable üçü aynı anda

### Tip güvenliği

- IPC response'ları her yerde `as { success: boolean; data?: T }` ile cast ediliyor, validate edilmiyor
- `window.core` optional tiplenmiş ama her yerde unconditional erişim
- SelectBox, RadioGroup options'ı JSON string olarak alıyor, tip yok
- Worker mesajlarında discriminator yok

### Test

- e2e helper `pressOmnibarKey` bilinen bir bug'ı workaround ederek belgeliyordu
- Test geçiyor ama gerçek kullanıcı sorun yaşıyordu
- İntegrasyon testleri yok, sadece unit mock'lar

---

## Rakamlar

- `ShellController`: 992 satır
- `shell-dom.ts`: 341 satır
- `nuxy-shell-view.ts`: 285 satır
- `extensions/scanner.ts`: 612 satır
- `ui-default` altında 80+ component dosyası
- `bindGlobalKeyboard()`: 167 satır tek metod
- `bindInit()`: 93 satır tek metod
- `buildOmnibarSections()`: 54 satır tek fonksiyon
