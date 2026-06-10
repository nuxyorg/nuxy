# UI Components Analizi (extensions/ui-default/src)

80+ component dosyası tarandı.

---

## Genel Mimari Sorunlar

### Shadow DOM vs Light DOM tutarsızlığı

Tüm componentler `createRenderRoot() { return this }` ile light DOM kullanıyor. Bu bilinçli bir tercih olabilir ama şu sonuçları doğuruyor:

- CSS scope izolasyonu yok — parent stil child component'i bozabilir
- Specificity çatışmaları kaçınılmaz
- Component CSS'i global stylesheet'e bağımlı (vite.config.ts'deki vite plugin `<style>` inject ediyor)
- Component'i izole test etmek mümkün değil

Tercih net değil: shadow DOM mu, light DOM mu? Biri seçilip ona göre CSS stratejisi kurulmalı.

### Gereksiz custom element'ler

Şu component'ler sadece CSS class ekliyor, hiçbir gerçek mantık içermiyor:

- `NuxyBadgeElement` — sadece class toggle
- `NuxyCardElement`, `NuxyCardHeaderElement` — `render() { return nothing }`, sadece class sync
- `NuxyDividerElement` — tek class ekliyor
- `NuxyListItemBodyElement`, `NuxyListItemTextElement`, `NuxyListItemActionsElement` — `syncHostClasses()` + `nothing`
- `NuxyListElement` — class ve inline style sync
- `NuxyBoxElement` — inline style uygulama

Bunlar custom element değil, factory fonksiyon olmalı ya da sadece CSS class'ı olmalı. Custom element'lerin lifecycle overhead'i var.

### `syncHostClasses()` her yerde tekrarlıyor

`connectedCallback()`, `updated()`, bazen `attributeChangedCallback()`'de çağrılıyor. Her component'te aynı pattern. Decorator veya base class mixin'e çıkarılmalı.

---

## Component Bazlı Sorunlar

### Button

**`.innerHTML` ile slot içeriği yakalanıyor**
Initial slot content string olarak alınıp `.innerHTML=${this._contentHTML}` ile tekrar inject ediliyor. XSS riski. Slot element kullanılmalı.

**`render() { return nothing }`**
İçerik yok ama `LitElement` extend ediyor. `HTMLElement` olmalı ya da gerçek template render edilmeli.

**`MIRROR_ATTRS` pattern**
Disabled, type gibi attribute'ları inner button'a kopyalamak için liste tutuluyor. Input ve SearchInput'da da aynı pattern var. Shared utility olmalı.

**ARIA eksiklikleri**
`role` yok, dropdown button için `aria-expanded` yok, toggle button için `aria-pressed` yok.

### Input / Textarea / SearchInput

**Property'ler attribute'a reflect etmiyor**
`@property()` tanımlı ama `reflect: true` yok. `value` property'si native form integration için attribute'a reflect etmeli.

**`MIRROR_ATTRS` tekrarı**
Button'daki aynı pattern. Shared utility gerekiyor.

### Checkbox / Switch / RadioGroup

**Eksik ARIA**

- Checkbox: native `<input type="checkbox">` sarmalıyor ama wrapper label yapısı screen reader'ı karıştırıyor
- RadioGroup: `role="radiogroup"` var ama arrow key navigation yok — WAI-ARIA radio group pattern'i gerektiriyor

### SelectBox

**En karmaşık component — 210+ satır, birden fazla sorumluluğu var:**

1. Trigger button render etme (Lit template)
2. Dropdown'u `document.body`'e ekleme (imperatif DOM)
3. Zoom-aware pozisyonlama (karmaşık hesaplama)
4. Client-side search/filter
5. Mixed state: Lit `@state` + imperatif DOM reference'ları

**`document.body.appendChild(this.dropdown)` (satır 211-212)**
Dropdown component'in DOM ağacının dışında. CSS containment kırılıyor. Scrollable container içindeyse dropdown scroll etmiyor. Test etmek için `document.body` sorgulanması gerekiyor.

**Pozisyonlama mantığı kırılgan**
Zoom-aware pozisyon hesabı, zoom değişince stale kalabiliyor.

**Trigger button'da `aria-expanded` / `aria-haspopup` yok**

**Önerilen mimari:** SelectBox (trigger) + SelectBoxDropdown (portal component) + SelectBoxSearch (alt component) veya state machine.

### Modal

**`reparentSlots()` ile imperatif DOM manipülasyonu (satır 122-144)**
Çocuk node'ları div'ler arasında manuel taşıyor. Standart `<slot name="...">` kullanılmalı.

**`render() yok — sadece imperatif DOM**
`buildModal()` ile element oluşturuyor, Lit'in render cycle'ı dışında. Reactive güncelleme güvenilmez.

**Focus trap ve focus restoration yok**
Escape ile kapanıyor ama focus yönetimi eksik. `aria-labelledby` title'a bağlı değil.

### Collapsible / Accordion

**`reparentChildren()` imperatif DOM manipülasyonu (satır 40-50)**
Trigger ve content'i manuel yerleştiriyor. `<slot name="trigger">` ve `<slot name="content">` olmalı.

### DropdownMenu

**MutationObserver ile çocuk takibi (satır 24-25)**
Çocuklar değişince reparent için observer kullanıyor. Event-driven olmalı.

**`document.addEventListener()` ile outside click (satır 70)**
Tam function reference ile cleanup yapılıyor ama scope değişince çalışmayabilir.

### Table

**`HTMLElement` ve `LitElement` karışık inheritance**
Table wrapper class'ları direkt `HTMLElement` extend ediyor, diğerleri `LitElement`. Tutarsız.

### Text / Heading

**Dynamic tag ismi ile `unsafeHTML` kullanımı**
`<h${level}>` şeklinde tag ismi template string'de oluşturuluyor. XSS riski. Lit'in `staticHtml` ya da koşullu template'ler kullanılmalı.

### Icon

**`unsafeHTML` SVG için**
SVG string enjeksiyonu. SVG Lit template ile render edilmeli ya da inline ikon sistemi kullanılmalı.

### Tooltip

**Keyboard erişimi yok**
Sadece `mouseenter/mouseleave` ve focus. Keyboard-only kullanıcı tooltip'i göremez.

**`aria-hidden` eksik**
Görünmez olduğunda `aria-hidden` set edilmiyor, sadece CSS class kullanılıyor.

### TwoPanel

**MutationObserver sadece class sync için (satır 18-19)**
Çocuklar değişince class güncellemek için observer kullanıyor. Event-driven olmalı.

### FileInput

**`requestUpdate()` her attribute değişiminde (satır 57-62)**
İlgisiz attribute değişimlerinde bile tetikleniyor.

---

## Tekrarlayan Sorunlar

### `parseOptions()` / `parseNum()` çoğaltılmış

Aynı JSON/string parse fonksiyonları birden fazla yerde:

- `RadioGroup/nuxy-radio-group.ts` — `parseOptions()`
- `SelectBox/nuxy-select-box.ts` — `parseOptions()`
- `Slider/nuxy-slider.ts` — `parseNum()`
- `NumberInput/nuxy-number-input.ts` — `parseNum()`
- `Table/nuxy-table.ts` — `parseDataListItems()`

Shared `utils/parse.ts` dosyasına çıkarılmalı.

### Arrow function event listener'ları memory leak

Birçok component'te:

```ts
private onClick = (): void => { ... }  // her instance için yeni fonksiyon
this.backdrop.addEventListener('click', this.onClick)
```

Arkasına cleanup yoksa veya component yeniden render edilirse listener sızıntısı oluşur. Bound method ve `removeEventListener` tercih edilmeli.

### Inline style her yerde

`style="display:flex;gap:12px;"` gibi inline style'lar Lit template'lerde yaygın. CSS class olmalı.

### Hard-coded renkler

`rgba(255, 255, 255, 0.02)`, `#c3e4f5` gibi değerler CSS variable olmalı.

---

## CSS Mimarisi

**Naming convention yok**
`nuxy-button__trigger`, `nuxy-select-box__trigger`, `nuxy-search-input__icon` — aynı pattern ama tutarsız modifier/state kullanımı.

**CSS custom property fallback'leri gereksiz tekrar**
`var(--gradient-1, #c3e4f5)` — fallback değer variable değeriyle aynı, anlamsız.

**Tree-shaking mümkün değil**
Tüm CSS tek stylesheet'e inject ediliyor. Component bazlı CSS bundle mümkün değil.

---

## Hooks

`extensions/ui-default/src/hooks/` altındaki hook'lar (`useListNavigation.ts`, `useTwoPanelNav.ts`, `useToolKeyActions.ts`) React hook'larından ilham almış ama custom element'lerde `this` binding ile kullanılması garip. Controller pattern daha doğal.

---

## Özet

Temiz bir Lit-first rewrite şunları yapmalı:

1. Layout/style-only component'leri (`Box`, `Stack`, `Badge`, `Card` varyantları) factory fonksiyona ya da pure CSS'e çevir
2. Gerçek interaktif component'lerde shadow DOM veya strict CSS scoping tercih et
3. `innerHTML` / `unsafeHTML` kullanımını kaldır, Lit template ve slot kullan
4. `document.body` portal'larını gerçek portal component'e taşı
5. `MutationObserver` kullanımını event-driven tasarımla değiştir
6. Tüm interactive component'lere keyboard navigation ve ARIA ekle
7. Shared utility'leri çıkar: `parseOptions`, `parseNum`, `MIRROR_ATTRS`, `syncHostClasses`
