/**
 * Backward-compat re-export shim.
 *
 * `scanner.ts` used to be a 652-line monolith covering manifest loading,
 * security verification, worker dispatch, and dev-mode sync. It has been
 * split into focused modules under `src/electron/extensions/`:
 *
 *  - `manifest-loader.ts` — JSON parsing, Zod-less validation, Node-builtin
 *    import scanning, signature/permission verification, dedupe.
 *  - `worker-manager.ts`  — `registerExtensionByType` (spawn/theme/iconpack
 *    dispatch).
 *  - `theme-registrar.ts` / `icon-registrar.ts` — thin wrappers around
 *    `../themes/extension-themes.js` and `../icons/registry.js`.
 *  - `dev-sync.ts`        — dev-mode extension directory watcher wiring.
 *  - `index.ts`           — orchestration entry point (`scanExtensions`,
 *    `rescanExtensions`).
 *
 * Existing imports of `./scanner.js` keep working unchanged via this
 * re-export.
 */
export { scanExtensions, rescanExtensions, loadedExtensions, detectNodeImports } from './index.js'
