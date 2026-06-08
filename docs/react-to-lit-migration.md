# React → Web Components Geçişi

> **Durum: Tamamlandı.** React kaldırıldı. Renderer vanilla Web Components bootstrap'a geçti. Extension frontend'leri `NuxyToolElement` arayüzünü uygulayan custom element'lere dönüştürüldü. Bu belge geçiş sürecinin analizini ve kararlarını belgeler.

Nuxy'nin üçüncü parti developer ekosistemine açılması hedefiyle React tabanlı mimariden Web Components mimarisine geçişin etki analizi.

---

## Neden bu geçiş?

Şu anki mimaride extension'lar aynı DOM, aynı CSS scope ve aynı `window.*` namespace'ini paylaşıyor. Güvenilir bir üçüncü parti ekosistemi için izolasyon zorunlu.

**Web Components'ın sağladığı:**
- **Native custom elements** — `<nuxy-card>` gibi gerçek browser primitive'leri, framework bağımlılığı yok
- **CSS custom properties mirası** — theme token'ları shadow boundary'yi geçer, diğer stiller geçmez
- **~45KB küçük bundle** — React/ReactDOM çıkınca
- **Shadow DOM** — opsiyonel izolasyon; şimdilik light DOM kullanılıyor, gerektiğinde eklenebilir

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

Web Components hedef pattern:
```ts
// packages/ui, framework-agnostic stub'lara dönüştü
export function Card(...args: any[]): unknown {
  return (window.UI as any)?.Card?.(...args) ?? null
}
export interface CardProps extends Record<string, unknown> { /* ... */ }
```

**Etkilenen:** 70 component stub, 4 hook stub, `src/index.tsx` barrel export.

**Karar:** `packages/ui` tip+stub katmanı olarak kaldı. Custom element registration `ui-default` extension'ında. `window.UI` factory function'ları `nuxy-*` element'leri oluşturur.

---

### 2. `extensions/ui-default` — Gerçek component implementasyonları

**Zorluk: Zor**

**Mevcut durum:**
- 66 component, her biri `.tsx` + `.css` çifti
- Tüm CSS global namespace'de (`nuxy-button`, `nuxy-card`, vb.)
- `className` prop'larıyla dinamik class composition
- 57 CSS dosyası, ~3400 satır CSS

**Web Components'a geçişte ne değişti:**

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
// SONRA (vanilla custom element)
export class NuxyButtonElement extends HTMLElement {
  static get observedAttributes() { return ['variant', 'disabled'] }

  connectedCallback(): void {
    this.style.display = 'contents'
    this.ensureButton()
    this.sync()
  }

  attributeChangedCallback(): void { this.sync() }

  private sync(): void {
    const variant = this.getAttribute('variant') ?? 'default'
    this.button?.setAttribute('class', `nuxy-button nuxy-button--${variant}`)
  }
}
customElements.define('nuxy-button', NuxyButtonElement)
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

**Seçilen yaklaşım — Vanilla custom elements:**
Extension frontend'leri `HTMLElement` extend eder, DOM `h()` helper ile programatik olarak oluşturulur, state controller sınıflarıyla yönetilir.

```ts
export class NuxyToolNotesElement extends HTMLElement implements NuxyToolElement {
  private controller: NotesController | null = null

  connectedCallback(): void {
    this.controller = new NotesController(() => this.render())
    this.controller.connect()
    this.render()
  }

  set query(value: string) {
    this.controller?.setQuery(value)
  }

  private render(): void {
    this.replaceChildren(renderNotesApp(this.controller!))
  }
}
customElements.define('nuxy-tool-notes', NuxyToolNotesElement)
```

**Etkilenen:** 30 `frontend.tsx` dosyası → `nuxy-tool-*.ts` + controller + dom dosyalarına dönüştürüldü. `global.d.ts` tip tanımları güncellendi.

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

**Uygulanan mimari:**

```ts
// core.events — namespaced event bus (uygulandı)
core.events.emit('key-hints-changed', hints)
core.events.on('settings-updated', handler)

// Kernel-level event'lar (cross-extension)
core.kernel.on('theme-changed', handler)
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

**Web Components ile (uygulanan):**
```ts
// connectedCallback'te event binding
connectedCallback(): void {
  this.addEventListener('keydown', this._handleKeyDown)
}
disconnectedCallback(): void {
  this.removeEventListener('keydown', this._handleKeyDown)
}
```

**Etkilenen:** 103 hook dosyası, özellikle `useKeyboard`, `useN8nKeyboard`, `useNotesKeyboard`.

---

### 6. Theming sistemi

**Zorluk: Kolay**

**İyi haber:** CSS custom properties light DOM'da zaten çalışıyor. Theme token'ları (`--bg-base`, `--color-text`, `--space-5`, vb.) tüm extension'larda miras alınıyor.

```ts
// bootstrap.ts'de theme setup (değişmedi)
document.documentElement.style.setProperty('--bg-base', '#1a1a1a')

