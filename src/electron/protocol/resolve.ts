import path from 'path'
import fs from 'fs'
import { EXTRACTED_DIR } from '../config/paths.js'
import { getExtensionFolder, resolveExtensionId } from '../extensions/registry.js'

export interface ResolvedExtensionFile {
  absolutePath: string
  extDir: string
  folderName: string
  extensionId: string
}

const SAFE_EXT_ID_RE = /^[a-z0-9._-]+$/i
const FRONTEND_BUNDLE = '_frontend.bundle.mjs'

/** Prefer versioned extracts and folders that contain a pre-built frontend bundle. */
export function scoreExtensionFolder(folderPath: string, folderName: string): number {
  let score = 0
  if (fs.existsSync(path.join(folderPath, FRONTEND_BUNDLE))) score += 100
  if (/-\d/.test(folderName)) score += 10
  try {
    score += fs.statSync(folderPath).mtimeMs / 1e15
  } catch {
    /* ignore */
  }
  return score
}

export function pickBestExtractFolder(
  extensionId: string,
  extensionsRoot: string = EXTRACTED_DIR
): string | null {
  let best: { folderName: string; score: number } | null = null

  let entries: string[]
  try {
    entries = fs.readdirSync(extensionsRoot)
  } catch {
    return null
  }

  for (const name of entries) {
    if (name.startsWith('.')) continue
    const dir = path.join(extensionsRoot, name)
    let stat: fs.Stats
    try {
      stat = fs.statSync(dir)
    } catch {
      continue
    }
    if (!stat.isDirectory()) continue

    const manifestPath = path.join(dir, 'manifest.json')
    if (!fs.existsSync(manifestPath)) continue

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { id?: string }
      if ((manifest.id ?? name) !== extensionId) continue
      const score = scoreExtensionFolder(dir, name)
      if (!best || score > best.score) best = { folderName: name, score }
    } catch {
      continue
    }
  }

  return best?.folderName ?? null
}

function resolveHit(
  absolutePath: string,
  base: string,
  folderName: string,
  extensionId: string
): ResolvedExtensionFile {
  return { absolutePath, extDir: base, folderName, extensionId }
}

function resolveFrontendBundle(base: string): string | null {
  const bundlePath = path.join(base, FRONTEND_BUNDLE)
  return fs.existsSync(bundlePath) ? bundlePath : null
}

export function resolveExtensionFile(
  idOrFolder: string,
  filePath: string,
  extensionsRoot: string = EXTRACTED_DIR
): ResolvedExtensionFile | null {
  if (!SAFE_EXT_ID_RE.test(idOrFolder)) return null

  const extensionId = resolveExtensionId(idOrFolder) ?? idOrFolder
  const folderName =
    pickBestExtractFolder(extensionId, extensionsRoot) ??
    getExtensionFolder(extensionId) ??
    idOrFolder

  const base = path.resolve(extensionsRoot, folderName)
  const absolutePath = path.resolve(base, filePath)
  const relative = path.relative(base, absolutePath)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }

  if (!fs.existsSync(absolutePath)) {
    if (filePath === 'frontend.js') {
      const bundlePath = resolveFrontendBundle(base)
      if (bundlePath) {
        return resolveHit(bundlePath, base, folderName, extensionId)
      }
    }
    if (filePath.endsWith('.js')) {
      const stem = absolutePath.slice(0, -3)
      for (const ext of ['.tsx', '.ts', '.jsx']) {
        const alt = stem + ext
        if (fs.existsSync(alt)) {
          return resolveHit(alt, base, folderName, extensionId)
        }
      }
    }
    const sharedPath = path.resolve(extensionsRoot, filePath)
    const sharedRelative = path.relative(extensionsRoot, sharedPath)
    if (!sharedRelative.startsWith('..') && !path.isAbsolute(sharedRelative)) {
      if (fs.existsSync(sharedPath)) {
        return resolveHit(sharedPath, extensionsRoot, folderName, extensionId)
      }
      if (filePath.endsWith('.js')) {
        const stem = sharedPath.slice(0, -3)
        for (const ext of ['.tsx', '.ts', '.jsx']) {
          const alt = stem + ext
          if (fs.existsSync(alt)) {
            return resolveHit(alt, extensionsRoot, folderName, extensionId)
          }
        }
      }
    }
    return null
  }

  return resolveHit(absolutePath, base, folderName, extensionId)
}
