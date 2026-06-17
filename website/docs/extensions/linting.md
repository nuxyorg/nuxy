---
title: Extension Linter
---

# Extension Linter

Extension quality is enforced in two layers today: **ESLint** (available now via `pnpm lint`) and a planned **`pnpm lint-ext`** scorer (beta).

## ESLint — DOM manipulation rules (available today)

Run from the repo root:

```bash
pnpm lint          # report
pnpm lint:fix      # auto-fix where possible
```

For `extensions/**/*.ts` (excluding tests and allowlisted files), ESLint emits **warnings** via `no-restricted-syntax` when code uses imperative DOM APIs:

| Rule                                 | Message                             |
| ------------------------------------ | ----------------------------------- |
| `.innerHTML =`                       | Use Lit `html\`\``and`<slot>`       |
| `.outerHTML =`                       | Use Lit templates                   |
| `document.createElement`             | Use Lit templates                   |
| `document.body.appendChild`          | Use `<nuxy-portal>`                 |
| `insertAdjacentHTML`                 | Use Lit templates                   |
| `replaceChildren`                    | Return `html\`\``from`render()`     |
| `querySelector` / `querySelectorAll` | Use `@query`, `ref()`, or templates |
| `this.appendChild`                   | Use Lit templates                   |

Allowlisted paths (imperative DOM is inherent to the mechanism):

- `render-markdown.ts` — sanitized markdown HTML builder
- `nuxy-tool-host.ts` — dynamic tool element mounting
- `nuxy-portal.ts` — reparents slotted nodes to overlay containers
- `scroll-into-view.ts` — scroll helper (internal DOM walk)
- `gradient/gradient.ts` — minified third-party WebGL bundle

