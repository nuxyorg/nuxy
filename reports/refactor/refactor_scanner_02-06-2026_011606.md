# Refactoring Assessment: scanner.ts

**Target**: `/home/xava/Documents/nuxy/src/electron/extensions/scanner.ts`
**Date**: 2026-06-02
**Analyst**: Claude Sonnet 4.6 (analysis-only — no source files were modified)

---

## 1. Executive Summary

| Attribute                                | Value                                                                                                                                                                                                                 |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total lines                              | 553                                                                                                                                                                                                                   |
| Exported functions                       | 5                                                                                                                                                                                                                     |
| Private functions                        | 3                                                                                                                                                                                                                     |
| Nested helper functions                  | 2 (`walk` inside `scanDirectoryForNodeImports`, `watchRecursive` inside `startExtensionWatcher`)                                                                                                                      |
| Import count                             | 16 statements                                                                                                                                                                                                         |
| Top-level `import.meta.env.DEV` branches | 2 (env-coupled logic)                                                                                                                                                                                                 |
| Security criticality                     | **HIGH** — validates cryptographic integrity, manages trusted keys, spawns Worker threads                                                                                                                             |
| Risk level for refactor                  | **MEDIUM-HIGH** — the security pipeline in `scanExtensions` has no integration tests covering the full 4-step verification flow, only individual unit tests for `detectNodeImports` and happy-path directory scanning |
| Estimated effort                         | 3–5 dev-days (test hardening first, then extractions)                                                                                                                                                                 |

The file is the security gateway for all third-party code execution in Nuxy. Its primary risk as a refactoring target is not code complexity per se — it is that the security pipeline (`verifyDirectoryIntegrity` → `isRevoked` → `isKeyTrusted` → `makeDirectoryReadOnly`) has no test coverage for its negative branches (revoked extension, untrusted key, integrity mismatch). Any extraction that changes how these branches interact introduces regression risk with no test safety net.

A secondary structural problem is that `scanExtensions()` performs two conceptually distinct jobs (Phase A: extract/verify/secure; Phase B: load/register/spawn) inside a single 314-line async function. These phases are tightly sequential by design (Phase B reads what Phase A wrote), but each is independently testable.

---

## 2. Full Function Inventory

| #   | Function name                 | Exported | Lines (start–end) | Line count | Complexity notes                        |
| --- | ----------------------------- | -------- | ----------------- | ---------- | --------------------------------------- |
| 1   | `detectNodeImports`           | yes      | 56–98             | 43         | 3 regex loops; CC ≈ 7                   |
| 2   | `scanDirectoryForNodeImports` | yes      | 100–148           | 49         | Recursive `walk` nested inside; CC ≈ 19 |
| 3   | `rescanExtensions`            | yes      | 153–161           | 9          | CC ≈ 1 — thin orchestrator              |
| 4   | `clearWatchers`               | no       | 163–170           | 8          | CC ≈ 2                                  |
| 5   | `startExtensionWatcher`       | no       | 172–216           | 45         | `watchRecursive` nested inside; CC ≈ 10 |
| 6   | `promptTrustPublisherKey`     | no       | 218–237           | 20         | Dialog / env guard; CC ≈ 3              |
| 7   | `scanExtensions`              | yes      | 239–553           | **315**    | 6 logical phases; CC ≈ 79               |

**Total callable logic lines** (excluding blank lines and comments): ~380

### Module-level declarations (not functions)

| Name                  | Lines | Purpose                                                           |
| --------------------- | ----- | ----------------------------------------------------------------- |
| `ALLOWED_PERMISSIONS` | 38–49 | Allowlist set for manifest permission strings                     |
| `BUILTIN_LIST`        | 51–54 | Set of all Node built-in module names + `node:` prefixed variants |
| `watchDebounce`       | 150   | Debounce timer handle for file watcher                            |
| `activeWatchers`      | 151   | Set of active `fs.FSWatcher` instances                            |

---

## 3. The Type-Dispatch If/Else Chain (Lines 460–508)

The chain sits inside the Phase B registration loop of `scanExtensions`, operating on `manifest.type`. There are 6 explicit branches plus 2 implicit fall-through conditions, giving effectively 8 logical paths:

