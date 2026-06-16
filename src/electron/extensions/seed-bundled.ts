import fs from 'fs'
import path from 'path'
import { EXTENSION_DIR } from '../config/paths.js'
import { kernelLogger } from '@nuxyorg/core'

const log = kernelLogger.child('ExtensionSeed')

function isExtensionsRoot(dir: string): boolean {
  if (!fs.existsSync(dir)) return false
  try {
    return fs.readdirSync(dir).some((name) => {
      const manifest = path.join(dir, name, 'manifest.json')
      return fs.existsSync(manifest)
    })
  } catch {
    return false
  }
}

/** Packaged apps ship extensions under `resources/extensions/` (electron-builder extraResources). */
export function bundledExtensionsDir(): string | null {
  if (!process.resourcesPath) return null
  const dir = path.join(process.resourcesPath, 'extensions')
  return isExtensionsRoot(dir) ? dir : null
}

/** Copy shipped extensions into ~/.nxy/extensions when missing (first install). */
export function seedBundledExtensions(): void {
  const bundled = bundledExtensionsDir()
  if (!bundled) return

  fs.mkdirSync(EXTENSION_DIR, { recursive: true })

  for (const name of fs.readdirSync(bundled)) {
    const srcPath = path.join(bundled, name)
    if (!fs.statSync(srcPath).isDirectory()) continue

    const destPath = path.join(EXTENSION_DIR, name)
    if (fs.existsSync(destPath)) continue

    fs.cpSync(srcPath, destPath, { recursive: true })
    log.info(`Installed bundled extension: ${name}`)
  }
}
