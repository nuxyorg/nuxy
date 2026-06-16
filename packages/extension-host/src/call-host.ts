import type { WorkerToHostMessage } from '@nuxyorg/core'

const HOST_CALL_TIMEOUT_MS = 30_000

export function createCallHost(
  pendingHostCalls: Map<
    string,
    {
      resolve: (v: unknown) => void
      reject: (e: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >,
  postMessage: (msg: WorkerToHostMessage) => void
): (channel: string, payload?: unknown) => Promise<unknown> {
  return function callHost(channel: string, payload?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID()
      const timer = setTimeout(() => {
        if (pendingHostCalls.delete(id)) {
          reject(new Error(`Host call timed out: channel="${channel}" id="${id}"`))
        }
      }, HOST_CALL_TIMEOUT_MS)
      pendingHostCalls.set(id, { resolve, reject, timer })
      postMessage({ type: 'host:call', id, channel, payload })
    })
  }
}

export function resolveHostReply(
  pendingHostCalls: Map<
    string,
    {
      resolve: (v: unknown) => void
      reject: (e: Error) => void
      timer: ReturnType<typeof setTimeout>
    }
  >,
  id: string,
  result: unknown,
  error?: string
): void {
  const cb = pendingHostCalls.get(id)
  if (!cb) return
  clearTimeout(cb.timer)
  pendingHostCalls.delete(id)
  if (error) cb.reject(new Error(error))
  else cb.resolve(result)
}
