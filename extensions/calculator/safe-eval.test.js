import { describe, it, expect } from 'vitest'
import { safeEvalMath } from './safe-eval.js'

describe('safeEvalMath', () => {
  it('evaluates basic arithmetic', () => {
    expect(safeEvalMath('2 + 2')).toBe(4)
    expect(safeEvalMath('10 / 2')).toBe(5)
  })

  it('respects precedence', () => {
    expect(safeEvalMath('2 + 3 * 4')).toBe(14)
  })

  it('rejects invalid input', () => {
    expect(Number.isNaN(safeEvalMath('alert(1)'))).toBe(true)
  })
})