| Branch # | Condition                                                                      | Action                                                                                                 |
| -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| 1        | `manifest.type === 'theme' && manifest.entry?.theme`                           | Load `ThemeDefinition` JSON from `entry.theme`, call `registerExtensionTheme(def)`. No worker spawned. |
| 2        | `manifest.type === 'iconpack' && manifest.entry?.icons`                        | Load `IconPackDefinition` JSON from `entry.icons`, call `registerIconPack(def)`. No worker spawned.    |
| 3        | `manifest.type === 'uikit'`                                                    | Validate `entry.frontend` presence (warn if missing). No worker spawned.                               |
| 4        | `manifest.type === 'helper'`                                                   | If `entry.backend` exists: call `spawnExtension()`. Otherwise: log as frontend-only.                   |
| 5        | `manifest.entry?.backend` (catch-all for `tool` / `provider` / `orchestrator`) | Call `spawnExtension()`.                                                                               |
| 6        | `manifest.type !== 'theme' && manifest.type !== 'iconpack'` (else)             | Warn: "no backend entry — skipping worker."                                                            |
| 7        | Implicit: `type === 'theme'` but `!entry?.theme`                               | Falls through to branch 5 or 6 depending on backend.                                                   |
| 8        | Implicit: `type === 'iconpack'` but `!entry?.icons`                            | Falls through to branch 5 or 6 depending on backend.                                                   |

**Observation**: Branch 7 and 8 are accidental fall-throughs caused by using `&&` to guard both `type` and `entry` field simultaneously. A `theme` extension with no `entry.theme` would silently fall to branch 5/6. This is a latent bug: it should be: check type first, then check required entry field, otherwise throw.

---

## 4. `scanExtensions()` Logic Flow (315 lines)

The function runs 6 sequential phases. No early return except the trust-rejection abort at line 352.

### Phase 1 — Initialization (lines 239–270, ~32 lines)

1. Clear registries (`clearRegistry`, `clearExtensionThemes`, `clearIconRegistry`).
2. Await `updateRevocationList()` (fails silently).
3. Load `stateCache` (HMAC-verified JSON from disk).
4. Initialize `EXTRACTED_DIR` if absent.
5. Conditional: in production, call `seedBundledExtensions()` and ensure `EXTENSION_DIR` exists.

### Phase 2 — Extraction / Verification Loop (lines 271–388, ~118 lines)

Iterates over every item in `EXTENSION_DIR`:

1. Stat each item; skip if not `.nuxyext` file or directory.
2. Derive `folderName` by stripping `.nuxyext` suffix.
3. If `.nuxyext`, compute SHA-256 hash of the zip file.
4. Check `stateCache` — if hash matches and `targetPath` exists, skip verification (cache hit).
5. Create temp directory `.tmp_<folderName>`.
6. Extract zip (AdmZip) or copy directory to temp path.
7. **Security Step 1**: `verifyDirectoryIntegrity(tempPath)` — cryptographic hash + signature check. On failure: delete temp, `continue`.
8. **Security Step 2**: Check `isRevoked(folderName, hash, publicKey)`. On revoked: delete temp, `continue`.
9. **Security Step 3**: `isKeyTrusted(publicKey)`. If not trusted: prompt user via `promptTrustPublisherKey()`. If approved: add key, schedule `rescanExtensions()` in 100ms, delete temp, `return` (aborts scan). If rejected: delete temp, `continue`.
10. Move temp folder to final `targetPath` (restoring write permissions on existing path first).
11. **Security Step 4**: `makeDirectoryReadOnly(targetPath)` — chmod 0o555 recursively.
12. Update `newStateCache`, add to `activeFolders`.

### Phase 3 — Stale Cleanup (lines 390–401, ~12 lines)

Reads `EXTRACTED_DIR`, removes any directory not in `activeFolders` (including leftover `.tmp_` dirs).

### Phase 4 — Cache Persistence (lines 403–404, 2 lines)

Calls `saveStateCache(newStateCache)` — writes HMAC-signed JSON.

### Phase 5 — Registration Scan (lines 406–548, ~143 lines)

Iterates over `EXTRACTED_DIR` (now cleaned):

