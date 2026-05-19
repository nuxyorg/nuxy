import { parentPort, workerData } from 'worker_threads'
import { createCoreProxy } from './core-proxy.js'
import { loadExtensionModule } from './load-extension.js'
import { createWorkerLogger } from './worker-log.js'

interface WorkerData {
  extId: string
  absolutePath: string
  logLevel: string
}

const { extId, absolutePath, logLevel } = workerData as WorkerData
const logger = createWorkerLogger(extId, logLevel)

const pendingHostCalls = new Map<
  string,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>()

const channelHandlers = new Map<
  string,
  (payload: unknown) => Promise<unknown>
>()

parentPort!.on('message', (msg: Record<string, unknown>) => {
  if (msg?.type === 'host:reply') {
    const cb = pendingHostCalls.get(msg.id as string)
    if (cb) {
      pendingHostCalls.delete(msg.id as string)
      if (msg.error) cb.reject(new Error(msg.error as string))
      else cb.resolve(msg.result)
    }
    return
  }

  if (msg?.channel && msg?.id) {
    const handler = channelHandlers.get(msg.channel as string)
    if (!handler) return
    void (async () => {
      try {
        const res = await handler(msg.payload)
        parentPort!.postMessage({ id: msg.id, result: res })
      } catch (e) {
        const err = e as Error
        parentPort!.postMessage({ id: msg.id, error: err.message })
      }
    })()
  }
})

function callHost(channel: string, payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2)
    pendingHostCalls.set(id, { resolve, reject })
    parentPort!.postMessage({ type: 'host:call', id, channel, payload })
  })
}

const { core, getSyncPayload } = createCoreProxy(
  callHost,
  logger,
  (channel, handler) => {
    channelHandlers.set(channel, handler)
  }
)

void (async () => {
  await loadExtensionModule(absolutePath, core, logger)
  parentPort!.postMessage({
    type: 'registry:sync',
    ...getSyncPayload()
  })
})()
