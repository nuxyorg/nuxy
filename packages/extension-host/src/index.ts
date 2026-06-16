import { parentPort, workerData } from 'worker_threads'
import { createCoreProxy } from './core-proxy.js'
import { loadExtensionModule } from './load-extension.js'
import { createWorkerLogger } from './worker-log.js'
import { createCallHost, resolveHostReply } from './call-host.js'
import type { HostToWorkerMessage, WorkerToHostMessage } from '@nuxyorg/core'

interface WorkerData {
  extId: string
  absolutePath: string
  extDir: string
  logLevel: string
  permissions: string[]
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
const { extId, absolutePath, extDir, logLevel, permissions = [] } = workerData
const logger = createWorkerLogger(extId, logLevel)

const pendingHostCalls = new Map<
  string,
  {
    resolve: (v: unknown) => void
    reject: (e: Error) => void
    timer: ReturnType<typeof setTimeout>
  }
>()

const channelHandlers = new Map<string, (payload: unknown) => Promise<unknown>>()

parentPort!.on('message', (msg: HostToWorkerMessage) => {
  if (msg?.type === 'host:reply') {
    resolveHostReply(pendingHostCalls, msg.id, msg.result, msg.error)
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

const callHost = createCallHost(pendingHostCalls, (msg) => parentPort!.postMessage(msg))

const { core, initI18n, getSyncPayload } = createCoreProxy(
  callHost,
  logger,
  (channel, handler) => {
    channelHandlers.set(channel, handler)
  },
  extId,
  permissions,
  extDir
)

if (!permissions.includes('network')) {
  globalThis.fetch = (() => {
    throw new Error(
      `Permission Denied: Extension "${extId}" lacks "network" permission required for "fetch"`
    )
  }) as unknown as typeof fetch
}

void (async () => {
  try {
    await initI18n()
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