1. Skip hidden/temp folders (`.startsWith('.')`).
2. Skip non-directories.
3. Skip items with no `manifest.json`.
4. Parse manifest JSON.
5. Validate `permissions` array (allowlist check).
6. Scan all JS/TS files for forbidden Node built-in imports (`scanDirectoryForNodeImports`).
7. Resolve `extId` (`manifest.id` or fallback to `folderName`).
8. Build `LoadedExtension` object.
9. **Type dispatch** (8-branch chain, see Section 3).
10. Load `settings.json` schema if `entry.settings` declared.
11. Validate locale files presence if `manifest.locales` declared.
12. Call `registerExtension(loaded)`.

### Phase 6 — Finalization (lines 550–553, 4 lines)

Log scan completion. Call `startExtensionWatcher()` (dev mode only).

---

## 5. Complexity Metrics

| Function                      | Decision points (if/else/for/while/catch/&&/ |        | )     | Cyclomatic Complexity (CC = D+1) | Max nesting depth (approx) |
| ----------------------------- | -------------------------------------------- | ------ | ----- | -------------------------------- | -------------------------- |
| `detectNodeImports`           | 6                                            | 7      | 3     |
| `scanDirectoryForNodeImports` | 18                                           | 19     | 4     |
| `rescanExtensions`            | 1                                            | 2      | 1     |
| `clearWatchers`               | 2                                            | 3      | 2     |
| `startExtensionWatcher`       | 9                                            | 10     | 4     |
| `promptTrustPublisherKey`     | 2                                            | 3      | 2     |
| `scanExtensions`              | **78**                                       | **79** | **7** |

The raw CC of 79 for `scanExtensions` is extremely high. Industry guidance flags functions above CC=10 for review and above CC=25 for mandatory refactoring. At CC=79 with max nesting depth 7 (measured by leading-spaces / 2), the function is effectively untestable in isolation and extremely difficult to reason about in a security audit.

The nesting depth of 7 occurs in the `restoreWritable` recursive lambda inside the "move temp to final" block (lines 364–373).

---

## 6. Security-Sensitive Sections

### 6.1 Path Traversal Vulnerability (HIGH RISK — UNMITIGATED)

**Location**: Lines 461, 472, 497, 504, 511, 528 — all use `path.join(itemPath, manifest.entry.X)` where `manifest.entry.X` comes directly from `manifest.json` with no sanitization.

**Attack**: A malicious extension could set `entry.backend: "../../some-other-extension/backend.js"` in its manifest. `path.join` does NOT prevent this — it will resolve the `..` traversals. The Worker would then load code from outside the intended extension directory.

**Current mitigations**: None. The path is not checked with `path.resolve()` and `startsWith(itemPath)` after resolution.

**Same issue applies to**: `entry.theme`, `entry.icons`, `entry.settings`, `locales.dir`.

### 6.2 Cryptographic Integrity Pipeline (Well-Structured, Some Gaps)

The 4-step security pipeline (integrity check → revocation → key trust → read-only) is sound in structure. Specific observations:

- `verifyDirectoryIntegrity` correctly recomputes the hash independently and checks per-file hashes + RSA signature.
- `isRevoked` checks by extension ID, hash, and key hash — good coverage.
- `makeDirectoryReadOnly` (0o555) is applied correctly after extraction.
- **Gap**: The state cache (`extensions-state.json`) is HMAC-signed, but the HMAC key is stored on the same filesystem as the cache (`state-secret.key`). This provides integrity against accidental corruption but not against a local attacker with filesystem write access.

### 6.3 Race Condition in Trust Flow (MEDIUM RISK)

**Location**: Lines 344–358 — when a new key is trusted, the function calls `setTimeout(() => rescanExtensions(), 100)` then returns early. During the 100ms gap, `EXTRACTED_DIR` contains the temp folder from the current scan (already deleted at line 352), but the `EXTENSION_DIR` item still exists. The next scan will re-process it cleanly. This is the intended behavior, but the 100ms timeout is fragile; a very slow disk could cause the rescan to start before the `rmSync` at line 352 completes (though in practice the rmSync is synchronous, so the risk is theoretical).

### 6.4 `promptTrustPublisherKey` Test Bypass (DELIBERATE, DOCUMENT)

**Location**: Lines 219–221 — `if (process.env.NODE_ENV === 'test') return true`. This is intentional for CI, but it means all security tests run with every key trusted. No test exercises the key-rejection path.

