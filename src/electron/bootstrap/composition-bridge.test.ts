import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCompositionBridge } from './composition-bridge.js'

describe('createCompositionBridge', () => {
  const invoke = vi.fn()
  let shellChildren: Array<{ slot: string; tagName: string }>
  let shell: {
    appendChild: (el: { slot: string; tagName: string }) => void
    contains: (el: unknown) => boolean
  }

  beforeEach(() => {
    invoke.mockReset()
    shellChildren = []
    shell = {
      appendChild(el) {
        shellChildren.push(el)
      },
      contains(el) {
        return shellChildren.includes(el as { slot: string; tagName: string })
      },
    }
    vi.stubGlobal('document', {
      querySelector: vi.fn(() => shell),
      createElement: vi.fn((tag: string) => ({ slot: '', tagName: tag.toUpperCase() })),
    })
  })

  it('mount validates claim, assigns slot, and forwards setState', async () => {
    invoke.mockResolvedValueOnce({ success: true, data: { maxMounts: 1 } })
    const bridge = createCompositionBridge({ invoke } as any)
    bridge.declareSlots([{ name: 'background-layer', maxMounts: 1 }])

    const layer = {
      slot: '',
      tagName: 'NUXY-GRADIENT-LAYER',
      remove: vi.fn(() => {
        shellChildren = shellChildren.filter((child) => child !== layer)
      }),
    }
    const handle = await bridge.mount('background-layer', layer as unknown as HTMLElement, {
      extId: 'com.nuxy.gradient',
      state: { active: true, mode: 'light' },
    })

    expect(invoke).toHaveBeenCalledWith('ext:invoke', 'kernel', 'validateCompositionClaim', {
      extId: 'com.nuxy.gradient',
      slotName: 'background-layer',
    })
    expect(layer.slot).toBe('background-layer')
    expect(shell.contains(layer)).toBe(true)

    const listener = vi.fn()
    bridge.onStateChange('background-layer', listener)
    handle.setState({ active: false })
    expect(listener).toHaveBeenCalledWith({ active: false })

    handle.release()
    expect(shell.contains(layer)).toBe(false)
  })

  it('rejects mount when kernel denies claim', async () => {
    invoke.mockResolvedValueOnce({ success: false, error: 'Composition claim denied' })
    const bridge = createCompositionBridge({ invoke } as any)
    bridge.declareSlots([{ name: 'background-layer' }])

    await expect(
      bridge.mount('background-layer', { slot: '', tagName: 'DIV' } as unknown as HTMLElement, {
        extId: 'com.evil.ext',
      })
    ).rejects.toThrow('Composition claim denied')
  })
})
