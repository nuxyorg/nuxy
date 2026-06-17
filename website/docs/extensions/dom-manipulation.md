---
title: DOM Manipulation Rules
---

# DOM Manipulation Rules

Nuxy extension UI is built with **LitElement** and light DOM. Structure, updates, and refs must stay inside Lit's declarative pipeline — not imperative browser DOM APIs.

::: tip Summary
If you are rendering it, put it in `html\`\``. If you need a ref, use `@query`or`ref()`. If it mounts on `document.body`, use `<nuxy-portal>`.
:::

## Why this matters

Imperative DOM (`innerHTML`, `createElement`, `querySelector`, …) bypasses Lit's diffing. That leads to:

- Lost focus and scroll jumps on every update
- Theme tokens and keyboard hooks breaking when nodes are replaced wholesale
- Harder tests and reviews — structure is scattered across methods instead of one template
- XSS risk when assigning unsanitized HTML strings

The vanilla `HTMLElement` + `replaceChildren()` pattern is **legacy**. New and migrated code must use Lit `render()` only.

## Banned patterns

These are **not allowed** in extension component source (`nuxy-tool-*.ts`, `nuxy-*.ts`, controllers that build UI):

| API / pattern                                          | Use instead                                 |
| ------------------------------------------------------ | ------------------------------------------- |
| `.innerHTML =`, `.outerHTML =`, `insertAdjacentHTML()` | `html\`\``templates,`<nuxy-icon>`, `<slot>` |
| `document.createElement()`                             | `html\`\`` templates                        |
| `document.body.appendChild()`                          | `<nuxy-portal>` for overlays                |
| `replaceChildren()`, `this.appendChild()` on hosts     | `render()` + `requestUpdate()`              |
| `querySelector` / `querySelectorAll` for refs          | `@query`, `ref()`, or template bindings     |

```typescript
// ❌ Imperative
connectedCallback() {
  super.connectedCallback()
  const btn = document.createElement('button')
  btn.textContent = 'Save'
  this.appendChild(btn)
}

// ✅ Declarative
render() {
  return html`<nuxy-button>Save</nuxy-button>`
}
```

## Approved alternatives

### Templates and slots

Project icons, labels, and child content through Lit — not string HTML:

```typescript
render() {
  return html`
    <nuxy-button>
      <nuxy-icon slot="icon" name="search"></nuxy-icon>
      <slot></slot>
    </nuxy-button>
  `
}
```

### Element references

```typescript
import { query, ref } from '@nuxyorg/core'

@query('input') private inputEl!: HTMLInputElement

render() {
  return html`
    <input ${ref((el) => { this.inputEl = el as HTMLInputElement })} />
  `
}
```

Do **not** reach into the tree after render with `this.querySelector('input')` unless you are in a test file.

### Body-mounted UI (modals, menus)

```typescript
render() {
  return html`
    <nuxy-portal .open=${this.open}>
      <div class="menu">${this.renderOptions()}</div>
    </nuxy-portal>
  `
}
```

### Shared utilities (ui-default)

| Module                   | Purpose                                |
| ------------------------ | -------------------------------------- |
| `utils/focus-trap.ts`    | Focus trap + Escape for dialogs        |
| `utils/mirror-attrs.ts`  | Copy host attributes to inner controls |
| `utils/parse-options.ts` | Parse JSON option lists for selects    |

## ESLint enforcement

Running `pnpm lint` (repo root) applies `no-restricted-syntax` **warnings** on `extensions/**/*.ts` for:

- `.innerHTML` / `.outerHTML` assignment
- `document.createElement`
- `document.body.appendChild`
- `insertAdjacentHTML`
- `replaceChildren`
- `querySelector` / `querySelectorAll`
- `this.appendChild`

Configuration lives in `eslint.config.js` at the repo root (`DOM_MANIPULATION_IGNORES` allowlist).

**Excluded from lint:** `**/*.test.ts`, `**/tests/**`, and allowlisted kernel-adjacent files (see below).

Fix warnings before merging new UI code. Existing warnings in ui-default are being burned down — do not add new ones.

## Allowlisted exceptions

A small set of files intentionally uses imperative DOM (hidden inputs, markdown HTML, tool host mounting). **Do not copy these patterns into new extensions.**

| File                   | Reason                                 |
| ---------------------- | -------------------------------------- |
| `render-markdown.ts`   | Renders sanitized markdown HTML        |
| `nuxy-tool-host.ts`    | Mounts tool custom elements at runtime |
| `nuxy-portal.ts`       | Reparents nodes to overlay containers  |
| `scroll-into-view.ts`  | Scroll helper (internal DOM walk)      |
| `gradient/gradient.ts` | Minified third-party WebGL bundle      |

## Tests and e2e

Playwright specs and unit tests **may** use `querySelector`, `appendChild`, and similar APIs to set up fixtures and assert rendered output. Keep imperative DOM out of production component code.

## Related docs

- [Development Guide §5.13](/extensions/development-guide#513-no-imperative-dom-manipulation) — normative ruleset
- [Lit Migration Guide](../../../rules/LIT_MIGRATION_GUIDE.md) — migrating off `replaceChildren()`
- [Extension Linter](/extensions/linting) — planned score penalties + ESLint today
- [Lit Renderer](/design/lit-renderer) — tool host and composition boundaries
