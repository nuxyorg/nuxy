import { describe, it, expect, vi, beforeEach } from 'vitest'
import { register } from './backend.js'

function createCore() {
  const handlers = {}
  return {
    core: {
      registry: { registerProvider: vi.fn() },
      ipc: { handle: (ch, fn) => { handlers[ch] = fn } },
    },
    handlers,
  }
}

describe('calculator backend', () => {
  it('registers as a provider with the correct name', () => {
    const { core } = createCore()
    register(core)
    expect(core.registry.registerProvider).toHaveBeenCalledOnce()
    expect(core.registry.registerProvider).toHaveBeenCalledWith({ name: 'calculator' })
  })

  describe('eval handler', () => {
    let core, handlers

    beforeEach(() => {
      ;({ core, handlers } = createCore())
      register(core)
    })

    describe('valid arithmetic', () => {
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

      it('evaluates multiplication', async () => {
        const res = await handlers.eval({ text: '10 * 5' })
        expect(res.items[0].value).toBe(50)
        expect(res.items[0].title).toBe('= 50')
      })

      it('evaluates expression with parentheses', async () => {
        const res = await handlers.eval({ text: '(3 + 7) * 2' })
        expect(res.items[0].value).toBe(20)
      })

      it('evaluates decimal arithmetic', async () => {
        const res = await handlers.eval({ text: '3.5 * 2' })
        expect(res.items[0].value).toBeCloseTo(7)
      })

      it('evaluates a multi-step expression respecting operator precedence', async () => {
        // 100 / 4 + 5 * 3 = 25 + 15 = 40
        const res = await handlers.eval({ text: '100 / 4 + 5 * 3' })
        expect(res.items[0].value).toBe(40)
        expect(res.items[0].title).toBe('= 40')
      })

      it('handles a very large number without crashing', async () => {
        const res = await handlers.eval({ text: '999999999 * 999999999' })
        expect(res.items).toHaveLength(1)
        expect(Number.isFinite(res.items[0].value)).toBe(true)
        expect(res.items[0].value).toBeGreaterThan(0)
      })

      it('returns a finite non-integer value for 1 / 3', async () => {
        const res = await handlers.eval({ text: '1 / 3' })
        expect(res.items).toHaveLength(1)
        const v = res.items[0].value
        expect(Number.isFinite(v)).toBe(true)
        expect(Number.isInteger(v)).toBe(false)
        expect(v).toBeCloseTo(0.333, 3)
      })

      it('trims leading and trailing whitespace before evaluating', async () => {
        const res = await handlers.eval({ text: '  2 + 2  ' })
        expect(res.items).toHaveLength(1)
        expect(res.items[0].value).toBe(4)
      })
    })

    describe('returns empty items for invalid or unproductive input', () => {
      it('returns empty items for non-numeric text', async () => {
        const res = await handlers.eval({ text: 'hello world' })
        expect(res.items).toHaveLength(0)
      })

      it('returns empty items for empty string', async () => {
        const res = await handlers.eval({ text: '' })
        expect(res.items).toHaveLength(0)
      })

      it('returns empty items for whitespace-only string', async () => {
        const res = await handlers.eval({ text: '   ' })
        expect(res.items).toHaveLength(0)
      })

      it('returns empty items for division by zero', async () => {
        const res = await handlers.eval({ text: '5 / 0' })
        expect(res.items).toHaveLength(0)
      })

      it('returns empty items for expression containing letters', async () => {
        const res = await handlers.eval({ text: '2 + x' })
        expect(res.items).toHaveLength(0)
      })

      it.each([
        [undefined, 'undefined payload'],
        [null, 'null payload'],
      ])('handles %s gracefully', async (payload) => {
        const res = await handlers.eval(payload)
        expect(res.items).toHaveLength(0)
      })
    })

    describe('security: injection attempts are silently rejected', () => {
      it.each([
        'alert(1)',
        'process.exit(0)',
        'import("x")',
        '__proto__',
      ])('rejects "%s"', async (attack) => {
        const res = await handlers.eval({ text: attack })
        expect(res.items).toHaveLength(0)
      })
    })
  })
})
