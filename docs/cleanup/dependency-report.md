# Dependency Audit Report

**Project**: nuxy (Electron + pnpm monorepo)
**Date**: 2026-05-19
**Audited by**: Dependency Cleanup Agent

---

## Summary

| Severity | Count |
|----------|-------|
| High     | 2     |
| Medium   | 5     |
| Low      | 4     |
| Total    | 11    |

---

## Findings

---

### 1. `@modelcontextprotocol/sdk` — Root `package.json` (production dep)

- **Problem**: Declared as a production dependency in `/package.json`. There are zero imports of `@modelcontextprotocol/sdk` anywhere in the entire codebase — not in `src/`, `packages/`, or `extensions/`.
- **Impact**: Unnecessarily pulled into the dependency graph for all workspace packages. Adds installation time, disk space, and exposes an unused MCP SDK surface. Bundled into production artifacts if the root `package.json` is considered by any bundler step.
- **Proposed Fix**: Remove `"@modelcontextprotocol/sdk": "^1.29.0"` from `/package.json` dependencies entirely. If MCP integration is planned for the future, add it to the specific package that will use it when the time comes.
- **Risk Level**: Low (removing an unused dep cannot break anything)
- **Applied Automatically?**: No

---

### 2. `@types/bun` — Root `package.json` (devDep)

- **Problem**: Declared as `"@types/bun": "^1.3.14"` in root devDependencies. No file in the project imports from `bun`, uses `Bun.*` APIs, or requires Bun runtime types. The grep matches that came up for "bun" in the codebase were for `seed-bundled.js` (a local file name) — unrelated to the Bun JavaScript runtime. The project uses Node.js (CI pins `node-version: '22'`) and pnpm.
- **Impact**: Bun's type declarations expose a global `Bun` namespace that can silently shadow or conflict with Node.js globals in TypeScript. Misleads contributors into thinking Bun is supported or required.
- **Proposed Fix**: Remove `"@types/bun": "^1.3.14"` from root `package.json` devDependencies.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 3. `typescript@^6.0.3` in root `package.json` — Non-existent version

- **Problem**: Root `package.json` declares `"typescript": "^6.0.3"` in devDependencies. TypeScript 6 does not exist as a published version (latest stable is 5.x as of this audit). The lockfile resolves this to `typescript@6.0.3` — which will fail on a clean install once pnpm validates the registry, or install a pre-release/RC build that is not intended for production use.
- **Impact**: High — any `pnpm install --frozen-lockfile` on a clean machine will fail or install an unstable TypeScript release. All workspace packages that inherit or depend on this resolution may receive broken type-checking.
- **Proposed Fix**: Downgrade to `"typescript": "^5.9.0"` (which is what the other packages use; the lockfile already resolves `typescript@5.9.3` for workspace packages). Alternatively, align to the same version constraint as `src/package.json`: `^5.0.2`.
- **Risk Level**: High
- **Applied Automatically?**: No

---

### 4. `vite-plugin-electron-renderer` — `src/package.json` (devDep, unused)

- **Problem**: `"vite-plugin-electron-renderer": "^0.14.0"` is declared in `src/package.json` devDependencies but is never imported anywhere. `src/vite.config.ts` only imports `vite-plugin-electron/simple` (the main plugin). The renderer plugin provides Node.js polyfilling for the renderer process; since the project does not use it, it is dead weight.
- **Impact**: Adds to install time and introduces a transitive dependency chain for no benefit. Can also cause confusion about whether the renderer is configured for Node.js compat mode.
- **Proposed Fix**: Remove `"vite-plugin-electron-renderer": "^0.14.0"` from `src/package.json` devDependencies.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 5. `typescript` duplication across all workspace packages

- **Problem**: `typescript` is declared individually as a devDependency in every internal package:
  - `/packages/core/package.json` — `^5.0.0`
  - `/packages/extension-host/package.json` — `^5.0.0`
  - `/packages/extension-sdk/package.json` — `^5.0.0`
  - `/packages/ui/package.json` — `^5.0.0`
  - `src/package.json` — `^5.0.2`
  - Root `package.json` — `^6.0.3` (different, see Finding 3)

  None of these packages compile independently (no `tsc` scripts, no build output — they expose raw `.ts` source files consumed directly by Vite via path aliases). TypeScript is only needed in `src/` for the Vite build and in the root tsconfig.

