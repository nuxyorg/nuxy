# Lit Migration Guide

Converting vanilla `HTMLElement` + `h()` extensions to `LitElement`.

---

## Why migrate

The vanilla pattern (`HTMLElement` + `*-dom.ts` + `h()`) replaces the entire DOM subtree on every state update via `replaceChildren()`. Lit's `html\`\`` template engine diffs and patches only what changed — fewer DOM mutations, no lost focus, no scroll-position jumps. The controller class is unchanged; only the element file and the DOM helper change.

---

## Import source

Lit is re-exported from `@nuxy/core`. Never import from `lit` directly.

```typescript
// CORRECT — single source of truth
import { LitElement, html, nothing, css } from '@nuxy/core'
import { customElement, property, state } from '@nuxy/core'
import { ref } from '@nuxy/core'
import type { NuxyToolElement } from '@nuxy/core'

// WRONG — direct Lit import bypasses workspace resolution
import { LitElement } from 'lit'
import { customElement } from 'lit/decorators.js'
```

---

## Light DOM — mandatory

Nuxy themes are applied as CSS custom properties on `document.documentElement`. Shadow DOM cuts the element off from those tokens. Every Lit tool element must opt into light DOM.

```typescript
// CORRECT — every tool element must have this
protected createRenderRoot(): HTMLElement {
  return this
}

// WRONG — shadow DOM blocks theme tokens and global styles
// (default LitElement behavior; omitting createRenderRoot() uses shadow DOM)
```

---

## Element file: before → after

### Before (vanilla `HTMLElement`)

```typescript
// nuxy-tool-example.ts
import type { NuxyToolElement } from '@nuxy/core'
import { ExampleController } from './example-controller.ts'
import { renderExampleApp } from './example-dom.ts'

const TAG = 'nuxy-tool-example'

export class NuxyToolExampleElement extends HTMLElement implements NuxyToolElement {
  private controller: ExampleController | null = null
  private _query = ''
  private _committedQuery = ''
  private _extensionId = ''

  connectedCallback(): void {
    this.classList.add('nuxy-tool-example')
    this.controller = new ExampleController(() => this.render())
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
    this.render()
  }

  disconnectedCallback(): void {
    this.controller?.disconnect()
    this.controller = null
    this.replaceChildren()
  }

  get query(): string {
    return this._query
  }
  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setQuery(next)
  }

  get committedQuery(): string {
    return this._committedQuery
  }
  set committedQuery(value: string) {
    this._committedQuery = value ?? ''
  }

  get extensionId(): string {
    return this._extensionId
  }
  set extensionId(value: string) {
    this._extensionId = value ?? ''
  }

  private render(): void {
    if (!this.controller) return
    this.replaceChildren(renderExampleApp(this.controller))
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, NuxyToolExampleElement)
```

### After (LitElement)

```typescript
// nuxy-tool-example.ts
import { LitElement, html, nothing, customElement, property } from '@nuxy/core'
import type { NuxyToolElement } from '@nuxy/core'
import { ExampleController } from './example-controller.ts'

@customElement('nuxy-tool-example')
export class NuxyToolExampleElement extends LitElement implements NuxyToolElement {
  @property({ type: String }) committedQuery = ''
  @property({ type: String }) extensionId = ''

  private controller: ExampleController | null = null
  private _query = ''

  protected createRenderRoot(): HTMLElement {
    return this
  }

  connectedCallback(): void {
    super.connectedCallback()
    this.classList.add('nuxy-tool-example')
    this.controller = new ExampleController(() => this.requestUpdate())
    this.controller.connect()
    if (this._query) this.controller.setQuery(this._query)
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
  }

  get query(): string {
    return this._query
  }
  set query(value: string) {
    const next = value ?? ''
    if (this._query === next) return
    this._query = next
    this.controller?.setQuery(next)
  }

  render() {
    if (!this.controller) return nothing
    const { items, selectedIndex } = this.controller.state
    return html`
      <nuxy-list>
        ${items.map(
          (item, i) => html`
            <nuxy-list-item ?active=${i === selectedIndex}>
              <nuxy-list-item-body>
                <nuxy-list-item-text>${item.title}</nuxy-list-item-text>
              </nuxy-list-item-body>
            </nuxy-list-item>
          `
        )}
      </nuxy-list>
    `
  }
}
```

**What changed:**

- `extends HTMLElement` → `extends LitElement`
- `@customElement` decorator replaces the manual `customElements.define` guard
- `super.connectedCallback()` / `super.disconnectedCallback()` must be called
- `() => this.render()` callback → `() => this.requestUpdate()`
- `replaceChildren(renderExampleApp(...))` → Lit `render()` returning `html\`\``
- `committedQuery` and `extensionId` become `@property` — no manual getter/setter needed
- `query` keeps its manual getter/setter because it has side-effects (calls controller)
- `createRenderRoot()` must return `this`

---

