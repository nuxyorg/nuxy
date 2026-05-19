import { kernelLogger } from '@nuxy/core'
import type { IpcResult } from '@nuxy/core'
import { activeWorkers } from '../spawn/spawn.js'

const log = kernelLogger.child('WorkerInvoke')
const EXT_INVOKE_TIMEOUT_MS = 15_000

export function invokeWorker(
  extId: string,
  channel: string,
  payload: unknown
): Promise<IpcResult> {
  const worker = activeWorkers.get(extId)
  if (!worker) {
    return Promise.resolve({ success: false, error: 'Worker not found' })
  }

  return new Promise((resolve) => {
    const msgId = Math.random().toString(36).slice(2)
    let settled = false

    const finish = (result: IpcResult) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      worker.off('message', listener)
      resolve(result)
    }

    const timer = setTimeout(() => {
      log.warn(`ext:invoke timeout for "${extId}" channel "${channel}"`)
      finish({
        success: false,
        error: 'Worker did not respond in time',
        code: 'TIMEOUT'
      })
    }, EXT_INVOKE_TIMEOUT_MS)

    const listener = (msg: {
      id?: string
      error?: string
      result?: unknown
    }) => {
      if (msg.id !== msgId) return
      if (msg.error) {
        log.warn(`Worker "${extId}" error on "${channel}"`, msg.error)
        finish({ success: false, error: msg.error })
      } else {
        finish({ success: true, data: msg.result })
      }
    }

    worker.on('message', listener)
    worker.postMessage({ id: msgId, channel, payload })
  })
}
