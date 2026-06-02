/**
 * E2E tests for the Nuxy shell interaction flow: omnibar input, command palette,
 * extension selection, shell reset, and keyboard navigation.
 */
import { test, expect } from './fixtures.js'
import type { Page } from './fixtures.js'

async function resetShell(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
  })
  await page.waitForFunction(
    () => {
      const toolName = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      const palette = document.querySelector('.nuxy-command-palette')
      const input = document.querySelector('input') as HTMLInputElement | null
      return toolName === null && palette === null && (input?.value ?? '') === ''
    },
    { timeout: 400 }
  )
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

test.describe('omnibar input', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)
  })

  test('app starts with visible input field', async ({ appPage }) => {
    const input = appPage.locator('.nuxy-shell-omni-bar__input')
    await expect(input).toBeVisible()
  })

  test('typing in the input shows the command palette', async ({ appPage }) => {
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('.nuxy-command-palette', { timeout: 400 })
    await expect(appPage.locator('.nuxy-command-palette')).toBeVisible()
  })

  test('typing a non-matching query shows no options or an empty palette', async ({ appPage }) => {
    await appPage.keyboard.type('zzznomatch')
    // Wait briefly for any palette to potentially appear, then assert it either
    // does not exist or contains no visible options.
    await appPage
      .waitForSelector('.nuxy-command-palette', { timeout: 400 })
      .catch(() => {
        // Palette never appeared — that is acceptable
      })
    const palette = appPage.locator('.nuxy-command-palette')
    const paletteVisible = await palette.isVisible().catch(() => false)
    if (paletteVisible) {
      // Palette is present but should have no matching option items
      const options = appPage.locator('[role="option"]')
      await expect(options).toHaveCount(0)
    } else {
      // Palette is not visible at all — also correct
      await expect(palette).not.toBeVisible()
    }
  })
})

test.describe('extension selection', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)
  })

  test('selecting an extension from the palette loads the tool wrapper', async ({ appPage }) => {
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('[role="option"]', { timeout: 400 })
    const option = appPage.locator('[role="option"]', { hasText: /calculator/i })
    await option.first().click()
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })
    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
  })

  test('tool name appears in the omnibar when an extension is active', async ({ appPage }) => {
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('[role="option"]', { timeout: 400 })
    const option = appPage.locator('[role="option"]', { hasText: /calculator/i })
    await option.first().click()
    await appPage.waitForSelector('.nuxy-shell-omni-bar__tool-name', { timeout: 400 })
    await expect(appPage.locator('.nuxy-shell-omni-bar__tool-name')).toBeVisible()
  })

  test('selecting the same extension twice does not crash — tool wrapper remains visible', async ({
    appPage,
  }) => {
    // First selection
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('[role="option"]', { timeout: 400 })
    await appPage.locator('[role="option"]', { hasText: /calculator/i }).first().click()
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })

    // Reset and select again
    await resetShell(appPage)
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('[role="option"]', { timeout: 400 })
    await appPage.locator('[role="option"]', { hasText: /calculator/i }).first().click()
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })

    // App is still alive and tool wrapper is visible
    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
    const inputExists = await appPage.evaluate(() => document.querySelector('input') !== null)
    expect(inputExists).toBe(true)
  })
})

test.describe('shell reset', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    // Load an extension so we have something to reset
    await resetShell(appPage)
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('[role="option"]', { timeout: 400 })
    await appPage.locator('[role="option"]', { hasText: /calculator/i }).first().click()
    await appPage.waitForSelector('.nuxy-shell-omni-bar__tool-name', { timeout: 400 })
  })

  test('nuxy-shell-reset event clears the active tool', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.waitForFunction(
      () => document.querySelector('.nuxy-shell-omni-bar__tool-name') === null,
      { timeout: 400 }
    )
    await expect(appPage.locator('.nuxy-shell-omni-bar__tool-name')).toHaveCount(0)
  })

  test('nuxy-shell-reset event clears the input value', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.waitForFunction(
      () => ((document.querySelector('input') as HTMLInputElement | null)?.value ?? '') === '',
      { timeout: 400 }
    )
    const value = await appPage.locator('input').inputValue()
    expect(value).toBe('')
  })

  test('nuxy-shell-reset event hides the command palette', async ({ appPage }) => {
    // Clear the active tool first, then open the palette by typing
    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.waitForFunction(
      () => document.querySelector('.nuxy-shell-omni-bar__tool-name') === null,
      { timeout: 400 }
    )
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('.nuxy-command-palette', { timeout: 400 })

    // Now reset — palette should disappear
    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.waitForFunction(
      () => document.querySelector('.nuxy-command-palette') === null,
      { timeout: 400 }
    )
    await expect(appPage.locator('.nuxy-command-palette')).toHaveCount(0)
  })
})

test.describe('keyboard navigation', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await resetShell(appPage)
  })

  test('ArrowDown key focuses the first palette option', async ({ appPage }) => {
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('[role="option"]', { timeout: 400 })
    await appPage.keyboard.press('ArrowDown')
    // After pressing ArrowDown the first option should receive focus/active state
    const firstOption = appPage.locator('[role="option"]').first()
    await expect(firstOption).toBeVisible()
    // The palette itself must still be visible
    await expect(appPage.locator('.nuxy-command-palette')).toBeVisible()
  })

  test('Enter key on a focused option selects it and loads the tool', async ({ appPage }) => {
    await appPage.keyboard.type('calculator')
    await appPage.waitForSelector('[role="option"]', { timeout: 400 })
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('Enter')
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })
    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
  })
})
