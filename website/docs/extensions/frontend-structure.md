---
title: Frontend Structure
---

# Frontend Structure

How to organize extension frontends with **LitElement**, controllers, and the shared UI kit.

::: tip Reference implementation
The `extensions/notes/` extension is the canonical example — Lit element, controller pattern, keyboard navigation, two-panel layout.
:::

## Lit essentials

All tool frontends use `LitElement` from `@nuxy/core` with **light DOM**:

```typescript
import { LitElement, html, customElement, property, state } from '@nuxy/core'
import type { NuxyToolElement } from '@nuxy/core'

@customElement('nuxy-tool-my-tool')
export class NuxyToolMyTool extends LitElement implements NuxyToolElement {
  protected createRenderRoot(): HTMLElement {
    return this
  }

  @property({ type: String }) extensionId = ''
  @property({ type: String }) committedQuery = ''
  // query setter, controller, render() ...
}
```

- Import from `@nuxy/core` — never from `lit` directly
- Override `createRenderRoot()` to return `this` so theme tokens apply
- Use `window.UI` components for all visual elements
- Put IPC and state logic in a `controller.ts`, not in the element

---

<div v-pre>

# Detailed Guide

> Companion to the [Development Guide](/extensions/development-guide) §5.

---

## Core principle

`frontend.ts` is the **bootstrap file** — the module the kernel loads first when an extension's frontend is activated. It can do three things:

| Shape                                                          | When to use                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| Pure entry — one or two `import` statements                    | Simple tools that only need to register a custom element   |
| Inline bootstrap — a few lines of imperative setup             | Helper/theme extensions with minimal lifecycle logic       |
| Viewmodel delegation — imports and starts a `*ViewModel` class | Helper/theme extensions with non-trivial mount/event logic |

What `frontend.ts` must **never** contain:

- Render logic (templates, DOM construction)
- Direct state mutation in response to IPC results
- More than one concern — if you need two unrelated things, put each in its own module

---

## Viewmodel pattern

A **viewmodel** is a plain class that owns the frontend lifecycle for extensions that do not use a custom element — typically `helper` and `theme` extensions. It is instantiated directly from `frontend.ts`.

```typescript
// gradient-viewmodel.ts
export class GradientViewModel {
  private handle: MountHandle | null = null

  constructor() {
    // bind stable references for event listeners
  }

  /** Called once from frontend.ts — binds events and attempts initial mount. */
  mount(): void { ... }

  /** Cleanup — release composition layer and remove listeners. */
  release(): void { ... }

  /** Push new state to the composition layer (renderer). */
  applyState(detail: unknown): void { ... }
}
```

```typescript
// frontend.ts
import './nuxy-gradient-layer.ts' // registers the custom element (renderer)
import { GradientViewModel } from './gradient-viewmodel.ts'

new GradientViewModel().mount() // starts the viewmodel (logic)
```

**Viewmodel vs. Controller:**

|                 | Controller                             | Viewmodel                       |
| --------------- | -------------------------------------- | ------------------------------- |
| Attached to     | A custom element (`connectedCallback`) | `frontend.ts` directly          |
| Lifecycle owner | The element                            | Itself                          |
| Used for        | Tool UIs with a render loop            | Helper/theme/uikit bootstrap    |
| Renderer        | LitElement `render()`                  | Separate custom element or none |

**When to write a viewmodel:** the frontend has lifecycle logic (mount, events, timers) but does not manage a render loop.

---

## Controller pattern

Instead of React hooks split by concern, use a controller class that owns state, IPC calls, and business logic. The custom element creates a controller instance and passes a callback so the controller can trigger re-renders.

