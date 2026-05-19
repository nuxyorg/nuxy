# Nuxy — Naming Consistency Report

Generated: 2026-05-19  
Scope: `src/electron/**/*.ts`, `src/renderer/**/*.tsx`, `packages/*/src/**/*.ts(x)`, `extensions/**/*.js`  
Excluded: `node_modules`, `.git`, `src/release`, `src/dist*`

---

## 1. "kernel" vs "core" as IPC target ID

**Problem**: The reserved IPC target used to call main-process built-ins is accepted under two different names — `'kernel'` and `'core'` — at two locations:
- `src/electron/ipc/validate.ts:43` — `if (id === 'kernel' || id === 'core')`
- `src/electron/ipc/register.ts:45` — `if (id === 'kernel' || id === 'core')`

All call sites (`src/renderer/App.tsx:17,52`, `extensions/shell/frontend.js:144-153`) already use `'kernel'` exclusively. The `'core'` alias is dead code that adds ambiguity.

**Impact**: Developers reading the code cannot tell which string is canonical. New call sites may accidentally use `'core'`, making routing logic harder to audit.  
**Proposed Fix**: Standardise on `'kernel'` as the sole reserved ID. Remove the `|| id === 'core'` branches and add a comment documenting the reserved value.  
**Risk Level**: Low (no call site uses `'core'`; change is two one-line removals)  
**Applied Automatically?**: No

---

## 2. `kernelLogger` name vs `@nuxy/core` package alias "core"

**Problem**: The package that vends the logger is named `@nuxy/core` and exposes `CoreContext`, yet the logger it exports is called `kernelLogger` (`packages/core/src/logger.ts:102`). The runtime bridge exposed to the renderer is also named `window.core` (preload). A first reader cannot tell whether `kernel` and `core` refer to the same concept or different layers.

**Impact**: Conceptual confusion between "the core package" and "the kernel runtime". This affects naming of future symbols.  
**Proposed Fix**: Pick one term project-wide. Current evidence favours **`kernel`** for the runtime IPC target/logger and **`core`** for the shared-types package — but make that split explicit in a single comment block in `packages/core/src/logger.ts` and `packages/core/src/host-channels.ts`.  
**Risk Level**: Low (documentation only; no rename needed)  
**Applied Automatically?**: No

---

## 3. Duplicate `ExtensionModule` interface

**Problem**: `ExtensionModule` is declared in two separate files with identical shapes:
- `packages/extension-sdk/src/index.ts:15` — `export interface ExtensionModule { register(core): void | Promise<void> }`
- `packages/extension-host/src/load-extension.ts:4` — `interface ExtensionModule { register?(core): void | Promise<void> }` (note: `register` is optional here vs required in SDK)

The subtle difference (`register?` vs `register`) means the host silently accepts modules that the SDK type would reject.

**Impact**: Type contract mismatch between consumer (SDK) and implementor (host). A bug waiting to happen.  
**Proposed Fix**: `load-extension.ts` should import `ExtensionModule` from `@nuxy/core` (or `@nuxy/extension-sdk`) instead of redeclaring it. The optional `register?` in the host can be handled by a local narrowing guard, not a separate interface.  
**Risk Level**: Medium  
**Applied Automatically?**: No

---

## 4. IPC channel name casing: `window:dragStart` (camelCase) vs `window:resize` (lowercase)

**Problem**: Electron IPC `ipcMain.on` channel names mix lowercase-after-colon and camelCase-after-colon:
- `'window:resize'`, `'window:hide'`, `'window:esc'`, `'window:center'` — all lowercase
- `'window:dragStart'`, `'window:dragMove'`, `'window:dragEnd'` — camelCase

Affected files: `src/electron/bootstrap/preload.ts:14-16`, `src/electron/ipc/register.ts:112,121,132`.