### 6.5 Manifest `id` Field Not Sanitized

**Location**: Line 449 — `const extId = manifest.id || folderName`. No validation that `manifest.id` is a valid extension ID format (e.g., reverse-DNS). An extension could declare `id: "kernel"` and potentially shadow kernel dispatch in `register.ts` (line 68: `if (id === 'kernel')`). This is worth guarding.

### 6.6 `scanDirectoryForNodeImports` Regex-Based (MEDIUM CONFIDENCE)

The Node import scanner uses three regexes on comment-stripped source. Comment stripping is done with simple regex (not a real parser), so obfuscated imports using template literals (`require(\`${'fs'}\`)`) or dynamic concatenation would not be caught. This is a best-effort heuristic, not a hard guarantee.

---

## 7. Duplication Identified

### `restoreWritable` Lambda

Defined inline twice:

- `scanner.ts` lines 364–371 (inside the extraction loop)
- `register.ts` lines 249–256 (inside the `uninstallExtension` IPC handler)

Both implementations are byte-identical. This utility belongs in a shared security utility module, e.g., `src/electron/security/fs-utils.ts`.

---

## 8. Proposed Extractions

### 8.1 Extract `verifyAndExtractItem(itemName, stateCache)` → returns `{ folderName, zipHash? } | null`

**What it would contain**: The entire inner body of the Phase 2 extraction loop (lines 279–387): stat check, zip hash computation, cache hit detection, temp dir creation, extraction, `verifyDirectoryIntegrity`, `isRevoked`, `isKeyTrusted`/`promptTrustPublisherKey`, temp-to-final move, `makeDirectoryReadOnly`.

**Returns**: `{ folderName, zipHash }` on success, `null` on any security failure, or a special sentinel `{ aborted: true }` when a rescan was scheduled.

**BEFORE sketch** (current state in scanExtensions):

```typescript
for (const itemName of items) {
  const itemPath = path.join(EXTENSION_DIR, itemName)
  try {
    const stat = fs.statSync(itemPath)
    // ... 100 lines ...
    activeFolders.add(folderName)
  } catch (err) {
    log.error(`Failed to process extension item ${itemName}:`, err)
  }
}
```

**AFTER sketch**:

```typescript
for (const itemName of items) {
  const result = await verifyAndExtractItem(itemName, stateCache, newStateCache)
  if (!result) continue
  if ('aborted' in result) return // trust-prompt triggered rescan
  activeFolders.add(result.folderName)
}
```

**Benefit**: Phase 2's security steps become independently unit-testable. The function has a single responsibility: take one EXTENSION_DIR item, verify it, place it in EXTRACTED_DIR.

---

### 8.2 Extract `loadExtensionFromDir(folderName, itemPath)` → returns `LoadedExtension | null`

**What it would contain**: The inner body of Phase 5's registration loop (lines 426–547): manifest parse, permission validation, Node import scan, `extId` resolution, `LoadedExtension` construction, settings schema load, locale validation, `registerExtension` call.

**BEFORE sketch**:

```typescript
for (const folderName of extractedItems) {
  // guards...
  try {
    const manifest = JSON.parse(...)
    // ... 120 lines ...
    registerExtension(loaded)
  } catch (e) {
    log.error(`Failed to load extension "${folderName}"`, e)
  }
}
```

**AFTER sketch**:

```typescript
for (const folderName of extractedItems) {
  if (folderName.startsWith('.')) continue
  const itemPath = path.join(EXTRACTED_DIR, folderName)
  if (!fs.statSync(itemPath).isDirectory()) continue
  try {
    await loadExtensionFromDir(folderName, itemPath)
  } catch (e) {
    log.error(`Failed to load extension "${folderName}"`, e)
  }
}
```

**Benefit**: `loadExtensionFromDir` has no async I/O dependencies beyond the file system — it becomes straightforwardly unit-testable with a fake directory structure.

---

### 8.3 Replace Type-Dispatch If/Else with Strategy Map

**What it would contain**: Convert the 8-branch chain (lines 460–508) into a typed handler map.

**BEFORE sketch** (current):

