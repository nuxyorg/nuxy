/// <reference types="vite/client" />
import fs from 'fs'
import path from 'path'
import { EXTENSION_DIR } from '../paths.js'
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
    path.resolve(process.cwd(), '../extensions')
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

function syncDirectory(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      syncDirectory(srcPath, destPath)
      continue
    }
    const shouldCopy =
      !fs.existsSync(destPath) ||
      fs.statSync(srcPath).mtimeMs > fs.statSync(destPath).mtimeMs
    if (shouldCopy) {
      fs.copyFileSync(srcPath, destPath)
      log.silly(`Synced ${path.relative(EXTENSION_DIR, destPath)}`)
    }
  }
}

/** Set NUXY_DEV_OVERWRITE=1 to replace entire extension folders. */
export function copyDefaultExtensions(): void {
  const overwrite = process.env.NUXY_DEV_OVERWRITE === '1'
  const workspaceExtensions = findWorkspaceExtensionsDir(import.meta.dirname)

  if (!workspaceExtensions) {
    log.error(
      'Dev extension sync skipped — workspace extensions/ not found. ' +
        'Set NUXY_EXTENSIONS_SRC or run pnpm dev from the repo.'
    )
    return
  }

  log.info(
    `Dev extension sync (overwrite=${overwrite}) ${workspaceExtensions} → ${EXTENSION_DIR}`
  )

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
        fs.cpSync(srcPath, destPath, { recursive: true })
        log.info(`Replaced workspace extension: ${ext}`)
      } else if (!fs.existsSync(destPath)) {
        fs.cpSync(srcPath, destPath, { recursive: true })
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