```typescript
// notes-controller.ts
export class NotesController {
  private _items: Note[] = []
  private _query = ''

  constructor(private onUpdate: () => void) {}

  async connect(): Promise<void> {
    // load initial data via IPC
    const res = await window.core.ipc.invoke('com.nuxy.notes', 'getNotes')
    if (res?.success) this._items = res.data as Note[]
    this.onUpdate()
  }

  disconnect(): void {
    // cleanup (intervals, listeners)
  }

  setQuery(q: string): void {
    this._query = q
    this.onUpdate()
  }

  get filteredItems(): Note[] {
    return this._items.filter((n) => n.title.includes(this._query))
  }
}
```

**When to write one:** any extension that loads data from the backend, polls for updates, handles mutations, or manages non-trivial state.

---

## LitElement pattern

All tool frontends use `LitElement` from `@nuxy/core` with light DOM and a controller:

```typescript
import { LitElement, html, customElement, property } from '@nuxy/core'
import type { NuxyToolElement } from '@nuxy/core'
import { MyController } from './controller.ts'

@customElement('nuxy-tool-my-extension')
export class NuxyToolMyExtensionElement extends LitElement implements NuxyToolElement {
  protected createRenderRoot(): HTMLElement {
    return this
  }

  @property({ type: String }) extensionId = ''
  @property({ type: String }) committedQuery = ''

  private controller: MyController | null = null
  private _query = ''

  connectedCallback(): void {
    super.connectedCallback()
    this.controller = new MyController(() => this.requestUpdate())
    this.controller.connect()
  }

  disconnectedCallback(): void {
    super.disconnectedCallback()
    this.controller?.disconnect()
    this.controller = null
  }

  set query(v: string) {
    if (this._query === v) return
    this._query = v
    this.controller?.setQuery(v)
  }
  get query() {
    return this._query
  }

  render() {
    const { List, EmptyState } = (window as any).UI || {}
    const items = this.controller?.filteredItems ?? []
    return html`${items.length === 0
      ? EmptyState?.({ title: 'No results' })
      : List?.({ children: items.map(/* ... */) })}`
  }
}
```

---

## Decision guide — when to split vs. keep inline

| Signal                                                | Action                                                   |
| ----------------------------------------------------- | -------------------------------------------------------- |
| Element class > 120 lines                             | audit: what is not orchestration?                        |
| Controller has > 3 concerns                           | split into smaller controllers or move logic to `utils/` |
| Two controllers share a concept                       | merge into one controller                                |
| IPC call inside `render()`                            | move to the controller                                   |
| A render branch > 20 lines                            | extract a helper function or sub-element                 |
| A controller doing two unrelated things               | split into two controllers                               |
| A controller method called only in connect/disconnect | keep it inline, don't extract                            |
| A render helper with no state or side-effects         | keep it, it's a pure display helper — that's fine        |

---

## Anti-patterns

**Don't use `this.render()` in a loop.** Batch state changes in the controller and call `onUpdate()` once at the end.

**Don't put IPC calls inside `render()`.** `render()` is synchronous and must only read from already-loaded state. All IPC happens in the controller (`connect`, setters, or action methods).

**Don't create controller methods that are only called once.** Logic used only in `connect()` or `disconnect()` should stay inline there — extracting it hides intent without adding clarity.

**Don't split for line count alone.** A 60-line element class with a clean controller needs no further splitting.

**Don't create "utils" controllers.** A controller named `HelperController` or `UtilsController` is a drawer. Name controllers after what they own (`NotesController`, `SearchController`).

**Don't mix data loading and mutation in one controller method.** Keep fetch and mutate as separate methods so each remains testable in isolation.

---

## Reference: notes extension

```
extensions/notes/
  frontend.ts              ← import './nuxy-tool-notes.ts' (or inline element)
  backend.ts
  controller.ts            ← state, IPC, keyboard actions
  frontend.ts / nuxy-tool-notes.ts  ← LitElement + NuxyToolElement
  types.ts
  utils/
  tests/
```

- **Element** — lifecycle, property setters, Lit `render()` with `window.UI`
- **Controller** — data loading, filtering, mutations, IPC calls
- **No `*-dom.ts`** — templates live in the Lit element's `render()` method

</div>
