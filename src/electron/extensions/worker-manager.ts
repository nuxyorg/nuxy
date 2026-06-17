import fs from 'fs'
import path from 'path'
import { spawnExtension } from '../spawn/spawn.js'
import { registerExtensionTheme } from '../themes/extension-themes.js'
import { registerIconPack } from '../icons/registry.js'
import { kernelLogger } from '@nuxyorg/core'
import type { ExtensionManifest, ThemeDefinition, IconPackDefinition } from '@nuxyorg/core'

const log = kernelLogger.child('Scanner')

/**
 * Type-dispatch: register or spawn an extension based on its manifest type.
 *
 * Fixes the latent bug where `type === 'theme'` with no `entry.theme` (or `type === 'iconpack'`
 * with no `entry.icons`) would silently fall through to the backend-spawn branches.
 */
export function registerExtensionByType(
  manifest: ExtensionManifest,
  extId: string,
  folderName: string,
  itemPath: string,
  spawnExt: typeof spawnExtension
): void {
  const { type, entry } = manifest

  if (type === 'theme') {
    // theme type: requires entry.theme — do NOT fall through to spawn
    if (!entry?.theme) {
      log.warn(`Theme extension "${extId}" has no entry.theme — skipping.`)
      return
    }
    const themePath = path.join(itemPath, entry.theme)
    if (fs.existsSync(themePath)) {
      try {
        const def = JSON.parse(fs.readFileSync(themePath, 'utf8')) as ThemeDefinition
        registerExtensionTheme(def)
        log.info(`Loaded theme "${def.name}" from extension: ${extId}`)
      } catch (e) {
        log.error(`Failed to parse theme file for "${extId}"`, e)
      }
    }
  } else if (type === 'iconpack') {
    // iconpack type: requires entry.icons — do NOT fall through to spawn
    if (!entry?.icons) {
      log.warn(`Icon pack extension "${extId}" has no entry.icons — skipping.`)
      return
    }
    const iconsPath = path.join(itemPath, entry.icons)
    if (fs.existsSync(iconsPath)) {
      try {
        const def = JSON.parse(fs.readFileSync(iconsPath, 'utf8')) as IconPackDefinition
        registerIconPack(def)
        log.info(`Loaded icon pack "${def.name}" from extension: ${extId}`)
      } catch (e) {
        log.error(`Failed to parse icons file for "${extId}"`, e)
      }
    }
  } else if (type === 'uikit') {
    // uikit extensions are pure renderer-side — no backend worker.
    // The renderer loads their frontend.js early, before the shell bootstrap,
    // allowing them to extend or override window.UI components at runtime.
    if (!entry?.frontend) {
      log.warn(`UIKit extension "${extId}" has no frontend entry — it will have no effect.`)
    } else {
      log.info(`UIKit extension registered: ${extId} (frontend: ${entry.frontend})`)
    }
  } else if (type === 'helper') {
    // helper extensions provide utility services to other extensions.
    // Their frontend (if any) is loaded early alongside uikit extensions.
    // A backend worker is spawned only when a backend entry is declared.
    if (entry?.backend) {
      log.info(`Loading helper extension: ${extId} (backend: ${entry.backend})`)
      void spawnExt(extId, folderName, entry.backend, manifest.permissions ?? [])
      log.info(`Sandboxed worker started for helper: ${extId}`)
    } else {
      log.info(`Helper extension registered: ${extId} (frontend-only)`)
    }
  } else if (entry?.backend) {
    log.info(`Loading extension: ${extId} (backend: ${entry.backend})`)
    void spawnExt(extId, folderName, entry.backend, manifest.permissions ?? [])
    log.info(`Sandboxed worker started for: ${extId}`)
  } else {
    log.warn(`Extension "${extId}" has no backend entry — skipping worker.`)
  }
}