```typescript
if (manifest.type === 'theme' && manifest.entry?.theme) {
  // theme handler
} else if (manifest.type === 'iconpack' && manifest.entry?.icons) {
  // iconpack handler
} else if (manifest.type === 'uikit') {
  // uikit handler
} else if (manifest.type === 'helper') {
  // helper handler
} else if (manifest.entry?.backend) {
  // generic tool/provider/orchestrator handler
} else if (manifest.type !== 'theme' && manifest.type !== 'iconpack') {
  // warn: no backend
}
```

**AFTER sketch**:

```typescript
type TypeHandler = (
  extId: string,
  folderName: string,
  manifest: ExtensionManifest,
  itemPath: string
) => void

const TYPE_HANDLERS: Partial<Record<string, TypeHandler>> = {
  theme: handleThemeExtension,
  iconpack: handleIconpackExtension,
  uikit: handleUikitExtension,
  helper: handleHelperExtension,
}

function dispatchExtensionType(
  extId: string,
  folderName: string,
  manifest: ExtensionManifest,
  itemPath: string
): void {
  const handler = TYPE_HANDLERS[manifest.type ?? '']
  if (handler) {
    handler(extId, folderName, manifest, itemPath)
  } else if (manifest.entry?.backend) {
    spawnExtension(extId, folderName, manifest.entry.backend, manifest.permissions ?? [])
    log.info(`Sandboxed worker started for: ${extId}`)
  } else {
    log.warn(`Extension "${extId}" has no backend entry — skipping worker.`)
  }
}
```

**Note on implicit fall-through bug**: The strategy map naturally eliminates the accidental fall-through for `type === 'theme'` with no `entry.theme` — the `handleThemeExtension` function would explicitly check for `entry.theme` and throw or warn, rather than silently falling to the generic backend handler.

---

### 8.4 Extract `restoreWritable` as a Shared Utility

**Target file**: `src/electron/security/fs-utils.ts` (new file, or appended to `sign-tool.ts`)

**BEFORE**: Identical inline lambdas in `scanner.ts:364` and `register.ts:249`.

**AFTER**:

```typescript
// src/electron/security/fs-utils.ts
export function restoreWritable(p: string): void {
  try {
    fs.chmodSync(p, 0o755)
    if (fs.statSync(p).isDirectory()) {
      for (const item of fs.readdirSync(p)) restoreWritable(path.join(p, item))
    }
  } catch {}
}
```

Both call sites import and use the shared function.

---

### 8.5 Add Path Traversal Guard (SECURITY FIX, not pure refactor)

This is a security fix that should accompany any refactor, not be deferred:

```typescript
function resolveEntryPath(itemPath: string, entryRelative: string): string | null {
  const resolved = path.resolve(itemPath, entryRelative)
  if (!resolved.startsWith(itemPath + path.sep) && resolved !== itemPath) {
    log.error(`Path traversal detected: entry "${entryRelative}" escapes extension directory`)
    return null
  }
  return resolved
}
```

This guard must wrap every `path.join(itemPath, manifest.entry.X)` call in Phase 5.

---

## 9. Test Coverage Gap Analysis

| Scenario                                                 | Currently tested?         | Risk               |
| -------------------------------------------------------- | ------------------------- | ------------------ |
| `detectNodeImports` — ES import, require, dynamic import | YES (6 unit tests)        | Low                |
| `scanDirectoryForNodeImports` (full walk)                | NO                        | Medium             |
| `rescanExtensions`                                       | NO                        | Low (thin wrapper) |
| `startExtensionWatcher`                                  | NO                        | Low (dev-only)     |
| `promptTrustPublisherKey` — trust path                   | NO (bypassed in test env) | High               |
| `promptTrustPublisherKey` — reject path                  | NO                        | High               |
| Phase 2: `verifyDirectoryIntegrity` failure path         | NO                        | **Critical**       |
| Phase 2: `isRevoked` = true path                         | NO                        | **Critical**       |
| Phase 2: `isKeyTrusted` = false, user approves           | NO                        | **Critical**       |
| Phase 2: `isKeyTrusted` = false, user rejects            | NO                        | **Critical**       |
| Phase 2: stale cache used (cache hit)                    | NO                        | High               |
| Phase 2: zip extraction (AdmZip path)                    | NO                        | High               |
| Phase 5: permission validation failure                   | NO                        | High               |
| Phase 5: Node import scan violation                      | NO                        | High               |
| Phase 5: `theme` type loading                            | NO                        | Medium             |
| Phase 5: `iconpack` type loading                         | NO                        | Medium             |
| Phase 5: `helper` type with/without backend              | NO                        | Medium             |
| Phase 5: locale file validation                          | NO                        | Low                |
| Stale folder cleanup                                     | YES (2 test cases)        | Low                |
| `.tmp_` folder ignored in registration                   | YES (1 test case)         | Low                |
| Path traversal in `entry.*` fields                       | NO                        | **Critical**       |
| `manifest.id = "kernel"` injection                       | NO                        | High               |