// Custom element içinde — CSS dosyasında veya inline style'da
// background: var(--bg-base);
// color: var(--color-text);
```

**Tek değişim:** `ThemeDefinition` `styles` field'ı — CSS class override'ları yerini CSS custom property override'larına bıraktı.

**Etkilenen:** `src/themes/*.json`, `ThemeDefinition` tipi, tema extension'ları.

---

### 7. Altyapı katmanı

**Zorluk: Kolay**

| Dosya | Değişim |
|-------|---------|
| `src/electron/protocol/register.ts` | JSX injection kaldırıldı |
| `src/electron/bootstrap/preload.ts` | `window.React` inject kaldırılır |
| `src/renderer/main.tsx` | `ReactDOM.createRoot` → `customElements.define` |
| `packages/extension-host/` | Backend katmanı değişmez |
| `nuxy-ext://` protokolü | Değişmez |
| IPC sistemi | Değişmez |

---

## Özet tablo

| Alan | Durum | Notlar |
|------|-------|--------|
| `packages/ui` stubs | ✅ Tamamlandı | Framework-agnostic stub'lara dönüştürüldü |
| `ui-default` implementasyonlar | ✅ Tamamlandı | `nuxy-*` custom element'ler |
| Extension frontend'leri | ✅ Tamamlandı | `NuxyToolElement` + controller pattern |
| Custom hooks (103 dosya) | ✅ Kaldırıldı | Controller sınıflarıyla değiştirildi |
| Global event bus | ✅ Tamamlandı | `core.events` namespaced API |
| Renderer bootstrap | ✅ Tamamlandı | React-free, vanilla bootstrap |
| Theming | ✅ Değişmedi | CSS custom properties hâlâ çalışıyor |
| `<nuxy-tool-host>` + `core.composition` | ⏳ Planlandı | Bkz. `architecture/lit-renderer-composition.md` |

---

## Tamamlanan geçiş adımları

### Aşama 0 — Renderer temizleme ✅
React kaldırıldı. `src/renderer/main.ts` artık `window.UI = {}` + `bootstrap.ts` import'u. `bootstrap.ts` custom element'leri yükler, tema uygular ve `<nuxy-shell-view>` oluşturur.

### Aşama 1 — Event bus ✅
`core.events.emit` / `core.events.on` namespaced API eklendi. `window.dispatchEvent('nuxy-*')` usage'ları kaldırıldı.

### Aşama 2 — UI component rewrite ✅
`ui-default` component'leri `nuxy-*` custom element'lerine dönüştürüldü. `customElements.define()` ile register edilir. `window.UI = { Button, Card, … }` factory function'ları sağlar.

### Aşama 3 — Extension frontend'leri ✅
Extension frontend'leri `NuxyToolElement` arayüzünü uygulayan `HTMLElement` subclass'larına dönüştürüldü. React hook'ları yerine controller sınıfları, DOM için `h()` helper kullanılıyor. `entry.element` manifest alanı eklendi.

### Aşama 4 — Hook sistemi ✅
103 React hook dosyası kaldırıldı. Controller pattern ile değiştirildi (örn. `NotesController`, `NyaaController`). State yönetimi `ce-utils.ts`'deki `createStore()` ile sağlanıyor.

### Kalan çalışmalar
- `packages/ui` proxy katmanı tip katmanına indirgendi ama bazı extension'lar hâlâ import ediyor — tamamen kaldırılabilir
- `<nuxy-tool-host>` ve `core.composition` API'si uygulanmayı bekliyor (detay: `architecture/lit-renderer-composition.md`)
- E2E test suite tam güncellenmedi

---

## Kritik kararlar (başlamadan önce netleştirilmeli)

1. **Hibrit mi, tam geçiş mi?** Extension'lar geçiş sürecinde React kullanmaya devam edebilir mi? (Seçenek B/C)
2. **`packages/ui` ne olacak?** Kaldırılacak mı, tip katmanına mı indirgecek, yoksa custom element wrapper'a mı dönüşecek?
3. **Event bus API tasarımı nedir?** `core.events` extension-sdk'ya giriyor — namespace stratejisi belirlenmeli.
4. **Shadow DOM opt-in mi, zorunlu mu?** Extension'lar light DOM tercih edebilir mi? Güvenlik politikası ne olacak?
5. **Üçüncü parti extension'lar ne kullanabilir?** `NuxyToolElement` arayüzünü uygulayan herhangi bir custom element — vanilla JS, Lit, veya başka bir framework.

---

## Mimari plan (Composition API + Tool Host)

Shadow DOM geçişinde kırılan iki kritik pattern (gradient → shell DOM inject, shell → tool dynamic render) için güvenli ve explicit API tasarımı:

→ **[Web Components Renderer Composition Architecture](./architecture/lit-renderer-composition.md)**

Kararlar:
- Cross-extension DOM erişimi yasak; `core.composition` slot API ile değiştirilir
- Tool render `<nuxy-tool-host>` üzerinden; `query` attribute değil property olarak akar
- Shadow DOM zorunlu; React island geçiş dönemi fallback'i
- 5 fazlı implementasyon planı (toplam ~6–9 hafta, tool migration paralel)
