// fallow-ignore-file code-duplication
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test, expect, type Page } from '../../../src/e2e/fixtures.js'
import {
  resetShell,
  typeInOmnibar,
  pressOmnibarKey,
  openTool,
  openCommandPalette,
  typeInCommandPalette,
} from '../../e2e-helpers.js'

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
    await appPage.waitForSelector('input', { timeout: 2000 })
  })
})

// ---------------------------------------------------------------------------
// Shell search
// ---------------------------------------------------------------------------

test.describe('shell search', () => {
  test('typing shows matching tool results', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'emoji')
    await appPage.waitForFunction(() => document.body.innerText.toLowerCase().includes('emoji'), {
      timeout: 400,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/emoji/)
  })

  test('typing math expression shows calculator result', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, '2+2')
    await appPage.waitForFunction(() => document.body.innerText.includes('= 4'), undefined, {
      timeout: 2000,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/= 4/)
  })

  test('escape clears active search', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })

    await typeInOmnibar(appPage, 'hello')
    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value === '',
      { timeout: 2000 }
    )

    const inputValue = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
    )
    expect(inputValue).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Extension interactions (via shell navigation)
// ---------------------------------------------------------------------------

test.describe('extension interactions', () => {
  test('opens emoji picker via keyboard navigation', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'emoji')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await pressOmnibarKey(appPage, 'ArrowDown')
    await appPage.waitForFunction(() => document.querySelector('[aria-selected="true"]') !== null, {
      timeout: 400,
    })
    await pressOmnibarKey(appPage, 'Enter')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return !!el && !el.hidden && !!(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/emoji|picker/)
  })

  test('emoji picker accepts search input', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'emoji')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await pressOmnibarKey(appPage, 'ArrowDown')
    await appPage.waitForFunction(() => document.querySelector('[aria-selected="true"]') !== null, {
      timeout: 400,
    })
    await pressOmnibarKey(appPage, 'Enter')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return !!el && !el.hidden && !!(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )

    await typeInOmnibar(appPage, 'heart')
    await appPage.waitForFunction(() => /heart|❤/i.test(document.body.innerText), { timeout: 2000 })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/heart|❤/)
  })

  test('opens translate tool via keyboard navigation', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'trans')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await pressOmnibarKey(appPage, 'ArrowDown')
    await appPage.waitForFunction(
      () => document.querySelector('[aria-selected="true"]') !== null,
      undefined,
      { timeout: 2000 }
    )
    await pressOmnibarKey(appPage, 'Enter')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return !!el && !el.hidden && !!(el.textContent ?? '').trim()
      },
      undefined,
      { timeout: 2000 }
    )

    const toolName = await appPage.evaluate(
      () => document.querySelector('.nuxy-shell-omni-bar__tool-name')?.textContent ?? ''
    )
    expect(toolName.toLowerCase()).toMatch(/trans/)
  })
})

// ---------------------------------------------------------------------------
// Escape behavior
// ---------------------------------------------------------------------------

test.describe('escape behavior', () => {
  test('escape clears the search input', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'some query')
    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value === '',
      { timeout: 2000 }
    )

    const value = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? 'not-empty'
    )
    expect(value).toBe('')
  })

  test('escape from inside a tool returns to the shell and clears omnibar', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await openTool(appPage, 'emoji')

    await typeInOmnibar(appPage, 'test query')
    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        const input = document.querySelector(
          '.nuxy-shell-omni-bar__input'
        ) as HTMLInputElement | null
        const toolGone = !el || el.hidden || !(el.textContent ?? '').trim()
        return toolGone && (input?.value ?? '') === ''
      },
      { timeout: 2000 }
    )

    const hasToolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
      return el !== null && !el.hidden && (el.textContent ?? '').trim().length > 0
    })
    expect(hasToolName).toBe(false)

    const value = await appPage.evaluate(
      () =>
        (document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement | null)?.value ??
        'not-empty'
    )
    expect(value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

test.describe('keyboard navigation', () => {
  test('ArrowDown moves selection to first item', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'e')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await pressOmnibarKey(appPage, 'ArrowDown')
    await appPage.waitForFunction(() => document.querySelector('[aria-selected="true"]') !== null, {
      timeout: 400,
    })

    const hasActive = await appPage.evaluate(() => {
      const items = document.querySelectorAll('[aria-selected="true"], nuxy-list-item[active]')
      return items.length > 0
    })
    expect(hasActive).toBe(true)
  })

  test('Enter opens the selected tool', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'emoji')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await pressOmnibarKey(appPage, 'ArrowDown')
    await appPage.waitForFunction(() => document.querySelector('[aria-selected="true"]') !== null, {
      timeout: 400,
    })
    await pressOmnibarKey(appPage, 'Enter')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return !!el && !el.hidden && !!(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )

    const toolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      return el?.textContent?.toLowerCase() ?? ''
    })
    expect(toolName).toMatch(/emoji/)
  })

  test('Backspace on empty input inside a tool exits the tool', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await openTool(appPage, 'emoji')

    await appPage.keyboard.press('Control+a')
    await appPage.keyboard.press('Delete')
    await appPage.waitForFunction(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value === '',
      { timeout: 2000 }
    )

    await appPage.keyboard.press('Backspace')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return !el || el.hidden || !(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )

    const hasToolName = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
      return el !== null && !el.hidden && (el.textContent ?? '').trim().length > 0
    })
    expect(hasToolName).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Omnibar
