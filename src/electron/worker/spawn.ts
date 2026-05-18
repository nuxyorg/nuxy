import { Worker } from 'worker_threads'
import path from 'path'
import fs from 'fs'
import { pathToFileURL } from 'url'
import { clipboard } from 'electron'
import { EXTENSION_DIR, DATA_DIR, LEGACY_DATA_DIR } from '../paths.js'
import { resolveStoragePath } from '../storage-path.js'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('Spawn')

export const activeWorkers = new Map<string, Worker>()

/** dist-electron/worker/extension-host.js (sibling of the main bundle) */
const hostScript = path.join(import.meta.dirname, 'worker', 'extension-host.js')

function extensionDataDir(extId: string): string {
  return path.join(DATA_DIR, extId)
}

function migrateLegacyData(extId: string, folderName: string): void {
  const targetDir = extensionDataDir(extId)
  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    return
  }

  const sources = [
    path.join(LEGACY_DATA_DIR, extId),
    path.join(LEGACY_DATA_DIR, folderName),
    path.join(DATA_DIR, folderName)
  ]

  for (const sourceDir of sources) {
    if (!fs.existsSync(sourceDir)) continue
    fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.cpSync(sourceDir, targetDir, { recursive: true })
    log.info(`Migrated extension data from ${sourceDir} → ${targetDir}`)
    return
  }
}

export function spawnExtension(
  extId: string,
  folderName: string,
  entryFile: string
): Worker {
  const absolutePath = path.join(EXTENSION_DIR, folderName, entryFile)
  log.info(
    `Spawning worker for extension "${extId}" (folder: ${folderName}) → ${absolutePath}`
  )

  migrateLegacyData(extId, folderName)

  const logLevel = process.env.LOG_LEVEL ?? 'info'

  const worker = new Worker(hostScript, {
    workerData: {
      extId,
      absolutePath: pathToFileURL(absolutePath).href,
      logLevel
    }
  })

  worker.on('message', async (msg) => {
    if (!msg || msg.type !== 'host:call') return
    const { id, channel, payload } = msg
    try {
      if (channel === 'clipboard:readText') {
        const text = clipboard.readText()
        worker.postMessage({ type: 'host:reply', id, result: text })
      } else if (channel === 'clipboard:writeText') {
        clipboard.writeText(payload as string)
        worker.postMessage({ type: 'host:reply', id, result: true })
      } else if (channel === 'storage:read') {
        const dataDir = extensionDataDir(extId)
        const filePath = resolveStoragePath(dataDir, payload as string)
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')
          worker.postMessage({
            type: 'host:reply',
            id,
            result: JSON.parse(fileContent)
          })
        } else {
          worker.postMessage({ type: 'host:reply', id, result: null })
        }
      } else if (channel === 'storage:write') {
        const { file, data } = payload as { file: string; data: unknown }
        const dataDir = extensionDataDir(extId)
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true })
        }
        const filePath = resolveStoragePath(dataDir, file)
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
        worker.postMessage({ type: 'host:reply', id, result: true })
      } else {
        worker.postMessage({
          type: 'host:reply',
          id,
          error: `Unknown host channel: ${channel}`
        })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      log.error(`Host call error on channel "${channel}" in "${extId}"`, {
        error: message
      })
      worker.postMessage({ type: 'host:reply', id, error: message })
    }
  })

  worker.on('error', (err: Error) => {
    log.error(`Worker for "${extId}" emitted an error`, {
      message: err.message,
      stack: err.stack
    })
  })

  worker.on('exit', (code) => {
    if (code !== 0) {
      log.warn(`Worker for "${extId}" exited with code ${code}`)
    } else {
      log.silly(`Worker for "${extId}" exited cleanly.`)
    }
    for (const [key, val] of activeWorkers.entries()) {
      if (val === worker) activeWorkers.delete(key)
    }
  })

  activeWorkers.set(extId, worker)
  log.silly(
    `Worker registered. Active: ${[...activeWorkers.keys()].join(', ')}`
  )
  return worker
}
