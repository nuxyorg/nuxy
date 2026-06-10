---
title: Frontend Extensions
---

# Frontend Extensions

How extension UIs render inside the launcher using the shared UI kit and Lit custom elements.

::: tip For extension authors
Start with [Frontend Structure](/extensions/frontend-structure) and [Your First Extension](/extensions/first-extension). This page describes the platform-level rendering model.
:::

## Shared UI kit

Extensions do not bundle their own component library. The `com.nuxy.ui-default` uikit extension registers factories on `window.UI` before the shell boots:

```typescript
const { List, ListItem, ListItemText, EmptyState, Button } = window.UI || {}

render() {
  return html`${List({ children: items })}`
}
```

`packages/ui` provides TypeScript stubs for autocomplete — the real DOM comes from `ui-default` at runtime.

## Rendering zones

### Provider results (Zone A)

Providers return JSON result objects. The shell formats them as list items in the omnibar dropdown — no full-screen UI.

The Calculator is the canonical example: type `2 + 2`, the `eval` channel returns `4`.

### Tool canvas (Zone B)

When a user activates a tool, the shell mounts its `nuxy-tool-*` Lit element via `<nuxy-tool-host>`. The element inherits the active theme's CSS custom properties automatically.

See [Lit Renderer](/design/lit-renderer) for the tool host and property forwarding model.

### Helper overlays (Zone C)

Helpers like `com.nuxy.gradient` claim composition slots (`background-layer`) instead of replacing the tool canvas. See [Lit Renderer § Composition](/design/lit-renderer#composition-layer-corecomposition).

## Keyboard and footer

Tools receive keyboard input through:

- The omnibar (`query` property) when visible
- `omniBar-keydown` window events when the omnibar is hidden

The shell footer shows contextual shortcut hints for the active tool. Tools register hints through the shell's footer API — never render standalone shortcut text in the tool body.

## Rules for extension frontends

| Rule                   | Why                                                    |
| ---------------------- | ------------------------------------------------------ |
| Use `window.UI` only   | Visual consistency across all extensions               |
| No custom `<input>`    | All text input comes through the omnibar               |
| Light DOM Lit elements | Theme tokens must reach the element tree               |
| Keyboard-first actions | Every action needs a key binding; clicks are secondary |
| Theme tokens only      | No hardcoded colors or pixel values                    |

## Related

- [Omni Input System](/design/omni-input-system) — provider vs tool routing
- [Frontend Structure](/extensions/frontend-structure) — file layout and controller pattern
- [Extension Access](/extensions/extension-access) — renderer APIs on `window.core`