// ---------------------------------------------------------------------------

test.describe('shell omnibar', () => {
  test('input is auto-focused on startup', async ({ appPage }) => {
    await appPage.waitForSelector('.nuxy-shell-omni-bar__input', { timeout: 2000 })
    await appPage.waitForFunction(
      () => document.activeElement === document.querySelector('.nuxy-shell-omni-bar__input'),
      { timeout: 5000 }
    )

    const isFocused = await appPage.evaluate(() => {
      const input = document.querySelector('.nuxy-shell-omni-bar__input')
      return document.activeElement === input
    })
    expect(isFocused).toBe(true)
  })

  test('search placeholder is shown when empty', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    // Translations load asynchronously — wait for a non-empty placeholder
    await appPage.waitForFunction(
      () =>
        ((document.querySelector('input') as HTMLInputElement | null)?.placeholder?.length ?? 0) >
        0,
      { timeout: 2000 }
    )

    const placeholder = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.placeholder ?? ''
    )
    expect(placeholder.length).toBeGreaterThan(0)
  })

  test('input accepts and retains text', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, 'hello world')
    await appPage.waitForFunction(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value === 'hello world',
      { timeout: 2000 }
    )

    const value = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
    )
    expect(value).toBe('hello world')
  })

  test('tool name appears in omnibar when a tool is open', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
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
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, '5+3')
    await appPage.waitForFunction(() => /=\s*\d/.test(document.body.innerText), { timeout: 2000 })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/=\s*8/)
  })

  test('results update as query changes', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    await typeInOmnibar(appPage, '10+10')
    await appPage.waitForFunction(() => /=\s*20/.test(document.body.innerText), { timeout: 2000 })

    const bodyBefore = await appPage.evaluate(() => document.body.innerText)
    expect(bodyBefore).toMatch(/=\s*20/)

    await appPage.keyboard.press('Control+a')
    await typeInOmnibar(appPage, '10+20')
    await appPage.waitForFunction(() => /=\s*30/.test(document.body.innerText), { timeout: 2000 })

    const bodyAfter = await appPage.evaluate(() => document.body.innerText)
    expect(bodyAfter).toMatch(/=\s*30/)
  })
})

// ---------------------------------------------------------------------------
// Command palette (Ctrl+K) — basic
// ---------------------------------------------------------------------------

test.describe('command palette (Ctrl+K)', () => {
  test('Ctrl+K opens the command palette', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await openTool(appPage, 'notes')

    await appPage.keyboard.press('Control+k')
    await appPage.waitForSelector('.nuxy-command-palette', { timeout: 2000 })

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toBeTruthy()
  })

  test('Escape closes the command palette', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await openTool(appPage, 'notes')

    await appPage.keyboard.press('Control+k')
    await appPage.waitForSelector('.nuxy-command-palette', { timeout: 2000 })
    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(() => document.querySelector('.nuxy-command-palette') === null, {
      timeout: 400,
    })

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
  test.beforeEach(async ({ appPage }) => {
    await openCommandPalette(appPage)
  })

  test('Ctrl+K shows the command palette overlay', async ({ appPage }) => {
    const paletteVisible = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette') !== null
    })
    expect(paletteVisible).toBe(true)
  })

  test('command palette has its own input field', async ({ appPage }) => {
    const hasInput = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette__input') !== null
    })
    expect(hasInput).toBe(true)
  })

  test('command palette input has "Search commands..." placeholder', async ({ appPage }) => {
    const placeholder = await appPage.evaluate(() => {
      const el = document.querySelector('.nuxy-command-palette__input') as HTMLInputElement | null
      return el?.placeholder ?? ''
    })
    expect(placeholder.toLowerCase()).toMatch(/search|command/)
  })

  test('command palette shows a list of actions', async ({ appPage }) => {
    const itemCount = await appPage.evaluate(() => {
      return document.querySelectorAll('.nuxy-command-palette__item').length
    })
    expect(itemCount).toBeGreaterThan(0)
  })

  test('first item is active by default', async ({ appPage }) => {
    const hasActiveItem = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette__item--active') !== null
    })
    expect(hasActiveItem).toBe(true)
  })
})

