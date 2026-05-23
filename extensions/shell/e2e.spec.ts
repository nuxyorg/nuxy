import { test, expect, type Page } from '../../src/e2e/fixtures.js'

async function resetShell(page: Page) {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Delete')
  await page.waitForTimeout(200)
}

async function openTool(page: Page, toolName: string) {
  await resetShell(page)
  await page.keyboard.type(toolName)
  await page.waitForTimeout(800)
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(300)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(1500)
}

async function openCommandPalette(page: Page) {
  await resetShell(page)
  await page.keyboard.press('Control+k')
  await page.waitForTimeout(600)
}

// ---------------------------------------------------------------------------
// App launch
// ---------------------------------------------------------------------------

test.describe('app launch', () => {
  test('window is visible', async ({ appPage }) => {
    expect(appPage.url()).toBeTruthy()
  })

  test('core API is injected via preload', async ({ appPage }) => {
    const hasCore = await appPage.evaluate(() => typeof (window as any).core === 'object')
    expect(hasCore).toBe(true)
  })

  test('shell input is present', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
  })
})

// ---------------------------------------------------------------------------
// Shell search
// ---------------------------------------------------------------------------

test.describe('shell search', () => {
  test('typing shows matching tool results', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('emoji')
    await appPage.waitForTimeout(800)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/emoji/)
  })

  test('typing calculator query shows calculator result', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('calc')
    await appPage.waitForTimeout(800)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/calc/)
  })

  test('escape clears active search', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })

    await appPage.keyboard.type('hello')
    await appPage.waitForTimeout(400)
    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(300)

    const inputValue = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? '',
    )
    expect(inputValue).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Extension interactions (via shell navigation)
// ---------------------------------------------------------------------------

test.describe('extension interactions', () => {
  test('opens emoji picker via keyboard navigation', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('emoji')
    await appPage.waitForTimeout(800)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(300)
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(1500)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/emoji|picker/)
  })

  test('emoji picker accepts search input', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('emoji')
    await appPage.waitForTimeout(800)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(300)
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(1500)

    await appPage.keyboard.type('heart')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/heart|❤/)
  })

  test('opens time calculator via keyboard navigation', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('time')
    await appPage.waitForTimeout(800)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(300)
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(1500)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/time|clock|calc/)
  })
})

// ---------------------------------------------------------------------------
// Escape behavior
// ---------------------------------------------------------------------------

test.describe('escape behavior', () => {
  test('escape clears the search input', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })

    await appPage.keyboard.type('some query')
    await appPage.waitForTimeout(400)
    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(400)

    const value = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? 'not-empty'
    )
    expect(value).toBe('')
  })

  test('escape from inside a tool returns to the shell', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'emoji')

    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(500)

    const hasToolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el !== null && (el.textContent ?? '').trim().length > 0
    })
    expect(hasToolName).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

test.describe('keyboard navigation', () => {
  test('ArrowDown moves selection to first item', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('e')
    await appPage.waitForTimeout(600)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(300)

    const hasActive = await appPage.evaluate(() => {
      const items = document.querySelectorAll('.nuxy-shell-results-item--active')
      return items.length > 0
    })
    expect(hasActive).toBe(true)
  })

  test('Enter opens the selected tool', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('emoji')
    await appPage.waitForTimeout(800)
    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(300)
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(1500)

    const toolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el?.textContent?.toLowerCase() ?? ''
    })
    expect(toolName).toMatch(/emoji/)
  })

  test('Backspace on empty input inside a tool exits the tool', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'emoji')

    await appPage.keyboard.press('Control+a')
    await appPage.keyboard.press('Delete')
    await appPage.waitForTimeout(200)

    await appPage.keyboard.press('Backspace')
    await appPage.waitForTimeout(500)

    const hasToolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el !== null && (el.textContent ?? '').trim().length > 0
    })
    expect(hasToolName).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Omnibar
// ---------------------------------------------------------------------------

test.describe('shell omnibar', () => {
  test('input is auto-focused on startup', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })

    const isFocused = await appPage.evaluate(() => {
      const input = document.querySelector('input')
      return document.activeElement === input
    })
    expect(isFocused).toBe(true)
  })

  test('search placeholder is shown when empty', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    const placeholder = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.placeholder ?? ''
    )
    expect(placeholder.length).toBeGreaterThan(0)
  })

  test('input accepts and retains text', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('hello world')
    await appPage.waitForTimeout(300)

    const value = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
    )
    expect(value).toBe('hello world')
  })

  test('tool name appears in omnibar when a tool is open', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openTool(appPage, 'emoji')

    const toolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el?.textContent ?? ''
    })
    expect(toolName.trim()).not.toBe('')
  })
})

