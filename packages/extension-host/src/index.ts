import { parentPort, workerData } from 'worker_threads'
import { createCoreProxy } from './core-proxy.js'
import { loadExtensionModule } from './load-extension.js'
import { createWorkerLogger } from './worker-log.js'
import type { HostToWorkerMessage, WorkerToHostMessage } from '@nuxy/core'

interface WorkerData {
  extId: string
  absolutePath: string
  logLevel: string
}

function assertWorkerData(d: unknown): asserts d is WorkerData {
  if (
    typeof d !== 'object' ||
    d === null ||
    typeof (d as WorkerData).extId !== 'string' ||
    typeof (d as WorkerData).absolutePath !== 'string' ||
    typeof (d as WorkerData).logLevel !== 'string'
  ) {
    throw new Error('Invalid workerData: missing extId, absolutePath, or logLevel')
  }
}

assertWorkerData(workerData)
const { extId, absolutePath, logLevel } = workerData
const logger = createWorkerLogger(extId, logLevel)

const pendingHostCalls = new Map<
  string,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>()

const channelHandlers = new Map<string, (payload: unknown) => Promise<unknown>>()

parentPort!.on('message', (msg: HostToWorkerMessage) => {
  if (msg?.type === 'host:reply') {
    const cb = pendingHostCalls.get(msg.id)
    if (cb) {
      pendingHostCalls.delete(msg.id)
      if (msg.error) cb.reject(new Error(msg.error))
      else cb.resolve(msg.result)
    }
    return
  }

  if ('channel' in msg && msg.channel && msg.id) {
    const handler = channelHandlers.get(msg.channel)
    if (!handler) return
    void (async () => {
      try {
        const res = await handler(msg.payload)
        parentPort!.postMessage({ id: msg.id, result: res } satisfies Omit<
          WorkerToHostMessage & object,
          'type'
        >)
      } catch (e) {
        const err = e as Error
        parentPort!.postMessage({ id: msg.id, error: err.message })
      }
    })()
  }
})

function callHost(channel: string, payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID()
    pendingHostCalls.set(id, { resolve, reject })
    const msg: WorkerToHostMessage = { type: 'host:call', id, channel, payload }
    parentPort!.postMessage(msg)
  })
}

const { core, getSyncPayload } = createCoreProxy(callHost, logger, (channel, handler) => {
  channelHandlers.set(channel, handler)
})

void (async () => {
  try {
    await loadExtensionModule(absolutePath, core, logger)
    const syncMsg: WorkerToHostMessage = {
      type: 'registry:sync',
      ...getSyncPayload(),
    }
    parentPort!.postMessage(syncMsg)
  } catch (e) {
    const err = e as Error
    logger.log('error', 'Worker', 'Extension failed to load: ' + err.message, {
      stack: err.stack,
    })
    const errMsg: WorkerToHostMessage = { type: 'registry:error', error: err.message }
    parentPort!.postMessage(errMsg)
  }
})()
