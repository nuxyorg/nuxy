import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import { activeWorkers } from '../spawn/active-workers.js'
import { invokeWorker } from './worker-invoke.js'

function makeFakeWorker() {
  const emitter = new EventEmitter()
  const postMessage = vi.fn()
  const worker = Object.assign(emitter, { postMessage }) as EventEmitter & {
    postMessage: typeof postMessage
  }
  return worker
}

describe('invokeWorker', () => {
  beforeEach(() => {
    activeWorkers.clear()
  })

  afterEach(() => {
    activeWorkers.clear()
    vi.useRealTimers()
  })

  it('returns immediately with an error when worker is not found, without posting anything', async () => {
    const result = await invokeWorker('missing-ext', 'someChannel', { foo: 'bar' })
    expect(result).toEqual({ success: false, error: 'Worker not found' })
  })

  it('resolves success: true with data when reply has matching id and no error', async () => {
    const worker = makeFakeWorker()
    activeWorkers.set('ext-a', worker as never)

    const promise = invokeWorker('ext-a', 'doThing', { a: 1 })

    expect(worker.postMessage).toHaveBeenCalledTimes(1)
    const sent = worker.postMessage.mock.calls[0][0] as {
      id: string
      kind: string
      channel: string
    }
    expect(sent.kind).toBe('call')
    expect(sent.channel).toBe('doThing')

    worker.emit('message', { id: sent.id, result: { value: 42 } })

    const result = await promise
    expect(result).toEqual({ success: true, data: { value: 42 } })
  })

  it('resolves success: false with error when reply has matching id and an error', async () => {
    const worker = makeFakeWorker()
    activeWorkers.set('ext-b', worker as never)

    const promise = invokeWorker('ext-b', 'failChannel', {})
    const sent = worker.postMessage.mock.calls[0][0] as { id: string }

    worker.emit('message', { id: sent.id, error: 'boom' })

    const result = await promise
    expect(result).toEqual({ success: false, error: 'boom' })
  })

  it('ignores replies with a non-matching id, resolving only on the matching reply', async () => {
    const worker = makeFakeWorker()
    activeWorkers.set('ext-c', worker as never)

    const promise = invokeWorker('ext-c', 'channel', {})
    const sent = worker.postMessage.mock.calls[0][0] as { id: string }

    let resolved = false
    promise.then(() => {
      resolved = true
    })

    worker.emit('message', { id: 'not-the-right-id', result: 'ignored' })
    await new Promise((r) => setTimeout(r, 0))
    expect(resolved).toBe(false)

    worker.emit('message', { id: sent.id, result: 'correct' })
    const result = await promise
    expect(result).toEqual({ success: true, data: 'correct' })
  })

  it('times out after 15s with no reply', async () => {
    vi.useFakeTimers()
    const worker = makeFakeWorker()
    activeWorkers.set('ext-d', worker as never)

    const promise = invokeWorker('ext-d', 'channel', {})

    vi.advanceTimersByTime(15_000)

    const result = await promise
    expect(result).toEqual({
      success: false,
      error: 'Worker did not respond in time',
      code: 'TIMEOUT',
    })
  })

  it('removes the message listener after the promise settles (success path)', async () => {
    const worker = makeFakeWorker()
    activeWorkers.set('ext-e', worker as never)

    const promise = invokeWorker('ext-e', 'channel', {})
    const sent = worker.postMessage.mock.calls[0][0] as { id: string }
    expect(worker.listenerCount('message')).toBe(1)

    worker.emit('message', { id: sent.id, result: 'ok' })
    await promise

    expect(worker.listenerCount('message')).toBe(0)
  })

  it('removes the message listener after the promise settles (timeout path)', async () => {
    vi.useFakeTimers()
    const worker = makeFakeWorker()
    activeWorkers.set('ext-f', worker as never)

    const promise = invokeWorker('ext-f', 'channel', {})
    expect(worker.listenerCount('message')).toBe(1)

    vi.advanceTimersByTime(15_000)
    await promise

    expect(worker.listenerCount('message')).toBe(0)
  })
})
