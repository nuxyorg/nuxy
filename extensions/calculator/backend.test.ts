import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

describe('calculator backend', () => {
  it('registers as a provider with the correct name', () => {
    const { core } = createMockCore(vi)
    register(core)
    expect(core.registry.registerProvider).toHaveBeenCalledOnce()
    expect(core.registry.registerProvider).toHaveBeenCalledWith({ name: 'calculator' })
  })

  describe('eval handler', () => {
    let core: any
    let handlers: Record<string, (payload?: any) => Promise<any>>

    beforeEach(() => {
      ;({ core, handlers } = createMockCore(vi))
      register(core)
    })

    it('returns one result item for simple addition', async () => {
      const res = await handlers.eval({ text: '2 + 2' })
      expect(res.items).toHaveLength(1)
      expect(res.items[0]).toMatchObject({
        id: 'calc-result',
        title: '= 4',
        subtitle: 'Calculator Provider',
        value: 4,
      })
    })

    it('returns empty items for invalid input', async () => {
      const res = await handlers.eval({ text: 'hello world' })
      expect(res.items).toHaveLength(0)
    })

    it('rejects injection attempts silently', async () => {
      const res = await handlers.eval({ text: 'process.exit(0)' })
      expect(res.items).toHaveLength(0)
    })
  })
})
