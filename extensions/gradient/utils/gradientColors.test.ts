import { describe, it, expect } from 'vitest'
import { GRADIENT_COLORS, applyGradientColors } from './gradientColors.ts'

describe('GRADIENT_COLORS', () => {
  it('contains exactly four color entries', () => {
    expect(Object.keys(GRADIENT_COLORS)).toHaveLength(4)
  })

  it('maps CSS custom property names to var() references', () => {
    expect(GRADIENT_COLORS['--gradient-color-1']).toBe('var(--gradient-1, #c3e4f5)')
    expect(GRADIENT_COLORS['--gradient-color-2']).toBe('var(--gradient-2, #6ec3f4)')
    expect(GRADIENT_COLORS['--gradient-color-3']).toBe('var(--gradient-3, #eae2ff)')
    expect(GRADIENT_COLORS['--gradient-color-4']).toBe('var(--gradient-4, #b2c7f8)')
  })
})

describe('applyGradientColors', () => {
  it('sets all four CSS custom properties on the element', () => {
    const props: Record<string, string> = {}
    const el = {
      style: { setProperty: (k: string, v: string) => { props[k] = v } },
    } as unknown as HTMLElement

    applyGradientColors(el)

    for (const [key, value] of Object.entries(GRADIENT_COLORS)) {
      expect(props[key]).toBe(value)
    }
  })

  it('does not set extra properties beyond the four defined', () => {
    const setCalls: string[] = []
    const el = {
      style: { setProperty: (k: string, _v: string) => setCalls.push(k) },
    } as unknown as HTMLElement

    applyGradientColors(el)
    expect(setCalls).toHaveLength(4)
  })
})