**Impact**: Inconsistency makes it harder to grep for all window channels and to remember exact channel names.  
**Proposed Fix**: Standardise on all-lowercase (or kebab) after the colon — e.g. `'window:drag-start'`, `'window:drag-move'`, `'window:drag-end'`. Update matching in both preload and register in the same commit.  
**Risk Level**: Low (fully internal; rename preload + main together)  
**Applied Automatically?**: No (must rename in preload.ts and register.ts simultaneously)

---

## 5. IPC push event uses dash separator while IPC request channels use colon

**Problem**: The event pushed from main → renderer uses `'window-show'` (dash):
- `src/electron/window/manager.ts:46` — `mainWindow?.webContents.send('window-show')`
- `src/electron/bootstrap/main.ts:54` — `win.webContents.send('window-show')`
- `src/electron/bootstrap/preload.ts:19` — `ipcRenderer.on('window-show', …)`

All request channels (renderer → main) use colon: `'window:resize'`, `'window:hide'`, etc.

**Impact**: Readers must remember that push events use `-` and request channels use `:`. No self-documenting pattern.  
**Proposed Fix**: Rename `'window-show'` to `'window:show'` to unify the separator in all window IPC names.  
**Risk Level**: Low (rename in manager.ts, main.ts, and preload.ts together; no external consumers)  
**Applied Automatically?**: No

---

## 6. Custom DOM event names mix `camelCase` and `kebab-case`

**Problem**: Custom `window.dispatchEvent` / `addEventListener` event names are inconsistent:
- `'nuxy-shell-reset'` — kebab-case (`extensions/shell/frontend.js:47`, `src/renderer/App.tsx:42`)
- `'omniBar-control'` — mixed camelCase+dash (`extensions/shell/frontend.js:90`, `extensions/clipboard/frontend.js:55`)
- `'omniBar-keydown'` — mixed (`extensions/shell/frontend.js:119`, `extensions/clipboard/frontend.js:142`)

**Impact**: The `omniBar-*` names are hard to type correctly; the dash-case names are conventional for CustomEvent but the mixed form is not.  
**Proposed Fix**: Use all-lowercase kebab-case for all custom DOM events: `'nuxy-shell-reset'` (already correct), `'omni-bar-control'`, `'omni-bar-keydown'`. Update both shell and clipboard extensions.  
**Risk Level**: Low (internal events between the two extensions; rename both sides)  
**Applied Automatically?**: No

---

## 7. CSS class namespace inconsistency: `nuxy-*` (packages/ui) vs no prefix (extensions/shell)

**Problem**: The `packages/ui` components use a `nuxy-` BEM prefix on all classes (e.g. `.nuxy-list-item`, `.nuxy-button`). The shell extension's CSS (`extensions/shell/shell.css`) uses no namespace prefix: `.app-container`, `.app-body`, `.omni-bar`, `.results-list`, `.results-item`, `.tool-loading`, `.tool-wrapper`.

**Impact**: The unprefixed shell classes can collide with any extension that happens to use the same common names (`.app-container`, `.results-list`, etc.).  
**Proposed Fix**: Prefix shell-specific classes with `nuxy-shell-` to match the `nuxy-` convention: e.g. `.nuxy-shell-container`, `.nuxy-shell-omni-bar`, `.nuxy-shell-results-list`.  
**Risk Level**: Medium (requires updating every className reference in `extensions/shell/frontend.js`)  
**Applied Automatically?**: No

---

## 8. BEM element separator inconsistency in `packages/ui` CSS

**Problem**: Most `packages/ui` components use the double-underscore BEM element separator (`__`) for children, e.g.:
- `nuxy-empty-state__title`, `nuxy-empty-state__message` (EmptyState/index.css)
- `nuxy-list-item-text__*` does not exist — `ListItemText` has no child elements
- `nuxy-list-item-meta__text` (ListItemMeta/index.css:7)

However `nuxy-shortcut-sep` in `ShortcutHint/index.css:9` is a **standalone class** for a child element of `ShortcutHint`, rather than `nuxy-shortcut-hint__sep`.