**Summary**: Of ~20 meaningful test scenarios, only 4 are currently covered (all in the happy-path directory scan group). The 6 most security-critical scenarios have zero coverage.

---

## 10. Risk Matrix

| Risk                                                                    | Likelihood                                    | Impact                            | Priority |
| ----------------------------------------------------------------------- | --------------------------------------------- | --------------------------------- | -------- |
| Path traversal via `entry.*` manifest fields                            | Medium (signed extension could still exploit) | Critical (arbitrary Worker load)  | **P0**   |
| Missing tests for security pipeline negative paths                      | High (no test = unknown regression)           | Critical (silent security bypass) | **P0**   |
| `manifest.id = "kernel"` injection                                      | Low (requires compromised signing key)        | High (IPC routing confusion)      | **P1**   |
| Accidental fall-through in type dispatch (theme/iconpack without entry) | Low                                           | Medium (wrong handler invoked)    | **P1**   |
| `restoreWritable` duplication diverging                                 | Low                                           | Medium (inconsistent permissions) | **P2**   |
| `scanExtensions` CC=79 — future changes introduce undetected bugs       | Certain (long-term)                           | High                              | **P2**   |
| Regex-based Node import scan bypass (obfuscated imports)                | Low                                           | High                              | **P2**   |
| State cache secret co-located with cache file                           | Low                                           | Medium                            | **P3**   |
| 100ms trust-rescan timeout fragility                                    | Very Low                                      | Low                               | **P3**   |

---

## 11. Step-by-Step Execution Plan

### Phase 0 — Safety (Do First, No Source Changes to scanner.ts)

**Step 0.1** — Write integration tests for the security pipeline negative paths BEFORE any refactoring. These tests must pass before and after all refactoring steps:

- `verifyDirectoryIntegrity` returns `success: false` → extension is skipped, temp cleaned up
- `isRevoked` returns `true` → extension is skipped, temp cleaned up
- `isKeyTrusted` returns `false`, user approves → `addTrustedKey` called, rescan scheduled
- `isKeyTrusted` returns `false`, user rejects → extension blocked, temp cleaned up
- Stale cache (hash mismatch) → re-extraction triggered

**Step 0.2** — Write tests for manifest validation failures:

- `permissions` not an array → caught, extension skipped
- Invalid permission string → caught, extension skipped
- `scanDirectoryForNodeImports` finds violation → caught, extension skipped

**Step 0.3** — Write path traversal tests:

- `entry.backend = "../../evil.js"` → should be blocked (currently it is NOT — this test will FAIL, revealing the bug)

**Step 0.4** — Add `manifest.id` validation tests:

- `id = "kernel"` or `id = ""` → should be blocked or normalized

---

### Phase 1 — Security Fix (P0, Before Refactoring)

**Step 1.1** — Implement `resolveEntryPath(itemPath, entryRelative): string | null` in a utility location.

**Step 1.2** — Apply `resolveEntryPath` guard to all 6 `path.join(itemPath, manifest.entry.X)` call sites in Phase 5.

**Step 1.3** — Add `manifest.id` format validation (e.g., must match `/^[a-z0-9][a-z0-9.-]*$/i`, must not equal `"kernel"`).

**Step 1.4** — Run all tests. The path traversal tests from Step 0.3 must now pass.

---

### Phase 2 — Extract Shared Utility (P2, Low Risk)

**Step 2.1** — Create `src/electron/security/fs-utils.ts` with exported `restoreWritable(p: string): void`.

**Step 2.2** — Replace the inline lambda in `scanner.ts:364` with an import of `restoreWritable`.