Full rationale and examples: [DOM Manipulation Rules](/extensions/dom-manipulation) · Development Guide [§5.13](/extensions/development-guide#513-no-imperative-dom-manipulation).

---

## Planned: `pnpm lint-ext` (beta)

::: warning Beta
`pnpm lint-ext` is planned for the beta release. The sections below document the intended scoring behavior; the tool is not yet available.
:::

The **extension linter** (`pnpm lint-ext`) performs static analysis on a Nuxy extension and produces a quality score from 0 to 100. It enforces the rules in the [Development Guide](/extensions/development-guide) automatically, so problems surface before code review or shipping.

## Usage

```bash
# Lint a single extension
pnpm lint-ext <extension-name>

# Lint all bundled extensions
pnpm lint-ext --all

# Fail the process when score is below a threshold (useful in CI)
pnpm lint-ext <extension-name> --min-score 80

# Output machine-readable JSON
pnpm lint-ext <extension-name> --json
```

Exit code is `0` when no violations are found (score 100), `1` when violations exist.

## What Gets Checked

### Manifest (`manifest.json`)

| Check                                                                                  | Penalty       |
| -------------------------------------------------------------------------------------- | ------------- |
| Missing required field (`id`, `name`, `version`, `type`)                               | −15 per field |
| `id` does not match reverse-DNS format                                                 | −10           |
| `entry.element` does not match `nuxy-tool-<name>` pattern                              | −10           |
| `type` is not one of `tool`, `provider`, `orchestrator`, `theme`, `iconpack`, `helper` | −15           |
| `version` is not valid semver                                                          | −5            |

### Frontend files (`frontend.ts`, `controller.ts`, and any `.ts` not in `tests/`)

| Check                                                                                     | Penalty                     |
| ----------------------------------------------------------------------------------------- | --------------------------- |
| Inline SVG (`<svg` tag literal in template)                                               | −15                         |
| Hardcoded color (`#rgb`, `#rrggbb`, `rgba(`, `rgb(`, `hsl(`)                              | −10 per occurrence, max −20 |
| Hardcoded spacing / font size (`padding: '16px'`, `'margin-top': '8px'`)                  | −10 per occurrence, max −20 |
| Node.js built-in import (`import fs`, `import os`, `import path`, `import child_process`) | −20                         |
| `eval()` usage                                                                            | −25                         |
| Imperative DOM (`.innerHTML`, `createElement`, `querySelector`, `replaceChildren`, …)     | −15 per occurrence, max −30 |
| Lit `@property` or `@state` class-field initializer (`@property() label = ''`)            | −10 per occurrence          |
| File in a forbidden subfolder (`styles/`, `components/`, `hooks/`)                        | −5 per file                 |

### Backend (`backend.ts`)

| Check                                                         | Penalty |
| ------------------------------------------------------------- | ------- |
| Direct Node.js built-in import instead of `core.*` equivalent | −20     |
| No `register` export                                          | −20     |
| `eval()` usage                                                | −25     |

### Lit templates (via `lit-analyzer`)

The linter runs `lit-analyzer` and promotes its errors to violations:

| Severity  | Penalty        |
| --------- | -------------- |
| `error`   | −10 per error  |
| `warning` | −3 per warning |

## Score Breakdown

```
Extension: clipboard (com.nuxy.clipboard)

  Manifest ............. OK
  Frontend
    Hardcoded color ...... 2 violations  −20
    Lit property shadow .. 1 violation   −10
  Backend .............. OK
  Lit analyzer ......... 0 errors, 1 warning  −3

  Score: 67 / 100
  Status: NEEDS WORK (threshold: 80)
```

A score of **100** means no violations found. A score below **60** is considered a failing grade in CI.

## JSON Output

With `--json`, the linter outputs a structured report suitable for tooling and CI dashboards:

```json
{
  "extension": "clipboard",
  "id": "com.nuxy.clipboard",
  "score": 67,
  "pass": false,
  "violations": [
    {
      "file": "frontend.ts",
      "line": 42,
      "rule": "hardcoded-color",
      "message": "Hardcoded color '#ef4444' — use var(--color-danger)",
      "penalty": 10
    },
    {
      "file": "frontend.ts",
      "line": 88,
      "rule": "hardcoded-color",
      "message": "Hardcoded color 'rgba(0,0,0,0.2)' — use a theme token",
      "penalty": 10
    },
    {
      "file": "frontend.ts",
      "line": 55,
      "rule": "lit-property-shadow",
      "message": "@property() class-field initializer shadows the reactive property",
      "penalty": 10
    }
  ],
  "litAnalyzer": {
    "errors": 0,
    "warnings": 1
  }
}
```

## CI Integration

Add a lint step to your extension's CI workflow:

```yaml
# .github/workflows/ext-lint.yml
- name: Lint extension
  run: pnpm lint-ext clipboard --min-score 80
```

Or lint all bundled extensions at once:

```bash
pnpm lint-ext --all --min-score 80
```

## Fixing Common Violations

### Hardcoded colors

```ts
// Before (violation)
this.style.color = '#ef4444'

// After
this.style.color = 'var(--color-danger)'
```

Available tokens: `--color-danger`, `--color-success`, `--color-warning`, `--surface-overlay`, `--bg-base`, `--text-primary`, `--text-secondary`. See [Theme Tokens](/api/core-context#theme-tokens) for the full list.

### Inline SVG

```ts
// Before (violation)
html`<svg viewBox="0 0 24 24">…</svg>`

// After — use the icon system
html`<nuxy-icon name="search"></nuxy-icon>`
```

Register your icon in an icon pack extension, or use one of the built-in icons from `icons-default`.

### Imperative DOM

```ts
// Before (violation)
this.innerHTML = window.core.icons.get('search') ?? ''
const el = this.querySelector('.menu')

// After — declarative Lit
render() {
  return html`
    <nuxy-icon name="search"></nuxy-icon>
    <div class="menu">${this.renderItems()}</div>
  `
}
@query('.menu') private menuEl!: HTMLElement
```

See [DOM Manipulation Rules](/extensions/dom-manipulation).

### Lit property shadowing

```ts
// Before (violation)
@property({ type: String }) label = ''
@state() private _open = false

// After
@property({ type: String })
declare label: string

@state()
private declare _open: boolean
```

### Node.js imports in frontend

```ts
// Before (violation) — frontend runs in the browser
import path from 'path'

// After — path manipulation belongs in backend.ts
// Expose a channel instead: core.ipc.handle('resolvePath', ...)
```

## Disabling a Rule

In rare cases you may need to suppress a specific check. Add an inline comment:

```ts
const raw = dangerousUserData // nuxy-lint-disable-next-line unsafe-inner-html
element.innerHTML = sanitize(raw)
```

Suppressions are logged in the report and count against a "suppression penalty" of −2 each, so they do not inflate scores artificially.