- **Impact**: pnpm must resolve and potentially install multiple copies. Version drift between packages (e.g., `^5.0.0` vs `^5.0.2`) can cause subtle tooling inconsistencies.
- **Proposed Fix**: Remove `typescript` from `devDependencies` in `packages/core`, `packages/extension-host`, `packages/extension-sdk`, and `packages/ui`. Hoist a single canonical version to the root devDependencies (e.g., `^5.9.0`). The root tsconfig and `src/` tsconfig already cover type-checking for the whole repo.
- **Risk Level**: Medium (removing devDeps from packages that don't build independently is safe, but verify no package-level `tsc` invocations exist)
- **Applied Automatically?**: No

---

### 6. `typescript` declared as a runtime dependency in `src/package.json` (misplaced dep classification)

- **Problem**: In `src/package.json`, `typescript` is in `devDependencies`. However, `src/electron/protocol/register.ts` dynamically imports it at runtime:
  ```ts
  ts = await import('typescript')
  ```
  This is used to transpile extension frontend files (`.tsx`/`.jsx`) on-the-fly via the `nuxy-ext://` custom protocol handler. If `typescript` is not bundled in the final packaged Electron app (electron-builder excludes devDependencies by default), this `import('typescript')` will throw at runtime and silently fall back to serving the raw file. The code already handles this gracefully with a `try/catch`, but it means the transpilation feature will silently not work in production builds.

- **Impact**: Medium — extension `.tsx`/`.jsx` frontends that rely on runtime transpilation will not work in packaged builds (only in dev). The fallback is intentional but may be unexpected for extension authors.
- **Proposed Fix**: Either (a) move `typescript` to `dependencies` in `src/package.json` so electron-builder includes it, or (b) document explicitly that `.tsx`/`.jsx` extension frontends require a development build. Option (a) increases package size but enables the feature in production.
- **Risk Level**: Medium
- **Applied Automatically?**: No

---

### 7. `@nuxy/extension-sdk` declared in `extensions/calculator` and `extensions/clipboard` but only used via JSDoc

- **Problem**: Both `extensions/calculator/package.json` and `extensions/clipboard/package.json` declare `"@nuxy/extension-sdk": "workspace:*"` as a runtime dependency. However, the actual files only use it in JSDoc type annotations:
  ```js
  /** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
  ```
  No runtime `import` or `require` statement is present in either extension's source code.

- **Impact**: Low — the workspace dep resolves within the monorepo so no external download occurs. However, it signals incorrect intent and may confuse tooling that distinguishes between runtime and type-only dependencies.
- **Proposed Fix**: Since these are plain JS extensions loaded at runtime (not bundled), no `package.json` dep is needed for JSDoc-only type annotations. The typedef comment works via editor tooling without a formal dependency. Consider removing the dependency, or if TypeScript checking of extension JS files is desired, move to `devDependencies`.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 8. `extensions/shell` — No `@nuxy/extension-sdk` dependency despite using the pattern

- **Problem**: `extensions/shell/package.json` declares no dependencies at all, yet `extensions/shell/frontend.js` is a full React component (JSX) that uses `window.React`, `window.core`, and complex UI patterns. Unlike `calculator` and `clipboard` which at least declare the SDK dep, `shell` declares nothing. This is inconsistent.

- **Impact**: Low for runtime (shell relies on globals injected by the host), but inconsistent with sibling extensions and could confuse contributors expecting `package.json` to reflect intent.
- **Proposed Fix**: Either add `"@nuxy/extension-sdk": "workspace:*"` (for parity with siblings) or document clearly in the shell extension's manifest/README that it uses host-injected globals and requires no bundling.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 9. Root `package.json` has `"main": "index.js"` pointing to a non-existent file

- **Problem**: `/package.json` declares `"main": "index.js"`. No `index.js` exists at the project root. The root package is a private workspace coordinator — it has no entrypoint.
- **Impact**: Low in practice (no consumer requires the root package directly), but it is incorrect metadata and can cause confusion.
- **Proposed Fix**: Remove the `"main": "index.js"` field from the root `package.json`. A private workspace root does not need a `main` entry.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

### 10. `vite@^4.4.5` is significantly outdated in `src/package.json`

- **Problem**: `src/package.json` pins `"vite": "^4.4.5"`. The lockfile resolves this to `vite@4.5.14`. The current stable Vite major is 7.x (vite 7.3.3 is also present in the lockfile as a transitive dep pulled by vitest 3.x). Vite 4.x reached end-of-life; it does not receive security patches.
- **Impact**: Medium — security vulnerabilities in Vite 4.x will not be patched. Additionally, `vite-plugin-electron@^0.28.0` may have already dropped Vite 4 compatibility; a mismatch can cause subtle build bugs that are hard to trace.
- **Proposed Fix**: Upgrade `"vite"` to `"^6.0.0"` or `"^7.0.0"` in `src/package.json`, and verify `vite-plugin-electron` and `@vitejs/plugin-react` versions are compatible. Test the full build (`pnpm build`) after the upgrade.
- **Risk Level**: Medium (upgrade requires testing)
- **Applied Automatically?**: No

---

### 11. `packages/core/package.json` missing `"name"` field exported in `exports`

- **Problem**: `packages/core/package.json` lacks an `"exports"` field and points `"main"` directly to `"src/index.ts"` (a TypeScript source file). All workspace consumers (`extension-host`, `extension-sdk`, `src/`) resolve `@nuxy/core` via Vite path aliases defined in `vite.config.ts` and `src/tsconfig.json`, bypassing the `package.json` entry point entirely. This works during development but means the published `package.json` is never actually used for resolution.

- **Impact**: Low now (monorepo with Vite aliases). If any tool tries to resolve `@nuxy/core` through standard Node.js module resolution (e.g., Jest, a standalone script, or a future CLI tool), it will receive a `.ts` file and fail.
- **Proposed Fix**: Either (a) add a proper `"exports"` field pointing to built JS output, or (b) accept the current setup and document that `@nuxy/core` is always consumed through Vite aliases. No action needed if the package will never be published or used outside Vite.
- **Risk Level**: Low
- **Applied Automatically?**: No

---

## Dependency Inventory by Package

### `/package.json` (root workspace)
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| `@modelcontextprotocol/sdk@^1.29.0` | dep | No | **Remove** |
| `@types/bun@^1.3.14` | devDep | No | **Remove** |
| `typescript@^6.0.3` | devDep | Indirectly (tsconfig) | **Fix version** (^5.9.0) |

### `/src/package.json` (nuxy-desktop)
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| `dbus-next@^0.10.2` | dep | Yes (mpris.ts, dynamic import) | OK |
| `@nuxy/core` | devDep | Yes | OK |
| `@nuxy/extension-host` | devDep | Yes (via Vite alias) | OK |
| `@nuxy/ui` | devDep | Yes | OK |
| `react@^18.2.0` | devDep | Yes | OK |
| `react-dom@^18.2.0` | devDep | Yes | OK |
| `@types/react@^18.2.15` | devDep | Yes | OK |
| `@types/react-dom@^18.2.7` | devDep | Yes | OK |
| `@vitejs/plugin-react@^4.0.3` | devDep | Yes (vite.config.ts) | OK |
| `electron@^42.1.0` | devDep | Yes | OK |
| `electron-builder@^25.1.8` | devDep | Yes (package script) | OK |
| `typescript@^5.0.2` | devDep | Yes (build + runtime transpile) | **Move to deps** (see Finding 6) |
| `vite@^4.4.5` | devDep | Yes | **Upgrade** (see Finding 10) |
| `vite-plugin-electron@^0.28.0` | devDep | Yes (vite.config.ts) | OK |
| `vite-plugin-electron-renderer@^0.14.0` | devDep | No | **Remove** |
| `vitest@^3.0.5` | devDep | Yes | OK |
| `@playwright/test@^1.51.0` | devDep | Yes (e2e tests) | OK |

### `/packages/core/package.json`
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| `typescript@^5.0.0` | devDep | No (no build step) | **Remove** (hoist to root) |

### `/packages/extension-host/package.json`
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| `@nuxy/core` | dep | Yes | OK |
| `typescript@^5.0.0` | devDep | No (no build step) | **Remove** (hoist to root) |

### `/packages/extension-sdk/package.json`
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| `@nuxy/core` | dep | Yes | OK |
| `typescript@^5.0.0` | devDep | No (no build step) | **Remove** (hoist to root) |

### `/packages/ui/package.json`
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| `react@^18.0.0` | peerDep | Yes | OK |
| `react-dom@^18.0.0` | peerDep | Yes | OK |
| `@types/react@^18.3.28` | devDep | Yes | OK |
| `typescript@^5.0.0` | devDep | No (no build step) | **Remove** (hoist to root) |

### `/extensions/calculator/package.json`
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| `@nuxy/extension-sdk` | dep | JSDoc-only | **Consider removing** (see Finding 7) |

### `/extensions/clipboard/package.json`
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| `@nuxy/extension-sdk` | dep | JSDoc-only | **Consider removing** (see Finding 7) |

### `/extensions/shell/package.json`
| Package | Type | Used? | Verdict |
|---------|------|-------|---------|
| *(none)* | — | — | **Consider adding SDK dep** for consistency (see Finding 8) |

---

## Prioritized Action List

1. **[High]** Fix `typescript@^6.0.3` in root `package.json` — version does not exist stably
2. **[High]** Move `typescript` to `dependencies` in `src/package.json` OR document production limitation (Finding 6)
3. **[Medium]** Remove `@modelcontextprotocol/sdk` from root `package.json`
4. **[Medium]** Remove `@types/bun` from root `package.json`
5. **[Medium]** Remove `vite-plugin-electron-renderer` from `src/package.json`
6. **[Medium]** Upgrade `vite` from `^4.4.5` to `^6.x` or `^7.x` in `src/package.json`
7. **[Low]** Remove per-package `typescript` devDeps from `packages/core`, `packages/extension-host`, `packages/extension-sdk`, `packages/ui`
8. **[Low]** Remove `"main": "index.js"` from root `package.json`
9. **[Low]** Clarify `@nuxy/extension-sdk` dep in extensions (calculator, clipboard, shell)
10. **[Low]** Add `"exports"` field to `packages/core/package.json` or document alias-only resolution