**Step 2.3** — Replace the inline lambda in `register.ts:249` with the same import.

**Step 2.4** — Run tests. No behavior change expected.

---

### Phase 3 — Type Dispatch Refactor (P1, Contained Risk)

**Step 3.1** — Write targeted tests for each type branch (theme, iconpack, uikit, helper with/without backend, generic with/without backend, fallthrough bug) BEFORE changing the dispatch code.

**Step 3.2** — Extract private handler functions: `handleThemeExtension`, `handleIconpackExtension`, `handleUikitExtension`, `handleHelperExtension` at the module level in `scanner.ts`.

**Step 3.3** — Build the `TYPE_HANDLERS` map and `dispatchExtensionType` function.

**Step 3.4** — Replace the if/else chain in Phase 5 with a call to `dispatchExtensionType`.

**Step 3.5** — Fix the implicit fall-through bug in `handleThemeExtension` and `handleIconpackExtension` (validate required entry fields, warn explicitly instead of silently falling through).

**Step 3.6** — Run all tests. All type-dispatch tests from Step 3.1 must pass.

---

### Phase 4 — Extract `verifyAndExtractItem` (P2, High Complexity Reduction)

**Step 4.1** — Write unit tests for the extraction function in isolation: cache hit, zip extraction, dir copy, integrity failure, revocation failure, key rejection, key approval+rescan.

**Step 4.2** — Extract function `verifyAndExtractItem(itemName: string, stateCache: Record<string, string>, newStateCache: Record<string, string>): Promise<{ folderName: string; zipHash?: string } | { aborted: true } | null>`.

**Step 4.3** — Replace the Phase 2 loop body in `scanExtensions` with a call to `verifyAndExtractItem`.

**Step 4.4** — Run all tests (including the new Step 4.1 tests and the Phase 0 security tests).

---

### Phase 5 — Extract `loadExtensionFromDir` (P2, High Complexity Reduction)

**Step 5.1** — Write unit tests for the registration function: valid manifest, invalid permissions, Node import violation, each extension type, settings schema load, locale validation.

**Step 5.2** — Extract function `loadExtensionFromDir(folderName: string, itemPath: string): void`. This function should contain Phase 5's inner try block.

**Step 5.3** — Replace the Phase 5 loop body in `scanExtensions` with a call to `loadExtensionFromDir`.

**Step 5.4** — Run full test suite. `scanExtensions` should now be ~60 lines covering only orchestration.

---

### Phase 6 — Final Validation

**Step 6.1** — Run `pnpm -C src test` — all tests green.

**Step 6.2** — Run `pnpm -C src typecheck` — no type errors.

**Step 6.3** — Run `pnpm dev` and manually install a test extension to verify the full pipeline works end-to-end.

**Step 6.4** — Re-measure CC of the refactored `scanExtensions`. Target: CC < 15.

---

## 12. TodoWrite-Compatible Task List (JSON)

