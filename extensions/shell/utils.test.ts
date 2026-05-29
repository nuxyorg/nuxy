import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parseCoordinate, ensureShellStyles, SHELL_EXT_ID, SHELL_CSS_ID } from './utils.ts'

describe('constants', () => {
  it('exports SHELL_EXT_ID', () => {
    expect(SHELL_EXT_ID).toBe('com.nuxy.shell')
  })

  it('SHELL_CSS_ID matches the expected value', () => {
    expect(SHELL_CSS_ID).toBe('nuxy-shell-styles')
  })
})

describe('parseCoordinate', () => {
  const display = 1000
  const win = 200
  const center = Math.round((display - win) / 2) // 400

  describe('fallback to center', () => {
    it('centers when val is undefined', () => {
      expect(parseCoordinate(undefined, display, win)).toBe(center)
    })

    it('centers when val is null', () => {
      expect(parseCoordinate(null, display, win)).toBe(center)
    })

    it('centers when val is empty string', () => {
      expect(parseCoordinate('', display, win)).toBe(center)
    })

    it('centers for the keyword "center"', () => {
      expect(parseCoordinate('center', display, win)).toBe(center)
    })

    it('centers case-insensitively', () => {
      expect(parseCoordinate('CENTER', display, win)).toBe(center)
      expect(parseCoordinate('Center', display, win)).toBe(center)
    })
  })

  describe('pixel values', () => {
    it('parses a plain px value', () => {
      expect(parseCoordinate('300px', display, win)).toBe(300)
    })

    it('parses 0px', () => {
      expect(parseCoordinate('0px', display, win)).toBe(0)
    })

    it('falls back to center for non-numeric px', () => {
      expect(parseCoordinate('abcpx', display, win)).toBe(center)
    })

    it('parses a decimal px value', () => {
      expect(parseCoordinate('123.7px', display, win)).toBe(124)
    })
  })

  describe('percentage values', () => {
    it('positions at 50% = center', () => {
      // 1000 * 0.5 - 100 = 400
      expect(parseCoordinate('50%', display, win)).toBe(400)
    })

    it('positions at 0%', () => {
      // 1000 * 0 - 100 = -100
      expect(parseCoordinate('0%', display, win)).toBe(-100)
    })

    it('positions at 100%', () => {
      // 1000 * 1 - 100 = 900
      expect(parseCoordinate('100%', display, win)).toBe(900)
    })

    it('positions at 25%', () => {
      // 1000 * 0.25 - 100 = 150
      expect(parseCoordinate('25%', display, win)).toBe(150)
    })
  })

  describe('fraction values', () => {
    it('parses 1/2 fraction', () => {
      // 1000 * 0.5 - 100 = 400
      expect(parseCoordinate('1/2', display, win)).toBe(400)
    })

    it('parses 1/3 fraction', () => {
      expect(parseCoordinate('1/3', display, win)).toBe(Math.round(1000 / 3 - 100))
    })

    it('parses 2/3 fraction', () => {
      expect(parseCoordinate('2/3', display, win)).toBe(Math.round((1000 * 2) / 3 - 100))
    })

    it('falls through to ratio branch when denominator is zero', () => {
      // den===0 guard fires; parseFloat('1/0') stops at '/' and yields 1;
      // ratio=1 satisfies 0<=ratio<=1 → displayLength * 1 - winLength/2 = 1000 - 100 = 900
      expect(parseCoordinate('1/0', display, win)).toBe(900)
    })
  })

  describe('numeric ratio / raw coordinate', () => {
    it('treats 0-1 floats as ratios', () => {
      // 0.5 * 1000 - 100 = 400
      expect(parseCoordinate('0.5', display, win)).toBe(400)
    })

    it('treats value > 1 as raw coordinate', () => {
      expect(parseCoordinate('600', display, win)).toBe(600)
    })

    it('treats 0 as ratio (leftmost)', () => {
      // 0 * 1000 - 100 = -100
      expect(parseCoordinate('0', display, win)).toBe(-100)
    })

    it('treats 1 as ratio (rightmost)', () => {
      // 1 * 1000 - 100 = 900
      expect(parseCoordinate('1', display, win)).toBe(900)
    })
  })

  describe('edge cases', () => {
    it('trims whitespace from value', () => {
      expect(parseCoordinate('  300px  ', display, win)).toBe(300)
    })

    it('returns an integer (never NaN) for a wide range of inputs', () => {
      const cases = [
        'center',
        'CENTER',
        'Center',
        '50%',
        '0%',
        '100%',
        '25%',
        '1/3',
        '2/3',
        '1/2',
        '1/0',
        '0.5',
        '300px',
        '600',
        '0px',
        '123.7px',
        '0',
        '1',
        undefined,
        null,
        '',
        'garbage',
        'abcpx',
      ]
      for (const val of cases) {
        const result = parseCoordinate(val, display, win)
        expect(Number.isNaN(result), `NaN for val=${JSON.stringify(val)}`).toBe(false)
        expect(Number.isInteger(result), `non-integer for val=${JSON.stringify(val)}`).toBe(true)
      }
    })
  })
})

describe('ensureShellStyles', () => {
  // Stub a minimal DOM in the node environment for each test
  let createdElements: Array<{ tagName: string; id: string; rel: string; href: string }>
  let headChildren: Array<{ tagName: string; id: string; rel: string; href: string }>
  let getElementByIdImpl: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createdElements = []
    headChildren = []
    getElementByIdImpl = vi.fn().mockReturnValue(null)

    vi.stubGlobal('document', {
      getElementById: getElementByIdImpl,
      createElement: vi.fn((tag: string) => {
        const el = { tagName: tag, id: '', rel: '', href: '' }
        createdElements.push(el)
        return el
      }),
      head: {
        appendChild: vi.fn((el: { tagName: string; id: string; rel: string; href: string }) => {
          headChildren.push(el)
        }),
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('appends a <link> element with the correct id and href on first call', () => {
    ensureShellStyles()
    expect(headChildren).toHaveLength(1)
    const link = headChildren[0]
    expect(link.id).toBe(SHELL_CSS_ID)
    expect(link.rel).toBe('stylesheet')
    expect(link.href).toBe(`nuxy-ext://${SHELL_EXT_ID}/shell.css`)
  })

  it('does not append a second element when called again', () => {
    // Second call: getElementById returns the already-inserted element
    getElementByIdImpl
      .mockReturnValueOnce(null) // first call: not found → insert
      .mockReturnValueOnce({ id: SHELL_CSS_ID }) // second call: found → skip

    ensureShellStyles()
    ensureShellStyles()

    expect(headChildren).toHaveLength(1)
  })
})
