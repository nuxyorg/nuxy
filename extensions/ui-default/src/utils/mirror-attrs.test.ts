// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { mirrorAttrs } from './mirror-attrs.ts'

describe('mirrorAttrs', () => {
  it('returns the attribute value when present', () => {
    const el = document.createElement('div')
    el.setAttribute('disabled', '')
    el.setAttribute('aria-label', 'close')
    expect(mirrorAttrs(el, ['disabled', 'aria-label'])).toEqual({
      disabled: '',
      'aria-label': 'close',
    })
  })

  it('returns null for absent attributes', () => {
    const el = document.createElement('div')
    expect(mirrorAttrs(el, ['disabled', 'type'])).toEqual({ disabled: null, type: null })
  })
})
