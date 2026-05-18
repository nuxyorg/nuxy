import path from 'path'
import fs from 'fs'
import { EXTENSION_DIR } from './paths.js'
import { getExtensionFolder, resolveExtensionId } from './registry.js'

export interface ResolvedExtensionFile {
  absolutePath: string
  folderName: string
  extensionId: string
}

/**
 * Resolve nuxy-ext://<id>/<file> to a path under ~/.nuxy/extensions/<folder>/.
 * Returns null if the extension is unknown or path escapes the extension root.
 */
export function resolveExtensionFile(
  idOrFolder: string,
  filePath: string,
  extensionsRoot: string = EXTENSION_DIR
): ResolvedExtensionFile | null {
  const extensionId = resolveExtensionId(idOrFolder) ?? idOrFolder
  const folderName = getExtensionFolder(extensionId) ?? idOrFolder

  const base = path.resolve(extensionsRoot, folderName)
  const absolutePath = path.resolve(base, filePath)
  const relative = path.relative(base, absolutePath)

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null
  }

  if (!fs.existsSync(absolutePath)) {
    return null
  }

  return { absolutePath, folderName, extensionId }
}
