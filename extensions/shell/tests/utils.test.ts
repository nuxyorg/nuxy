/* cspell:ignore abcpx */
import { describe, it, expect } from 'vitest'
import {
  parseCoordinate,
  SHELL_EXT_ID,
  toInlineStyle,
  resolveLayoutHeight,
  resolveLayoutWidth,
} from '../utils.ts'

describe('constants', () => {
  it('exports SHELL_EXT_ID', () => {
    expect(SHELL_EXT_ID).toBe('com.nuxy.shell')
  })
})

describe('toInlineStyle', () => {
  it('converts camelCase keys to kebab-case for CSS', () => {
    expect(
      toInlineStyle({
        left: '10px',
        maxWidth: '900px',
        maxHeight: '600px',
        '--shell-max-height': '600px',
      })
    ).toBe('left:10px;max-width:900px;max-height:600px;--shell-max-height:600px')
  })

  it('omits undefined values', () => {
    expect(toInlineStyle({ width: '800px', maxWidth: undefined })).toBe('width:800px')
  })
})

describe('resolveLayoutWidth', () => {
  function makeContainer(width: number): HTMLElement {
    return { offsetWidth: width } as HTMLElement
  }

  it('uses configured windowWidth instead of the live box during CSS transitions', () => {
    expect(resolveLayoutWidth(makeContainer(800), { windowWidth: 1000 }, null)).toBe(1000)
  })

  it('prefers manual resize width over settings', () => {
    expect(resolveLayoutWidth(makeContainer(800), { windowWidth: 1000 }, 950)).toBe(950)
  })

  it('accepts numeric string settings', () => {
    expect(resolveLayoutWidth(makeContainer(800), { windowWidth: '900' }, null)).toBe(900)
  })

  it('falls back to offsetWidth when settings are missing', () => {
    expect(resolveLayoutWidth(makeContainer(720), {}, null)).toBe(720)
  })

  it('honours an explicit width override', () => {
    expect(resolveLayoutWidth(makeContainer(800), { windowWidth: 1000 }, null, 1100)).toBe(1100)
  })
})

describe('resolveLayoutHeight', () => {
  function makeContainer(height: number): HTMLElement {
    return { offsetHeight: height } as HTMLElement
  }

  it('uses configured windowMaxHeight when a tool is open', () => {
    expect(
      resolveLayoutHeight(makeContainer(600), { windowMaxHeight: 800 }, { activeTool: true })
    ).toBe(800)
  })

  it('uses live offsetHeight on the home screen', () => {
    expect(
      resolveLayoutHeight(makeContainer(180), { windowMaxHeight: 800 }, { activeTool: false })
    ).toBe(180)
  })

  it('prefers manual resize height over settings', () => {
    expect(
      resolveLayoutHeight(
        makeContainer(600),
        { windowMaxHeight: 800 },
        { activeTool: true, manualHeight: 650 }
      )
    ).toBe(650)
  })

  it('uses spring height while height animation is running', () => {
    expect(
      resolveLayoutHeight(makeContainer(600), { windowMaxHeight: 800 }, { springHeight: 420 })
    ).toBe(420)
  })

  it('honours an explicit height override', () => {
    expect(
      resolveLayoutHeight(makeContainer(600), { windowMaxHeight: 800 }, { heightOverride: 500 })
    ).toBe(500)
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
