# Yeniden Yazım Planı

Tüm analiz belgelerine (01–05) dayanarak hazırlandı.

---

## Temel Kararlar (Tartışmaya Kapalı)

Bunlar rewrite'ın başında belirlenmeli ve değiştirilmemeli:

1. **Lit + shadow DOM** — tüm component'ler `LitElement` + shadow DOM. Light DOM genel kural olarak yasak.
2. **Tek CSS stratejisi** — CSS-in-JS değil, her component'e `static styles = css\`...\`` ile scoped CSS.
3. **`h()` fonksiyonu kaldırılıyor** — Lit template literal her yerde.
4. **`packages/ui` stub katmanı kaldırılıyor** — `window.UI` pattern ölü.
5. **`ce-utils.ts` kaldırılıyor** — Lit ile gerek yok.
6. **Extension'lar kendi EXT_ID'lerini manifest'ten okuyor** — hard-code yasak.

---

## Faz 1: Altyapı (Haftalar 1–2)

### 1.1 Monorepo temizliği

- `packages/ui` silinecek
- `ce-utils.ts` silinecek
- `extensions/two-panel-nav.ts` silinecek veya Lit controller'a çevrilecek
- `LIT_MIGRATION_GUIDE.md` referans belge olarak kalacak

### 1.2 packages/core IPC düzeltmeleri

**Worker mesaj discriminator ekle:**

```ts
type WorkerMessage =
  | { kind: 'call'; id: string; method: string; args: unknown[] }
  | { kind: 'reply'; id: string; result: unknown; error?: string }
  | { kind: 'event'; name: string; payload: unknown }
```

**Host call timeout:**

```ts
const pending = new Map<string, { resolve; reject; timer }>()
// her call için 30s timer, dolunca reject + pending'den sil
```

**Worker error state:**

```ts
worker.on('error', (err) => {
  registry.markFailed(extId, err.message)
  notifyRenderer('extension:failed', { id: extId })
})
```

### 1.3 Preload güvenli sinyal

```ts
let coreReady = false
try {
  contextBridge.exposeInMainWorld('core', { ... })
  coreReady = true
} catch (e) {
  console.error('Preload failed:', e)
}
window.dispatchEvent(new CustomEvent('nuxy:ready', { detail: { ok: coreReady } }))
```

Renderer event detail'deki `ok: false` durumunda hata ekranı gösterir.

### 1.4 Protocol path sanitization

```ts
function safeExtPath(extId: string, filePath: string): string {
  if (!/^[a-z0-9_-]+$/.test(extId)) throw new Error('Invalid ext id')
  const resolved = path.resolve(extRoot, extId, filePath)
  if (!resolved.startsWith(path.resolve(extRoot))) throw new Error('Path traversal')
  return resolved
}
```

### 1.5 Extension scanner bölünmesi

612 satır `scanner.ts` → 5 modüle:

```
src/electron/extensions/
  manifest-loader.ts    # JSON parse + zod validation
  worker-manager.ts     # spawn, terminate, timeout
  theme-registrar.ts    # theme JSON yükle
  icon-registrar.ts     # icon pack JSON yükle
  dev-sync.ts           # dev mode kaynak kopyalama
  index.ts              # scanner sadece orchestrate eder
```

---

## Faz 2: Shell Extension Rewrite (Haftalar 3–5)

Shell, projenin kalbi. En kritik faz.

### 2.1 ShellController parçalanması

992 satır tek class → sorumluluk bazlı modüller:

```
extensions/shell/
  controllers/
    query-controller.ts       # query state, debounce
    navigation-controller.ts  # selectedIndex, keyboard nav
    tool-controller.ts        # activeTool, tool lifecycle
    provider-controller.ts    # provider states, loading
    window-controller.ts      # drag, resize, spring
    command-palette-controller.ts
  shell-controller.ts         # Lit ReactiveController, compose above
```

Her controller `ReactiveController` implement eder:

```ts
class QueryController implements ReactiveController {
  host: ReactiveControllerHost
  query = ''
  constructor(host: ReactiveControllerHost) {
    this.host = host
    host.addController(this)
  }
  hostConnected() {
    /* event listeners */
  }
  hostDisconnected() {
    /* cleanup */
  }
}
```

### 2.2 NuxyShellViewElement → LitElement

