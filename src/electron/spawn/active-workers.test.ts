import { describe, it, expect, beforeEach } from 'vitest'
import type { Worker } from 'worker_threads'

import { activeWorkers } from './active-workers.js'

// A minimal stub that satisfies the Worker type for Map value purposes
function makeWorker(): Worker {
  return {} as Worker
}

describe('activeWorkers', () => {
  beforeEach(() => {
    activeWorkers.clear()
  })

  it('starts empty', () => {
    expect(activeWorkers.size).toBe(0)
  })

  it('can set and get a worker by extId', () => {
    const worker = makeWorker()
    activeWorkers.set('com.nuxy.test', worker)
    expect(activeWorkers.get('com.nuxy.test')).toBe(worker)
  })

  it('can delete a worker', () => {
    const worker = makeWorker()
    activeWorkers.set('com.nuxy.test', worker)
    activeWorkers.delete('com.nuxy.test')
    expect(activeWorkers.has('com.nuxy.test')).toBe(false)
    expect(activeWorkers.size).toBe(0)
  })

  it('reflects the same Map instance (not a copy)', async () => {
    const { activeWorkers: sameRef } = await import('./active-workers.js')
    expect(sameRef).toBe(activeWorkers)
  })
})
