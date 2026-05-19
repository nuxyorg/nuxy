import { Worker } from 'worker_threads'
import path from 'path'
import { pathToFileURL } from 'url'
import { EXTENSION_DIR } from '../config/paths.js'
import { kernelLogger } from '@nuxy/core'
import { activeWorkers } from './active-workers.js'
import { migrateLegacyData } from './migrate-data.js'
import { mergeRuntimeSync } from '../extensions/registry.js'
import { handleHostCall } from './host-handlers.js'

export { activeWorkers } from './active-workers.js'

const log = kernelLogger.child('Spawn')

/** dist-electron/worker/extension-host.js (built from @nuxy/extension-host) */
const hostScript = path.join(import.meta.dirname, 'worker', 'extension-host.js')

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
    if (!msg) return

    if (msg.type === 'registry:sync') {
      mergeRuntimeSync(extId, {
        ipcChannels: msg.ipcChannels ?? [],
        displayName: msg.displayName
      })
      log.silly(`Registry sync for "${extId}"`, msg.ipcChannels)
      return
    }

    if (msg.type !== 'host:call') return
    const { id, channel, payload } = msg
    const reply = await handleHostCall(extId, channel, payload)
    worker.postMessage({
      type: 'host:reply',
      id,
      ...reply
    })
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