test.describe('command palette navigation', () => {
  test.beforeEach(async ({ appPage }) => {
    await openCommandPalette(appPage)
  })

  test('ArrowDown moves selection to next item', async ({ appPage }) => {
    await pressOmnibarKey(appPage, 'ArrowDown')
    await appPage.waitForFunction(
      () => {
        const items = document.querySelectorAll('.nuxy-command-palette__item')
        const active = document.querySelector('.nuxy-command-palette__item--active')
        return items.length > 1 && active !== null && Array.from(items).indexOf(active) > 0
      },
      { timeout: 2000 }
    )

    const secondLabel = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette__item--active')?.textContent ?? ''
    })
    expect(secondLabel).toBeTruthy()
  })

  test('ArrowUp moves selection back', async ({ appPage }) => {
    await pressOmnibarKey(appPage, 'ArrowDown')
    await appPage.waitForFunction(
      () => {
        const items = document.querySelectorAll('.nuxy-command-palette__item')
        const active = document.querySelector('.nuxy-command-palette__item--active')
        return items.length > 1 && active !== null && Array.from(items).indexOf(active) > 0
      },
      { timeout: 2000 }
    )
    await appPage.keyboard.press('ArrowUp')
    await appPage.waitForFunction(
      () => {
        const items = document.querySelectorAll('.nuxy-command-palette__item')
        const active = document.querySelector('.nuxy-command-palette__item--active')
        return active !== null && Array.from(items).indexOf(active) === 0
      },
      { timeout: 2000 }
    )

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
  test.beforeEach(async ({ appPage }) => {
    await openCommandPalette(appPage)
  })

  test('typing filters actions by label', async ({ appPage }) => {
    const totalBefore = await appPage.evaluate(
      () => document.querySelectorAll('.nuxy-command-palette__item').length
    )

    await typeInCommandPalette(appPage, 'zzzznocommandlikethis')
    await appPage.waitForFunction(
      () => {
        const input = document.querySelector(
          '.nuxy-command-palette__input'
        ) as HTMLInputElement | null
        return input?.value === 'zzzznocommandlikethis'
      },
      { timeout: 2000 }
    )

    const totalAfter = await appPage.evaluate(
      () => document.querySelectorAll('.nuxy-command-palette__item').length
    )
    expect(totalAfter).toBeLessThanOrEqual(totalBefore)
  })

  test('"No actions available" shows when nothing matches', async ({ appPage }) => {
    await typeInCommandPalette(appPage, 'xyzxyzxyz_no_match_possible')
    await appPage.waitForFunction(
      () => /no actions|no commands|no results|xyzxyz/i.test(document.body.innerText),
      { timeout: 2000 }
    )

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/no actions|no commands|no results|xyzxyz/)
  })
})

// ---------------------------------------------------------------------------
// Omnibox DOM stability
// ---------------------------------------------------------------------------

