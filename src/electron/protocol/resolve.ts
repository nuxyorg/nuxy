import path from 'path'
import fs from 'fs'
import { EXTRACTED_DIR } from '../config/paths.js'
import { getExtensionFolder, resolveExtensionId } from '../extensions/registry.js'

export interface ResolvedExtensionFile {
  absolutePath: string
  folderName: string
  extensionId: string
}

export function resolveExtensionFile(
  idOrFolder: string,
  filePath: string,
  extensionsRoot: string = EXTRACTED_DIR
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
    if (filePath.endsWith('.js')) {
      const stem = absolutePath.slice(0, -3)
      for (const ext of ['.tsx', '.ts', '.jsx']) {
        const alt = stem + ext
        if (fs.existsSync(alt)) {
          return { absolutePath: alt, folderName, extensionId }
        }
      }
    }
    return null
  }

  return { absolutePath, folderName, extensionId }
}
