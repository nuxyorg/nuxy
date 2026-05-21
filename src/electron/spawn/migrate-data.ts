import fs from 'fs'
import path from 'path'
import { DATA_DIR, LEGACY_DATA_DIR } from '../config/paths.js'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('MigrateData')

export function extensionDataDir(extId: string): string {
  return path.join(DATA_DIR, extId)
}

export function migrateLegacyData(extId: string, folderName: string): void {
  const targetDir = extensionDataDir(extId)
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    return
  }

  const sources = [
    path.join(LEGACY_DATA_DIR, extId),
    path.join(LEGACY_DATA_DIR, folderName),
    path.join(DATA_DIR, folderName),
  ]

  for (const sourceDir of sources) {
    if (!fs.existsSync(sourceDir)) continue
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.cpSync(sourceDir, targetDir, { recursive: true })
    log.info(`Migrated extension data from ${sourceDir} → ${targetDir}`)
    return
  }
}
