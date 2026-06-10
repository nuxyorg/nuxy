import { describe, it, expect } from 'vitest'
import { safeEvalMath } from '../safe-eval.ts'

describe('safeEvalMath', () => {
  describe('basic arithmetic', () => {
    it.each([
      ['2 + 2', 4],
      ['10 + 0', 10],
    ])('evaluates addition: %s = %d', (input, expected) => {
      expect(safeEvalMath(input)).toBe(expected)
    })

    it.each([
      ['10 - 3', 7],
      ['5 - 5', 0],
    ])('evaluates subtraction: %s = %d', (input, expected) => {
      expect(safeEvalMath(input)).toBe(expected)
    })

    it.each([
      ['3 * 4', 12],
      ['0 * 9999', 0],
    ])('evaluates multiplication: %s = %d', (input, expected) => {
      expect(safeEvalMath(input)).toBe(expected)
    })

    it.each([
      ['10 / 2', 5],
      ['7 / 2', 3.5],
    ])('evaluates division: %s = %d', (input, expected) => {
      expect(safeEvalMath(input)).toBe(expected)
    })
  })

  describe('operator precedence', () => {
    it('respects * before +', () => {
      expect(safeEvalMath('2 + 3 * 4')).toBe(14)
    })

    it('respects / before -', () => {
      expect(safeEvalMath('10 - 6 / 2')).toBe(7)
    })

    it('handles chained addition', () => {
      expect(safeEvalMath('1 + 2 + 3 + 4')).toBe(10)
    })

    it('handles chained multiplication', () => {
      expect(safeEvalMath('2 * 3 * 4')).toBe(24)
    })
  })

  describe('parentheses', () => {
    it('overrides precedence with parentheses', () => {
      expect(safeEvalMath('(2 + 3) * 4')).toBe(20)
    })

    it('handles nested parentheses', () => {
      expect(safeEvalMath('((2 + 3) * 2) + 1')).toBe(11)
    })

    it('handles multiple parenthesised groups', () => {
      expect(safeEvalMath('(1 + 2) * (3 + 4)')).toBe(21)
    })

    it('handles deeply nested parentheses', () => {
      expect(safeEvalMath('((((1+1))))')).toBe(2)
    })
  })

  describe('decimals', () => {
    it('handles decimal numbers', () => {
      expect(safeEvalMath('3.14 * 2')).toBeCloseTo(6.28)
    })

    it('handles decimal + decimal', () => {
      expect(safeEvalMath('0.1 + 0.2')).toBeCloseTo(0.3)
    })

    it('handles mixed decimal and integer', () => {
      expect(safeEvalMath('1.5 + 2')).toBe(3.5)
    })
  })

  describe('unary operators', () => {
    it('handles unary minus on a bare number', () => {
      expect(safeEvalMath('-5 + 10')).toBe(5)
    })

    it('handles unary minus inside parentheses', () => {
      expect(safeEvalMath('(-3) * 2')).toBe(-6)
    })

    it('handles unary plus on a bare number', () => {
      expect(safeEvalMath('+5 + 3')).toBe(8)
    })

    it('handles consecutive unary plus after binary plus (2 + +3)', () => {
      // After stripping spaces: "2++3" → binary + then unary + on 3
      expect(safeEvalMath('2 + + 3')).toBe(5)
    })
  })

  describe('error cases', () => {
    it('returns NaN for division by zero', () => {
      expect(Number.isNaN(safeEvalMath('5 / 0'))).toBe(true)
    })

    it('rejects alphabetic input', () => {
      expect(Number.isNaN(safeEvalMath('alert(1)'))).toBe(true)
    })

    it('rejects empty string', () => {
      expect(Number.isNaN(safeEvalMath(''))).toBe(true)
    })

    it('rejects strings with embedded letters', () => {
      expect(Number.isNaN(safeEvalMath('2 + abc'))).toBe(true)
    })

    it('returns NaN for unbalanced opening parenthesis', () => {
      expect(Number.isNaN(safeEvalMath('(2 + 3'))).toBe(true)
    })

    it('returns NaN for trailing operator', () => {
      expect(Number.isNaN(safeEvalMath('2 +'))).toBe(true)
    })

    it('rejects XSS-style injection', () => {
      expect(Number.isNaN(safeEvalMath('<script>'))).toBe(true)
    })

    it('rejects process.exit style input', () => {
      expect(Number.isNaN(safeEvalMath('process.exit(0)'))).toBe(true)
    })
  })
})