```json
[
  {
    "id": "scanner-r00-security-tests",
    "title": "Write integration tests for security pipeline negative paths",
    "priority": "P0",
    "phase": 0,
    "file": "src/electron/extensions/scanner.test.ts",
    "notes": "Cover: integrity failure, revocation, key-reject, key-approve+rescan, stale cache. These tests define the refactoring safety net."
  },
  {
    "id": "scanner-r01-manifest-validation-tests",
    "title": "Write tests for manifest validation failures",
    "priority": "P0",
    "phase": 0,
    "file": "src/electron/extensions/scanner.test.ts",
    "notes": "Invalid permissions array, unknown permission string, Node import violation caught."
  },
  {
    "id": "scanner-r02-path-traversal-tests",
    "title": "Write path traversal attack tests (expected to FAIL initially)",
    "priority": "P0",
    "phase": 0,
    "file": "src/electron/extensions/scanner.test.ts",
    "notes": "Test entry.backend='../../evil.js' and similar. These will fail until Step 1.1."
  },
  {
    "id": "scanner-r03-manifest-id-tests",
    "title": "Write manifest.id injection tests",
    "priority": "P1",
    "phase": 0,
    "file": "src/electron/extensions/scanner.test.ts",
    "notes": "id='kernel', id='', id with path separators should be blocked."
  },
  {
    "id": "scanner-r10-resolve-entry-path",
    "title": "Implement resolveEntryPath() path traversal guard",
    "priority": "P0",
    "phase": 1,
    "file": "src/electron/extensions/scanner.ts",
    "notes": "New private function. Must wrap all 6 manifest entry path joins in Phase 5."
  },
  {
    "id": "scanner-r11-manifest-id-validation",
    "title": "Add manifest.id format validation",
    "priority": "P1",
    "phase": 1,
    "file": "src/electron/extensions/scanner.ts",
    "notes": "Regex check, reject 'kernel', reject empty string."
  },
  {
    "id": "scanner-r20-shared-restore-writable",
    "title": "Extract restoreWritable to src/electron/security/fs-utils.ts",
    "priority": "P2",
    "phase": 2,
    "file": "src/electron/security/fs-utils.ts",
    "notes": "New file. Replace inline lambdas in scanner.ts:364 and register.ts:249."
  },
  {
    "id": "scanner-r30-type-dispatch-tests",
    "title": "Write unit tests for all type-dispatch branches",
    "priority": "P1",
    "phase": 3,
    "file": "src/electron/extensions/scanner.test.ts",
    "notes": "One test per branch including fallthrough bug (theme without entry.theme)."
  },
  {
    "id": "scanner-r31-type-handlers",
    "title": "Extract private type handler functions from scanExtensions if/else chain",
    "priority": "P1",
    "phase": 3,
    "file": "src/electron/extensions/scanner.ts",
    "notes": "handleThemeExtension, handleIconpackExtension, handleUikitExtension, handleHelperExtension."
  },
  {
    "id": "scanner-r32-strategy-map",
    "title": "Replace if/else chain with TYPE_HANDLERS strategy map",
    "priority": "P1",
    "phase": 3,
    "file": "src/electron/extensions/scanner.ts",
    "notes": "dispatchExtensionType() as the new call site in Phase 5."
  },
  {
    "id": "scanner-r33-fix-fallthrough-bug",
    "title": "Fix implicit fallthrough bug in theme/iconpack handlers",
    "priority": "P1",
    "phase": 3,
    "file": "src/electron/extensions/scanner.ts",
    "notes": "handleThemeExtension must warn/skip if entry.theme is missing, not silently fall to generic backend handler."
  },
  {
    "id": "scanner-r40-verify-extract-tests",
    "title": "Write unit tests for verifyAndExtractItem in isolation",
    "priority": "P2",
    "phase": 4,
    "file": "src/electron/extensions/scanner.test.ts",
    "notes": "Cache hit, zip extract, dir copy, integrity failure, revocation, key approve, key reject."
  },
  {
    "id": "scanner-r41-verify-extract-function",
    "title": "Extract verifyAndExtractItem() from scanExtensions Phase 2 loop",
    "priority": "P2",
    "phase": 4,
    "file": "src/electron/extensions/scanner.ts",
    "notes": "Signature: (itemName, stateCache, newStateCache) => Promise<{folderName, zipHash?} | {aborted:true} | null>."
  },
  {
    "id": "scanner-r50-load-extension-tests",
    "title": "Write unit tests for loadExtensionFromDir in isolation",
    "priority": "P2",
    "phase": 5,
    "file": "src/electron/extensions/scanner.test.ts",
    "notes": "Each manifest type, permission failure, Node import violation, settings schema, locales."
  },
  {
    "id": "scanner-r51-load-extension-function",
    "title": "Extract loadExtensionFromDir() from scanExtensions Phase 5 loop",
    "priority": "P2",
    "phase": 5,
    "file": "src/electron/extensions/scanner.ts",
    "notes": "Signature: (folderName, itemPath) => void. Call dispatchExtensionType() internally."
  },
  {
    "id": "scanner-r60-final-validation",
    "title": "Run full test suite, typecheck, and manual E2E validation",
    "priority": "P2",
    "phase": 6,
    "file": "all",
    "notes": "pnpm -C src test, pnpm -C src typecheck, pnpm dev + manual extension install. Verify scanExtensions CC < 15."
  }
]
```

---

_Report generated by analysis-only pass. No source files were modified. All code sketches in this report are illustrative pseudocode, not production-ready implementations._