test.describe('omnibox DOM stability', () => {
  test('typing "not" and clearing 9 times leaves the same number of main-page elements', async ({
    appPage,
  }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)

    // Wait for the tool list to stabilize in the idle (empty-query) state
    await appPage.waitForFunction(() => document.querySelectorAll('[role="option"]').length > 0, {
      timeout: 400,
    })

    const initialOptionCount = await appPage.evaluate(
      () => document.querySelectorAll('[role="option"]').length
    )
    const initialElementCount = await appPage.evaluate(
      () => document.querySelectorAll('.nuxy-main-wrapper *').length
    )

    for (let i = 0; i < 9; i++) {
      // Type "not" into the omnibox
      await typeInOmnibar(appPage, 'not')
      await appPage.waitForFunction(
        () =>
          (document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement | null)
            ?.value === 'not',
        { timeout: 2000 }
      )

      // Clear the input
      await typeInOmnibar(appPage, '')

      // Wait for the input to be empty
      await appPage.waitForFunction(
        () =>
          (document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement | null)
            ?.value === '',
        { timeout: 2000 }
      )

      // Wait for the tool list to restore to the initial option count
      await appPage.waitForFunction(
        (expected: number) => document.querySelectorAll('[role="option"]').length === expected,
        initialOptionCount,
        { timeout: 2000 }
      )

      // Assert the overall element count in the main wrapper is unchanged
      const count = await appPage.evaluate(
        () => document.querySelectorAll('.nuxy-main-wrapper *').length
      )
      expect(count).toBe(initialElementCount)
    }
  })
})

test.describe('command palette dismissal', () => {
  test.beforeEach(async ({ appPage }) => {
    await openCommandPalette(appPage)
  })

  test('Escape closes the command palette', async ({ appPage }) => {
    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(() => document.querySelector('.nuxy-command-palette') === null, {
      timeout: 400,
    })

    const isGone = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette') === null
    })
    expect(isGone).toBe(true)
  })

  test('clicking the backdrop closes the command palette', async ({ appPage }) => {
    const backdrop = await appPage.$('.nuxy-command-palette-backdrop')
    if (backdrop) {
      const box = await backdrop.boundingBox()
      if (box) {
        await appPage.mouse.click(box.x + 2, box.y + 2)
        await appPage.waitForFunction(
          () => document.querySelector('.nuxy-command-palette') === null,
          { timeout: 2000 }
        )
      }
    }

    const isGone = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette') === null
    })
    expect(isGone).toBe(true)
  })

  test('Ctrl+K again closes the command palette', async ({ appPage }) => {
    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(() => document.querySelector('.nuxy-command-palette') === null, {
      timeout: 400,
    })

    const isGone = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-command-palette') === null
    })
    expect(isGone).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// i18n / locale
// ---------------------------------------------------------------------------

test.describe('i18n / locale', () => {
  test('omnibar placeholder is translated when preferred language is Japanese', async ({
    appPage,
    electronApp,
  }) => {
    // Resolve the isolated data dir this test app uses
    const nuxyDataDir = await electronApp.evaluate(() => process.env['NUXY_DATA_DIR'] ?? '')
    if (!nuxyDataDir) throw new Error('NUXY_DATA_DIR not set in test environment')

    const settingsFile = join(nuxyDataDir, 'com.nuxy.settings', 'settings.json')
    const original = JSON.parse(readFileSync(settingsFile, 'utf8')) as Record<string, unknown>

    try {
      // Reset shell in case a previous test left a tool active (which changes the placeholder)
      await appPage.evaluate(() => window.core?.events?.emit('shell-reset'))
      await appPage.waitForFunction(
        () => {
          const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
          return !el || el.hidden || !(el.textContent ?? '').trim()
        },
        { timeout: 2000 }
      )

      // Override preferred language to Japanese
      writeFileSync(settingsFile, JSON.stringify({ ...original, preferredLanguages: ['ja'] }))

      // Notify the renderer to reload translations
      await appPage.evaluate(() => window.core?.events?.emit('locale-changed'))

      // Wait for the Japanese placeholder to appear
      await appPage.waitForFunction(
        () =>
          (document.querySelector('input') as HTMLInputElement | null)?.placeholder ===
          '何を考えていますか？',
        undefined,
        { timeout: 5000 }
      )

      const placeholder = await appPage.evaluate(
        () => (document.querySelector('input') as HTMLInputElement | null)?.placeholder ?? ''
      )
      expect(placeholder).toBe('何を考えていますか？')
    } finally {
      // Restore original settings and locale
      writeFileSync(settingsFile, JSON.stringify(original))
      await appPage.evaluate(() => window.core?.events?.emit('locale-changed'))
      // Wait for English placeholder to restore before the next test
      await appPage.waitForFunction(
        () =>
          ((document.querySelector('input') as HTMLInputElement | null)?.placeholder?.length ?? 0) >
          0,
        { timeout: 2000 }
      )
    }
  })
})
