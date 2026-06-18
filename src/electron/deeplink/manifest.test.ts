import { describe, it, expect } from 'vitest'
import { validateDeeplinksConfig } from './manifest.js'

describe('validateDeeplinksConfig', () => {
  it('returns ok for a manifest with no deeplinks field', () => {
    expect(validateDeeplinksConfig(undefined)).toEqual({ ok: true })
  })

  it('returns ok for a valid schemes array', () => {
    expect(validateDeeplinksConfig({ schemes: ['add', 'extension/:extId'] })).toEqual({ ok: true })
  })

  it('returns ok for an empty schemes array', () => {
    expect(validateDeeplinksConfig({ schemes: [] })).toEqual({ ok: true })
  })

  it('rejects a deeplinks field missing "schemes"', () => {
    const result = validateDeeplinksConfig({} as never)
    expect(result.ok).toBe(false)
  })

  it('rejects a non-array "schemes"', () => {
    const result = validateDeeplinksConfig({ schemes: 'add' } as never)
    expect(result.ok).toBe(false)
  })

  it('rejects schemes containing a non-string entry', () => {
    const result = validateDeeplinksConfig({ schemes: ['add', 42] } as never)
    expect(result.ok).toBe(false)
  })

  it('rejects schemes with a leading slash', () => {
    const result = validateDeeplinksConfig({ schemes: ['/add'] })
    expect(result.ok).toBe(false)
  })
})
