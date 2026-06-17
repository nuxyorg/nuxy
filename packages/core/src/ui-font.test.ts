// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyUiFontSettings, DEFAULT_FONT_FAMILY_MAP, resolveFontFamily } from './ui-font'

describe('resolveFontFamily', () => {
  it('resolves known preset keys', () => {
    expect(resolveFontFamily('system')).toBe(DEFAULT_FONT_FAMILY_MAP.system)
    expect(resolveFontFamily('monospace')).toBe('monospace')
  })

  it('quotes bare system font names', () => {
    expect(resolveFontFamily('Inter')).toBe("'Inter', sans-serif")
  })

  it('uses custom map entries when provided', () => {
    expect(resolveFontFamily('Inter', { Inter: 'Inter, sans-serif' })).toBe('Inter, sans-serif')
  })
})

describe('applyUiFontSettings', () => {
  beforeEach(() => {
    document.documentElement.style.removeProperty('--font-sans')
    document.body.style.fontFamily = ''
    document.body.style.fontWeight = ''
  })

  afterEach(() => {
    document.documentElement.style.removeProperty('--font-sans')
    document.body.style.fontFamily = ''
    document.body.style.fontWeight = ''
  })

  it('sets --font-sans and body font-family', () => {
    applyUiFontSettings({ font: 'monospace' })
    expect(document.documentElement.style.getPropertyValue('--font-sans')).toBe('monospace')
    expect(document.body.style.fontFamily).toBe('monospace')
  })

  it('sets body font-weight when provided', () => {
    applyUiFontSettings({ font: 'system', fontWeight: '600' })
    expect(document.body.style.fontWeight).toBe('600')
  })
})