## Converting `*-dom.ts` to a Lit render method

The DOM helper file (`example-dom.ts`) disappears. Its logic moves into the element's `render()` method and private helper methods.

### Before (`example-dom.ts`)

```typescript
import { h } from '../ui-default/src/h.ts'
import { ceList, ceListItem, ceListItemBody, ceListItemText, ceEmptyState } from '../ui-ce.ts'
import type { ExampleController } from './example-controller.ts'

export function renderExampleApp(ctrl: ExampleController): HTMLElement {
  const { items, selectedIndex, query } = ctrl.state

  const list = ceList()

  if (items.length === 0) {
    list.appendChild(ceEmptyState({ message: 'No items.', hint: 'Type to search.' }))
  } else {
    items.forEach((item, i) => {
      list.appendChild(
        ceListItem(
          { active: i === selectedIndex, onClick: () => ctrl.setSelectedIndex(i) },
          ceListItemBody(null, ceListItemText(null, item.title))
        )
      )
    })
  }

  return h('div', { style: { height: '100%' } }, list)
}
```

### After (inside the element class)

```typescript
render() {
  if (!this.controller) return nothing
  const { items, selectedIndex, query } = this.controller.state

  return html`
    <div style="height: 100%;">
      <nuxy-list>
        ${items.length === 0
          ? html`<nuxy-empty-state message="No items." hint="Type to search."></nuxy-empty-state>`
          : items.map((item, i) => html`
              <nuxy-list-item
                ?active=${i === selectedIndex}
                @click=${() => this.controller?.setSelectedIndex(i)}
              >
                <nuxy-list-item-body>
                  <nuxy-list-item-text>${item.title}</nuxy-list-item-text>
                </nuxy-list-item-body>
              </nuxy-list-item>
            `)
        }
      </nuxy-list>
    </div>
  `
}
```

For complex renders, split into private methods that return `TemplateResult`:

```typescript
import { html, nothing, type TemplateResult } from '@nuxy/core'

render() {
  if (!this.controller) return nothing
  return html`
    <nuxy-two-panel>
      ${this.renderLeft()}
      ${this.renderRight()}
    </nuxy-two-panel>
  `
}

private renderLeft(): TemplateResult {
  const { items, selectedIndex } = this.controller!.state
  return html`
    <nuxy-list>
      ${items.map((item, i) => html`
        <nuxy-list-item ?active=${i === selectedIndex}>
          <nuxy-list-item-body>
            <nuxy-list-item-text>${item.title}</nuxy-list-item-text>
          </nuxy-list-item-body>
        </nuxy-list-item>
      `)}
    </nuxy-list>
  `
}

private renderRight(): TemplateResult {
  const { selected } = this.controller!.state
  if (!selected) return html`<nuxy-empty-state message="Select an item."></nuxy-empty-state>`
  return html`<div>${selected.title}</div>`
}
```

---

## Template syntax reference

### Expressions and interpolation

```typescript
// Text content
html`<span>${item.title}</span>`

// Attribute binding
html`<nuxy-section-header label=${section.label}></nuxy-section-header>`

// Boolean attribute — adds/removes the attribute based on truthiness
html`<nuxy-list-item ?active=${i === selectedIndex}></nuxy-list-item>`

// Property binding (sets JS property, not HTML attribute)
html`<nuxy-select-box .options=${optionsArray}></nuxy-select-box>`

// Event listener
html`<nuxy-list-item @click=${() => this.handleClick(item)}></nuxy-list-item>`

// DOM event from child element
html`
  <nuxy-tab-bar
    @nuxy-tab-bar-change=${(e: CustomEvent<{ id: string }>) => this.onTabChange(e.detail.id)}
  ></nuxy-tab-bar>
`

// Conditional — use nothing to render nothing
html`${condition ? html`<span>visible</span>` : nothing}`

// Lists — return a TemplateResult per item
html`
  <nuxy-list>
    ${items.map(
      (item, i) => html`
        <nuxy-list-item ?active=${i === selectedIndex}>
          <nuxy-list-item-text>${item.title}</nuxy-list-item-text>
        </nuxy-list-item>
      `
    )}
  </nuxy-list>
`
```

### Element refs

Use the `ref()` directive when you need a reference to a DOM element after render:

```typescript
import { ref, type RefOrCallback } from '@nuxy/core'

private scrollAreaRef: HTMLElement | null = null

render() {
  return html`
    <nuxy-scroll-area ${ref((el) => { this.scrollAreaRef = el as HTMLElement | null })}>
      ${this.renderContent()}
    </nuxy-scroll-area>
  `
}
```

---

## Controller: almost nothing changes

The controller pattern carries over intact. The only change is replacing `onUpdate()` (which called `this.render()`) with `this.requestUpdate()`:

```typescript
// Before — in vanilla element
this.controller = new ExampleController(() => this.render())

// After — in Lit element
this.controller = new ExampleController(() => this.requestUpdate())
```

