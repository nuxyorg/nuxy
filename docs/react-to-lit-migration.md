# React → Lit Geçiş Analizi

Nuxy'nin üçüncü parti developer ekosistemine açılması hedefiyle, mevcut React tabanlı mimariden Lit (Web Components) mimarisine geçişin etki analizi.

---

## Neden bu geçiş?

Şu anki mimaride extension'lar aynı DOM, aynı CSS scope ve aynı `window.*` namespace'ini paylaşıyor. Güvenilir bir üçüncü parti ekosistemi için izolasyon zorunlu.

**Lit'in sağladığı:**
- **Shadow DOM** — her component kendi CSS ve DOM scope'una sahip, dışarıya sızma yok
- **Native custom elements** — `<nuxy-card>` gibi gerçek browser primitive'leri
- **CSS custom properties mirası** — theme token'ları shadow boundary'yi geçer, diğer stiller geçmez
- **~45KB küçük bundle** — React/ReactDOM çıkınca

**Şu anki riskler (React ile):**
- Bir extension `.card { color: red }` yazsın → tüm extension'ları etkiler
- `window.dispatchEvent` ile gönderilen event'ler herkese gidiyor, namespace yok
- `document.querySelector('.nuxy-button')` ile başka bir extension'ın DOM'unu bulabilirsin
- 180 yerde `window.React` referansı — global namespace kirli

---

## Mevcut mimari haritası

```
src/renderer/
  main.tsx          → window.React, window.ReactDOM, window.UI inject
  App.tsx           → theme setup, uikit + shell extension load

packages/ui/src/    → proxy stubs (window.UI?.Button ?? null)
  components/       → 70 component (type definitions + stub)
  hooks/            → 4 shared hook (useToolKeyActions, useTranslation, vb.)

extensions/ui-default/src/
  components/       → 66 gerçek implementation (.tsx + .css çifti)
  styles/base.css   → 100+ CSS custom property token tanımı

extensions/*/
  frontend.tsx      → 30 extension UI (window.React + window.UI tüketir)
  hooks/            → 103 custom hook dosyası
```

---

## Etki alanları

### 1. `packages/ui` — Proxy stub katmanı

**Zorluk: Orta**

Şu anki pattern:
```tsx
export function Card(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Card || (() => null)
  return <Impl {...props} />
}
```

Lit ile hedef pattern:
```ts
// packages/ui, custom element registration için thin wrapper'a dönüşür
// ya da tamamen kaldırılır — extension'lar doğrudan custom element kullanır
import type { CardProps } from './types'
export { CardProps }
// <nuxy-card> browser'da zaten tanımlı, import gerekmiyor
```

**Etkilenen:** 70 component stub, 4 hook stub, `src/index.tsx` barrel export.

**Kritik karar:** `packages/ui` katmanı Lit'te anlamını yitirebilir. Custom element registration `ui-default` extension'ında olur, tip tanımları ayrı bir `packages/ui-types` paketine taşınabilir.

---

### 2. `extensions/ui-default` — Gerçek component implementasyonları

**Zorluk: Zor**

**Mevcut durum:**
- 66 component, her biri `.tsx` + `.css` çifti
- Tüm CSS global namespace'de (`nuxy-button`, `nuxy-card`, vb.)
- `className` prop'larıyla dinamik class composition
- 57 CSS dosyası, ~3400 satır CSS

**Lit'e geçişte ne değişir:**