```ts
@customElement('nuxy-shell-view')
export class NuxyShellViewElement extends LitElement {
  static styles = css`
    /* scoped shell layout */
  `

  private query = new QueryController(this)
  private nav = new NavigationController(this)
  private tools = new ToolController(this)
  private providers = new ProviderController(this)

  render() {
    return html`
      <div class="backdrop" @click=${this.#onBackdropClick}>
        <nuxy-shell>
          <nuxy-shell-omni-bar
            .value=${this.query.value}
            .placeholder=${this.#placeholder}
            @input=${this.#onInput}
            @keydown=${this.#onKeyDown}
          ></nuxy-shell-omni-bar>
          <nuxy-results-list
            .items=${this.#flatItems}
            .selectedIndex=${this.nav.selectedIndex}
            @item-click=${this.#onItemClick}
          ></nuxy-results-list>
        </nuxy-shell>
      </div>
    `
  }
}
```

Avantajlar:

- `render()` her state değişiminde otomatik çalışır
- Focus, input setup Lit'in `firstUpdated()` / `updated()` lifecycle'ında güvenle yapılır
- `shell-dom.ts` factory fonksiyonları tamamen ortadan kalkar

### 2.3 NuxyShellOmniBar — doğru Lit

```ts
@customElement('nuxy-shell-omni-bar')
export class NuxyShellOmniBarElement extends LitElement {
  static styles = css`...`

  @property() value = ''
  @property() placeholder = ''

  // Shadow DOM içindeki input'a dış erişim için
  get nativeInput(): HTMLInputElement | null {
    return this.shadowRoot?.querySelector('input') ?? null
  }

  render() {
    return html`
      <input
        .value=${this.value}
        placeholder=${this.placeholder}
        @input=${this.#onInput}
        @keydown=${this.#forwardKeyDown}
      />
    `
  }

  #onInput(e: InputEvent) {
    this.dispatchEvent(
      new CustomEvent('input', {
        detail: (e.target as HTMLInputElement).value,
        bubbles: true,
      })
    )
  }

  #forwardKeyDown(e: KeyboardEvent) {
    // shadow DOM'dan dışa bubble et
    this.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: e.key,
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    )
  }
}
```

Shell view'da:

```ts
firstUpdated() {
  this.shadowRoot?.querySelector('nuxy-shell-omni-bar')?.nativeInput?.focus()
}
```

### 2.4 NuxyResultsList — virtual scroll hazır

```ts
@customElement('nuxy-results-list')
export class NuxyResultsListElement extends LitElement {
  @property({ type: Array }) items: ListItem[] = []
  @property({ type: Number }) selectedIndex = -1

  render() {
    return html`
      <div role="listbox">
        ${this.items.map(
          (item, i) => html`
            <div
              role="option"
              class=${classMap({ item: true, 'item--active': i === this.selectedIndex })}
              aria-selected=${i === this.selectedIndex ? 'true' : 'false'}
              @click=${() => this.#onItemClick(item)}
            >
              <span class="item__title">${item.title}</span>
              ${item.subtitle
                ? html`<span class="item__subtitle">${item.subtitle}</span>`
                : nothing}
            </div>
          `
        )}
      </div>
    `
  }
}
```

`selectedIndex` değiştiğinde Lit otomatik re-render yapar — fast path karmaşıklığı ortadan kalkar.

---

## Faz 3: UI Component Library Rewrite (Haftalar 5–8)

### 3.1 Öncelik sırası

**Kaldırılacaklar** (layout/style-only, custom element olmayı hak etmiyor):

- `NuxyBoxElement` → CSS utility class
- `NuxyStackElement` → CSS utility class
- `NuxyDividerElement` → `<hr>` veya CSS utility class
- `NuxyBadgeElement` → CSS class ile `<span>`

**Minimal Lit rewrite** (mantık az ama Lit lifecycle gerekiyor):

- `NuxyCardElement`, `NuxyCardHeaderElement`
- `NuxyListElement`, `NuxyListItemElement`

**Tam rewrite** (gerçek interaktif mantık):

- `NuxyButtonElement` — shadow DOM, aria, MIRROR_ATTRS kaldır
- `NuxyInputElement`, `NuxyTextareaElement`, `NuxySearchInputElement`
- `NuxySelectBoxElement` — en karmaşık, aşağıda ayrı ele alındı
- `NuxyModalElement` — focus trap ekle, slot ile reparent kaldır
- `NuxyCollapsibleElement`, `NuxyAccordionElement`
- `NuxyTooltipElement` — keyboard erişimi ekle
- `NuxyCheckboxElement`, `NuxySwitchElement`, `NuxyRadioGroupElement`

### 3.2 SelectBox mimarisi

Mevcut SelectBox monoliti → 3 component:

```
nuxy-select-box         # trigger button, controlled
nuxy-select-dropdown    # floating dropdown, portal-aware
nuxy-select-option      # individual option
```

```ts
// nuxy-select-box.ts
@customElement('nuxy-select-box')
export class NuxySelectBoxElement extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Array }) options: SelectOption[] = []
  @property() value = ''

  render() {
    return html`
      <button
        aria-haspopup="listbox"
        aria-expanded=${this.open}
        @click=${() => (this.open = !this.open)}
      >
        ${this.#selectedLabel}
        <nuxy-icon name="chevron-down"></nuxy-icon>
      </button>
      ${this.open
        ? html`
            <nuxy-select-dropdown
              .options=${this.options}
              .value=${this.value}
              @select=${this.#onSelect}
              @close=${() => (this.open = false)}
            ></nuxy-select-dropdown>
          `
        : nothing}
    `
  }
}
```

Dropdown pozisyonlama için `popover` API veya `@floating-ui/dom` kullanılabilir.

### 3.3 Shared utilities

```
extensions/ui-default/src/utils/
  parse.ts        # parseOptions, parseNum, parseDataList
  mirror-attrs.ts # MIRROR_ATTRS utility
  host-classes.ts # syncHostClasses mixin
  focus-trap.ts   # Modal için focus trap
  keyboard-nav.ts # RadioGroup, SelectBox için arrow key nav
```

### 3.4 ARIA checklist

Her interactive component için zorunlu:

- `role` attribute
- `aria-label` veya `aria-labelledby`
- Keyboard navigation (Enter, Space, arrow keys)
- Focus visible style (`:focus-visible`)
- `aria-disabled`, `aria-expanded`, `aria-selected` duruma göre

---

## Faz 4: Extension Düzeltmeleri (Hafta 9)

### Calculator

`eval()` kaldır:

```ts
import { evaluate } from 'mathjs' // veya custom güvenli parser

const result = evaluate(expression)
```

Boş backend worker'ı kaldır — manifest'ten `entry.backend` silinir.

### nyaa

AbortController ekle:

```ts
let currentController: AbortController | null = null

async function search(query: string) {
  currentController?.abort()
  currentController = new AbortController()
  try {
    return await fetch(url, { signal: currentController.signal }).then((r) => r.json())
  } catch (e) {
    if (e.name === 'AbortError') return null
    return { error: String(e) }
  }
}
```

### settings

Async handler'ları düzelt:

```ts
core.ipc.handle('getConfig', async () => {
  return await core.storage.get('config') // await eklendi
})
```

Optimistic update kaldır — backend konfirmasyonunu bekle.

### Tüm extension'lar

EXT_ID hard-code kaldır:

```ts
// NuxyToolElement setter'dan
set extensionId(id: string) {
  this._extId = id
  // artık this._extId ile ipc invoke
}
```

---

## Faz 5: Test ve Güvenlik (Hafta 10)

### IPC test coverage

Her `ipcMain.handle` için:

- Happy path
- Missing params
- Malformed payload
- Extension not found

### Extension backend test'leri

Her backend handler için error senaryoları. Mevcut mock pattern korunur ama coverage artar.

### E2E test'leri

Playwright e2e için:

- `pressOmnibarKey` helper artık gerçek input üzerinde çalışmalı
- Keyboard navigation testi: up/down/enter/escape
- Tool aktivasyon testi
- Focus management testi

### Güvenlik

- Protocol path traversal testi
- Calculator expression injection testi
- Extension manifest validation şeması (Zod)

---

## Geciktirilecekler (Şimdi Değil)

Bunlar ikinci versiyon için:

- Virtual scroll (binlerce sonuç yok şu an)
- i18n altyapısı genişletme (zaten mevcut)
- Plugin marketplace
- Extension hot-reload
- Multi-monitor aware window positioning (spring animasyonu yeterli)

---

## Başlangıç Noktası

Bugün başlanacaksa bu sırayla:

1. `packages/core` IPC discriminator ve timeout — Faz 1.2
2. `NuxyShellOmniBarElement` Lit rewrite — Faz 2.3
3. `NuxyShellViewElement` LitElement'e taşı — Faz 2.2
4. `ShellController` ilk parçalanma: `QueryController` + `NavigationController` — Faz 2.1
5. Calculator `eval()` fix — Faz 4

TDD: her adımda önce test, sonra implementation.