**Impact**: Minor — `ShortcutSep` is in the same file as `ShortcutHint` but its CSS class doesn't follow the parent-child `__` pattern.  
**Proposed Fix**: Rename `.nuxy-shortcut-sep` → `.nuxy-shortcut-hint__sep` and update the JSX in `ShortcutHint/index.tsx:13`.  
**Risk Level**: Low  
**Applied Automatically?**: No

---

## 9. All `packages/ui` component props typed as `any`

**Problem**: Every exported React component in `packages/ui/src/components/` uses `any` for its props type:
- `Button/index.tsx:4` — `{ children, className, variant, ...props }: any`
- `Badge/index.tsx:4`, `Card/index.tsx:4`, `Input/index.tsx:4`, `List/index.tsx:8`, `ListItem/index.tsx:4`, `ListItemBody/index.tsx:4`, `ListItemText/index.tsx:9`, `ListItemMeta/index.tsx:4`, `ListItemActions/index.tsx:4`, `Kbd/index.tsx:4`, `ShortcutBar/index.tsx:4`, `ShortcutHint/index.tsx:4` — all `any`

Only `EmptyState` has a real interface (`EmptyStateProps`, `EmptyState/index.tsx:4`).

**Impact**: Props are not checked by TypeScript. Consumers get no autocomplete. This is a significant maintainability gap for a shared component library.  
**Proposed Fix**: Replace `any` with a typed props interface (or `React.HTMLAttributes<HTMLElement>` intersection) per component, following the existing pattern in `EmptyState/index.tsx`.  
**Risk Level**: Medium (no runtime change; pure type improvement)  
**Applied Automatically?**: No

---

## 10. `RegistrySyncPayload` in `extension-host` duplicates fields from `ExtensionRuntimeMeta` in `core`

**Problem**:
- `packages/core/src/types.ts:28` — `interface ExtensionRuntimeMeta { ipcChannels: string[]; displayName?: string }`
- `packages/extension-host/src/core-proxy.ts:5` — `export interface RegistrySyncPayload { ipcChannels: string[]; displayName?: string }`

The two interfaces are structurally identical.

**Impact**: If one is updated the other silently diverges. `mergeRuntimeSync` in `registry.ts` already accepts `ExtensionRuntimeMeta`, so `RegistrySyncPayload` could simply be removed.  
**Proposed Fix**: Delete `RegistrySyncPayload` and type `getSyncPayload()` as returning `ExtensionRuntimeMeta` from `@nuxy/core`.  
**Risk Level**: Low  
**Applied Automatically?**: No

---

## Summary Table

| # | Issue | Files | Risk |
|---|-------|-------|------|
| 1 | `'kernel'` vs `'core'` dual IPC target alias | `validate.ts`, `register.ts` | Low |
| 2 | `kernelLogger` vs `window.core` conceptual split undocumented | `logger.ts`, `host-channels.ts` | Low |
| 3 | Duplicate `ExtensionModule` interface with divergent `register` optionality | `extension-sdk/index.ts`, `load-extension.ts` | Medium |
| 4 | IPC channel casing: `window:dragStart` vs `window:resize` | `preload.ts`, `register.ts` | Low |
| 5 | IPC push event `window-show` uses dash while request channels use colon | `manager.ts`, `main.ts`, `preload.ts` | Low |
| 6 | Custom DOM events: `omniBar-control` mixed case vs `nuxy-shell-reset` kebab | `shell/frontend.js`, `clipboard/frontend.js` | Low |
| 7 | Shell CSS has no namespace prefix, risk of collision with `nuxy-` prefix convention | `shell/shell.css`, `shell/frontend.js` | Medium |
| 8 | `nuxy-shortcut-sep` missing BEM `__` parent prefix | `ShortcutHint/index.css`, `ShortcutHint/index.tsx` | Low |
| 9 | All `packages/ui` component props typed as `any` (except `EmptyState`) | All `packages/ui/src/components/*/index.tsx` | Medium |
| 10 | `RegistrySyncPayload` duplicates `ExtensionRuntimeMeta` | `core-proxy.ts`, `types.ts` | Low |
