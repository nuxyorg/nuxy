/// <reference types="vite/client" />
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { EXTENSION_DIR } from '../config/paths.js'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('DevScanner')

/** Walk up from `startDir` until we find `extensions/<name>/manifest.json`. */
export function findWorkspaceExtensionsDir(startDir: string): string | null {
  if (process.env.NUXY_EXTENSIONS_SRC) {
    const envPath = path.resolve(process.env.NUXY_EXTENSIONS_SRC)
    if (fs.existsSync(envPath)) return envPath
    log.warn(`NUXY_EXTENSIONS_SRC is set but not found: ${envPath}`)
  }

  const cwdCandidates = [
    path.resolve(process.cwd(), 'extensions'),
    path.resolve(process.cwd(), '../extensions'),
  ]
  for (const candidate of cwdCandidates) {
    if (isExtensionsRoot(candidate)) return candidate
  }

  let dir = startDir
  for (let depth = 0; depth < 8; depth++) {
    const candidate = path.join(dir, 'extensions')
    if (isExtensionsRoot(candidate)) return candidate
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }

  return null
}

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

/** pnpm workspace symlinks under node_modules break copyFile and are useless in ~/.nuxy */
const SKIP_DIR_NAMES = new Set(['node_modules', '.git'])

export function shouldSyncPath(absolutePath: string): boolean {
  return !absolutePath.split(path.sep).some((part) => SKIP_DIR_NAMES.has(part))
}

function syncDirectory(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue

    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      syncDirectory(srcPath, destPath)
      continue
    }

    if (entry.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(srcPath)
      const resolved = path.resolve(path.dirname(srcPath), linkTarget)
      if (!fs.existsSync(resolved)) continue
      if (fs.statSync(resolved).isDirectory()) {
        syncDirectory(resolved, destPath)
      } else {
        const shouldCopy =
          !fs.existsSync(destPath) || fs.statSync(resolved).mtimeMs > fs.statSync(destPath).mtimeMs
        if (shouldCopy) {
          fs.copyFileSync(resolved, destPath)
          log.silly(`Synced ${path.relative(EXTENSION_DIR, destPath)}`)
        }
      }
      continue
    }

    const shouldCopy =
      !fs.existsSync(destPath) || fs.statSync(srcPath).mtimeMs > fs.statSync(destPath).mtimeMs
    if (shouldCopy) {
      fs.copyFileSync(srcPath, destPath)
      log.silly(`Synced ${path.relative(EXTENSION_DIR, destPath)}`)
    }
  }
}

function copyExtensionTree(srcPath: string, destPath: string): void {
  fs.cpSync(srcPath, destPath, {
    recursive: true,
    filter: (source) => shouldSyncPath(source),
  })
}

/** Set NUXY_DEV_OVERWRITE=1 to replace entire extension folders. */
function copyDefaultExtensions(): void {
  const overwrite = process.env.NUXY_DEV_OVERWRITE === '1'
  const workspaceExtensions = findWorkspaceExtensionsDir(
    path.dirname(fileURLToPath(import.meta.url))
  )

  if (!workspaceExtensions) {
    log.error(
      'Dev extension sync skipped — workspace extensions/ not found. ' +
        'Set NUXY_EXTENSIONS_SRC or run pnpm dev from the repo.'
    )
    return
  }

  log.info(`Dev extension sync (overwrite=${overwrite}) ${workspaceExtensions} → ${EXTENSION_DIR}`)

  try {
    if (!fs.existsSync(EXTENSION_DIR)) {
      fs.mkdirSync(EXTENSION_DIR, { recursive: true })
    }

    for (const ext of fs.readdirSync(workspaceExtensions)) {
      const srcPath = path.join(workspaceExtensions, ext)
      if (!fs.statSync(srcPath).isDirectory()) continue

      const destPath = path.join(EXTENSION_DIR, ext)
      if (overwrite && fs.existsSync(destPath)) {
        fs.rmSync(destPath, { recursive: true, force: true })
        copyExtensionTree(srcPath, destPath)
        log.info(`Replaced workspace extension: ${ext}`)
      } else if (!fs.existsSync(destPath)) {
        copyExtensionTree(srcPath, destPath)
        log.info(`Installed workspace extension: ${ext}`)
      } else {
        syncDirectory(srcPath, destPath)
        log.info(`Synced workspace extension: ${ext}`)
      }
    }
    log.info('Dev extension sync complete.')
  } catch (err) {
    log.error('Failed to sync workspace extensions:', err)
  }
}
