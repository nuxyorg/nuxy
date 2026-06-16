/// <reference types="vite/client" />
import fs from 'fs'
import path from 'path'
import { kernelLogger } from '@nuxyorg/core'

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

/** pnpm workspace symlinks under node_modules break copyFile and are useless in ~/.nxy */
const SKIP_DIR_NAMES = new Set(['node_modules', '.git'])

export function shouldSyncPath(absolutePath: string): boolean {
  return !absolutePath.split(path.sep).some((part) => SKIP_DIR_NAMES.has(part))
}