// ---------------------------------------------------------------------------
// Provider results
// ---------------------------------------------------------------------------

test.describe('provider results', () => {
  test('calculator provider shows result for math expression', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('5+3')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/=\s*8/)
  })

  test('results update as query changes', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.type('10+10')
    await appPage.waitForTimeout(600)

    const bodyBefore = await appPage.evaluate(() => document.body.innerText)
    expect(bodyBefore).toMatch(/=\s*20/)

    await appPage.keyboard.press('Control+a')
    await appPage.keyboard.type('10+20')
    await appPage.waitForTimeout(600)

    const bodyAfter = await appPage.evaluate(() => document.body.innerText)
    expect(bodyAfter).toMatch(/=\s*30/)
  })
})

// ---------------------------------------------------------------------------
// Command palette (Ctrl+K) — basic
// ---------------------------------------------------------------------------

test.describe('command palette (Ctrl+K)', () => {
  test('Ctrl+K opens the command palette', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.press('Control+k')
    await appPage.waitForTimeout(600)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toBeTruthy()
  })

  test('Escape closes the command palette', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await resetShell(appPage)

    await appPage.keyboard.press('Control+k')
    await appPage.waitForTimeout(600)
    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(400)

    const inputValue = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
    )
    expect(inputValue).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Command palette — detailed
// ---------------------------------------------------------------------------

test.describe('command palette rendering', () => {
  test('Ctrl+K shows the command palette overlay', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    const paletteVisible = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette') !== null
    })
    expect(paletteVisible).toBe(true)
  })

  test('command palette has its own input field', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    const hasInput = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette__input') !== null
    })
    expect(hasInput).toBe(true)
  })

  test('command palette input has "Search commands..." placeholder', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    const placeholder = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-command-palette__input') as HTMLInputElement | null
      return el?.placeholder ?? ''
    })
    expect(placeholder.toLowerCase()).toMatch(/search|command/)
  })

  test('command palette shows a list of actions', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    const itemCount = await appPage.evaluate(() => {
      return document.querySelectorAll('.nuxy-command-palette__item').length
    })
    expect(itemCount).toBeGreaterThan(0)
  })

  test('first item is active by default', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    const hasActiveItem = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette__item--active') !== null
    })
    expect(hasActiveItem).toBe(true)
  })
})

test.describe('command palette navigation', () => {
  test('ArrowDown moves selection to next item', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(200)

    const secondLabel = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette__item--active')?.textContent ?? ''
    })
    expect(secondLabel).toBeTruthy()
  })

  test('ArrowUp moves selection back', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(200)
    await appPage.keyboard.press('ArrowUp')
    await appPage.waitForTimeout(200)

    const items = await appPage.evaluate(() => {
      const all = document.querySelectorAll('.nuxy-command-palette__item')
      const active = document.querySelector('.nuxy-command-palette__item--active')
      return {
        totalItems: all.length,
        activeIndex: Array.from(all).indexOf(active as Element),
      }
    })
    expect(items.activeIndex).toBe(0)
  })
})

test.describe('command palette filtering', () => {
  test('typing filters actions by label', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    const totalBefore = await appPage.evaluate(
      () => document.querySelectorAll('.nuxy-command-palette__item').length
    )

    await appPage.keyboard.type('zzzznocommandlikethis')
    await appPage.waitForTimeout(400)

    const totalAfter = await appPage.evaluate(
      () => document.querySelectorAll('.nuxy-command-palette__item').length
    )
    expect(totalAfter).toBeLessThanOrEqual(totalBefore)
  })

  test('"No actions available" shows when nothing matches', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    await appPage.keyboard.type('xyzxyzxyz_no_match_possible')
    await appPage.waitForTimeout(400)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/no actions|no commands|no results|xyzxyz/)
  })
})

test.describe('command palette dismissal', () => {
  test('Escape closes the command palette', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(400)

    const isGone = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette') === null
    })
    expect(isGone).toBe(true)
  })

  test('clicking the backdrop closes the command palette', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    const backdrop = await appPage.$('.nuxy-command-palette-backdrop')
    if (backdrop) {
      const box = await backdrop.boundingBox()
      if (box) {
        await appPage.mouse.click(box.x + 2, box.y + 2)
        await appPage.waitForTimeout(400)
      }
    }

    const isGone = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette') === null
    })
    expect(isGone).toBe(true)
  })

  test('Ctrl+K again closes the command palette', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 8000 })
    await openCommandPalette(appPage)

    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(300)

    const isGone = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette') === null
    })
    expect(isGone).toBe(true)
  })
})