The controller class itself is unchanged — it still calls `onUpdate` when state changes, still has `connect()` / `disconnect()`, still registers keyboard actions. No rewrite needed.

---

## State inside the element

Use `@state()` for element-local state that does not come from the controller. Avoid it for data that belongs in the controller — keep the controller as the single source of truth.

```typescript
import { state } from '@nuxy/core'

@customElement('nuxy-tool-example')
export class NuxyToolExampleElement extends LitElement implements NuxyToolElement {
  @state() private loading = false // OK — local UI state not in controller

  // WRONG — items belong in controller, not here
  // @state() private items: Item[] = []
}
```

---

## Styling

Light DOM means CSS custom properties from the theme apply automatically to all child elements. No style blocks needed in most cases.

```typescript
// Inline structural styles — acceptable for layout, not for colors
render() {
  return html`
    <div style="display: flex; flex-direction: column; height: 100%;">
      ...
    </div>
  `
}

// WRONG — hardcoded colors bypass the theme system
// style="color: #333; background: #fff"

// CORRECT — use theme tokens
// style="color: var(--text); background: var(--surface)"
```

Do not use `static styles = css\`...\``in tool elements. The`css\`\``helper creates a`CSSStyleSheet` that attaches to shadow DOM — it has no effect in light DOM and will silently do nothing.

---

## Anti-patterns

### A. Forgetting `super` calls

```typescript
// WRONG — Lit lifecycle hooks do not fire without super
connectedCallback(): void {
  this.controller = new ExampleController(() => this.requestUpdate())
}

// CORRECT
connectedCallback(): void {
  super.connectedCallback()
  this.controller = new ExampleController(() => this.requestUpdate())
}
```

### B. Keeping the old `render()` pattern inside Lit

```typescript
// WRONG — Lit owns the render() method; calling replaceChildren() bypasses diffing
private render(): void {
  this.replaceChildren(renderExampleApp(this.controller!))
}

// CORRECT — return html`` from Lit's render()
render() {
  return html`...`
}
```

### C. Importing Lit directly

```typescript
// WRONG
import { LitElement, html } from 'lit'
import { customElement } from 'lit/decorators.js'

// CORRECT
import { LitElement, html, customElement } from '@nuxy/core'
```

### D. Shadow DOM (omitting createRenderRoot)

```typescript
// WRONG — default Lit behavior uses shadow DOM; theme tokens break
@customElement('nuxy-tool-example')
export class NuxyToolExampleElement extends LitElement { ... }

// CORRECT — always override createRenderRoot
protected createRenderRoot(): HTMLElement { return this }
```

### E. Using `css\`\`` in light DOM elements

```typescript
// WRONG — CSSStyleSheet targets shadow root, silent no-op in light DOM
static styles = css`
  :host { display: flex; }
`

// CORRECT — use inline style on this in connectedCallback, or rely on tokens
connectedCallback(): void {
  super.connectedCallback()
  this.style.display = 'flex'
  this.style.flexDirection = 'column'
}
```

### F. Mutating DOM outside of render()

```typescript
// WRONG — direct DOM mutation fights Lit's renderer
this.appendChild(document.createElement('div'))
this.replaceChildren()

// CORRECT — all DOM changes go through render(); trigger via requestUpdate()
this.requestUpdate()
```

### G. Using `@property` for query without side-effects

`query` has a side-effect: it must notify the controller. Keep the manual getter/setter.

```typescript
// WRONG — @property won't call controller.setQuery
@property({ type: String }) query = ''

// CORRECT — manual getter/setter preserves the side-effect
private _query = ''
get query(): string { return this._query }
set query(value: string) {
  const next = value ?? ''
  if (this._query === next) return
  this._query = next
  this.controller?.setQuery(next)
}
```

`committedQuery` and `extensionId` have no side-effects and are safe as `@property`.

---

## Migration checklist

- [ ] Base class changed from `HTMLElement` to `LitElement`
- [ ] `@customElement(TAG)` decorator added; manual `customElements.define` guard removed
- [ ] `createRenderRoot()` returns `this`
- [ ] `super.connectedCallback()` and `super.disconnectedCallback()` called
- [ ] Controller instantiated with `() => this.requestUpdate()`
- [ ] Private `render()` → replaced by public Lit `render()` returning `html\`\``
- [ ] `*-dom.ts` file deleted; its logic moved into the element's render methods
- [ ] `committedQuery` and `extensionId` use `@property`; `query` keeps manual setter
- [ ] No `import { ... } from 'lit'` — all imports from `@nuxy/core`
- [ ] No `static styles = css\`...\``— structural styles applied in`connectedCallback`
- [ ] No `replaceChildren()` / `appendChild()` calls outside `connectedCallback`
- [ ] Hardcoded colors replaced with `var(--token)` CSS custom properties
- [ ] `*-dom.ts` file removed from the extension folder (it is no longer served)