```ts
// ÖNCE (React)
export function Button({ children, variant, className, ...props }: ButtonProps) {
  return (
    <button className={`nuxy-button nuxy-button--${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
```

```ts
// SONRA (Lit)
@customElement('nuxy-button')
export class NuxyButton extends LitElement {
  @property() variant = 'default'

  static styles = css`
    :host { display: inline-flex; }
    button { /* Shadow DOM'da izole */ }
  `

  render() {
    return html`<button part="button" class="nuxy-button--${this.variant}">
      <slot></slot>
    </button>`
  }
}
```

**CSS stratejisi:** Global `.nuxy-*` class'ları Shadow DOM içindeki `:host` ve `::part()` selector'larına taşınır. `--nuxy-*` CSS custom properties theme token'ları olarak shadow boundary'yi geçmeye devam eder.

**Etkilenen:** 66 component, 57 CSS dosyası, `frontend.ts` bootstrap (window.UI → custom element registration).

---

### 3. Extension frontend'leri

**Zorluk: Orta-Zor**

**Mevcut pattern (30 extension):**
```tsx
const React = window.React
const { useState, useEffect } = React
const { Card, List, Input } = window.UI || {}

export default function MyExtension({ query }: Props) {
  const [data, setData] = useState([])
  useEffect(() => { /* ... */ }, [])
  return <Card><List items={data} /></Card>
}
```

**Lit'e geçiş seçenekleri:**

**Seçenek A — Tam Lit:** Extension'lar `LitElement` extend eder, `html` template literal kullanır. En temiz izolasyon. En yüksek yeniden yazım maliyeti.

**Seçenek B — Hibrit (önerilen):** Extension frontend'leri Lit custom element içinde React render eder, geçiş döneminde. Sonradan kademeli Lit'e taşınır.

**Seçenek C — React adaları:** Shell Lit tabanlı olur, extension'lar kendi shadow root içinde React tree açar. İzolasyon sağlanır, React devam eder.

**Etkilenen:** 30 `frontend.tsx` dosyası, `global.d.ts` tip tanımları.

---

### 4. Global event bus

**Zorluk: Zor — en kritik alan**

**Mevcut durum:**
```ts
// 72 dosyada bu pattern var
window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed', { detail: hints }))
window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
window.dispatchEvent(new CustomEvent('nuxy-settings-updated'))
```

**Problem:** Namespace'siz global event bus. Herhangi bir extension aynı event adını kullanarak başka bir extension'ın state'ini bozabilir.

**Lit ile hedef mimari:**

```ts
// core.events — namespaced event bus (extension-sdk'ya eklenir)
core.events.emit('key-hints-changed', hints)    // sadece kendi namespace'i
core.events.on('settings-updated', handler)

// Kernel-level event'lar (cross-extension) ayrı API ile
core.kernel.on('theme-changed', handler)
core.kernel.on('locale-changed', handler)
```

Shadow DOM ile event'ların `composed: true/false` olup olmadığı da kontrol edilebilir hale gelir.

**Etkilenen:** 72 dosya, `extension-sdk` API tasarımı, `extension-host` event routing.

---

### 5. Custom hooks

**Zorluk: Zor**

**Mevcut durum:**
- 103 hook dosyası
- React lifecycle'a bağımlı (`useEffect`, `useRef`, `useCallback`)
- `document.querySelector` ile DOM traversal (shadow boundary'yi bilmiyor)
- `window.addEventListener('keydown')` — global, izole değil

**Örnek (useKeyboard):**
```ts
// Şu an: global keydown, shadow'u görmez
window.addEventListener('keydown', handleGlobalKeyDown)
window.dispatchEvent(new CustomEvent('nuxy-shell-omni-bar-keydown', {...}))
```

**Lit ile:**
```ts
// LitElement'in kendi event handling'i
protected firstUpdated() {
  this.addEventListener('keydown', this._handleKeyDown)
}

// ya da core.events ile izole event routing
core.events.on('keydown', this._handleKeyDown)
```

**Etkilenen:** 103 hook dosyası, özellikle `useKeyboard`, `useN8nKeyboard`, `useNotesKeyboard`.

---

### 6. Theming sistemi

**Zorluk: Kolay**

**İyi haber:** CSS custom properties shadow boundary'yi **miras olarak geçer**. Theme token'ları (`--bg-base`, `--color-text`, `--space-5`, vb.) Lit component'larının içinde çalışmaya devam eder.

```ts
// App.tsx'de theme setup değişmez
document.documentElement.style.setProperty('--bg-base', '#1a1a1a')

// Lit component içinde
static styles = css`
  :host {
    background: var(--bg-base);  /* shadow içinde inherited */
    color: var(--color-text);
  }
`
```

**Tek değişim:** `styles` field in `ThemeDefinition` — şu an CSS class override'ları var. Shadow DOM'da bu çalışmaz, `::part()` selector'larına geçiş gerekebilir.

**Etkilenen:** `src/themes/*.json`, `ThemeDefinition` tipi, tema extension'ları.

---

### 7. Altyapı katmanı

**Zorluk: Kolay**

| Dosya | Değişim |
|-------|---------|
| `src/electron/protocol/register.ts` | JSX injection kaldırılır, Lit dev mode support |
| `src/electron/bootstrap/preload.ts` | `window.React` inject kaldırılır |
| `src/renderer/main.tsx` | `ReactDOM.createRoot` → `customElements.define` |
| `packages/extension-host/` | Backend katmanı değişmez |
| `nuxy-ext://` protokolü | Değişmez |
| IPC sistemi | Değişmez |

---

## Özet tablo

| Alan | Dosya | Bileşen | Zorluk |
|------|-------|---------|--------|
| `packages/ui` stubs | 77 | 70 | Orta |
| `ui-default` implementasyonlar | 79 | 66 | **Zor** |
| Extension frontend'leri | 30 | 30 | **Orta-Zor** |
| Custom hooks | 103 | — | **Zor** |
| Global event bus | 72 | — | **Zor** |
| Renderer bootstrap | 3 | 1 | Kolay |
| Theming | 5 | — | Kolay |
| Altyapı (protocol, preload) | 6 | — | Kolay |
| **Toplam** | **375+** | **166+** | |

---

## Önerilen geçiş stratejisi

### Aşama 0 — Pilot (1 hafta)
Tek bir basit extension'ı (örn. `color` veya `converter`) Lit'e taşı. Şunları doğrula:
- `nuxy-ext://` protokolü Lit dosyalarını serve edebiliyor mu?
- CSS custom property inheritance çalışıyor mu?
- `window.core` IPC bridge değişmeden çalışıyor mu?
- Keyboard event'ları shadow boundary içinde doğru routing yapıyor mu?

### Aşama 1 — Event bus redesign (1-2 hafta)
`extension-sdk`'ya namespaced `core.events` API ekle. Tüm `window.dispatchEvent` usage'ını bu API'ye taşı. Bu değişiklik React/Lit bağımsız — hemen yapılabilir, güvenliği artırır.

### Aşama 2 — UI component rewrite (3-4 hafta)
`ui-default` extension'ındaki 66 component'i Lit'e taşı. CSS Shadow DOM'a alınır. `window.UI = {}` injection → `customElements.define()` registration.

### Aşama 3 — Extension frontend'leri (2-3 hafta)
30 extension frontend'ini Lit'e taşı. Seçenek B (hibrit) ile başla, kademeli olarak tam Lit'e geç.

### Aşama 4 — Hook sistemi (1-2 hafta)
React hook'larını Lit controller pattern'ine taşı. Keyboard, state, data sync controller'ları yaz.

### Aşama 5 — Temizlik (1 hafta)
`window.React`, `window.ReactDOM` inject kaldırılır. `packages/ui` proxy katmanı değerlendirile (kaldırılabilir veya tip katmanına indirgenir). E2E test suite güncellenir.

**Toplam tahmini:** 9-13 hafta

---

## Kritik kararlar (başlamadan önce netleştirilmeli)

1. **Hibrit mi, tam geçiş mi?** Extension'lar geçiş sürecinde React kullanmaya devam edebilir mi? (Seçenek B/C)
2. **`packages/ui` ne olacak?** Kaldırılacak mı, tip katmanına mı indirgecek, yoksa custom element wrapper'a mı dönüşecek?
3. **Event bus API tasarımı nedir?** `core.events` extension-sdk'ya giriyor — namespace stratejisi belirlenmeli.
4. **Shadow DOM opt-in mi, zorunlu mu?** Extension'lar light DOM tercih edebilir mi? Güvenlik politikası ne olacak?
5. **Üçüncü parti extension'lar ne kullanabilir?** Sadece Lit mi, her framework mi, vanilla JS mi?
