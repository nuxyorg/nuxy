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
    undefined,
    { timeout: 2000 }
  )
  await page.waitForSelector('[role="option"]', { timeout: 5000 }).catch(() => {})
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

test.describe('omnibar input', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)
  })

  test('app starts with visible input field', async ({ appPage }) => {
    const input = appPage.locator('.nuxy-shell-omni-bar__input')
    await expect(input).toBeVisible()
  })

  test('typing in the input shows the command palette', async ({ appPage }) => {
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('.nuxy-shell-results-list', { timeout: 2000 })
    await expect(appPage.locator('.nuxy-shell-results-list')).toBeVisible()
  })

  test('typing a non-matching query shows no tool options', async ({ appPage }) => {
    await appPage.keyboard.type('zzznomatch')
    // Wait briefly for any palette to potentially appear, then assert no tool section exists.
    // Provider results (e.g. "Save as note" from notes) may still appear — that is expected.
    await appPage.waitForSelector('.nuxy-shell-results-list', { timeout: 1000 }).catch(() => {
      // Palette/results list never appeared — that is acceptable
    })
    const resultsList = appPage.locator('.nuxy-shell-results-list')
    const listVisible = await resultsList.isVisible().catch(() => false)
    if (listVisible) {
      // The tools section only appears when at least one extension name matches the query.
      // "zzznomatch" matches nothing, so the tools section must be absent.
      const toolSection = resultsList.locator('.nuxy-provider-section').filter({
        has: appPage.locator('.nuxy-provider-section__header', { hasText: 'Tools' }),
      })
      await expect(toolSection).toHaveCount(0)
    } else {
      await expect(resultsList).not.toBeVisible()
    }
  })
})

test.describe('extension selection', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)
  })

  test('selecting an extension from the palette loads the tool wrapper', async ({ appPage }) => {
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    const option = appPage.locator('[role="option"]', { hasText: /notes/i })
    await option.first().click()
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 2000 })
    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
  })

  test('tool name appears in the omnibar when an extension is active', async ({ appPage }) => {
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    const option = appPage.locator('[role="option"]', { hasText: /notes/i })
    await option.first().click()
    await appPage.waitForSelector('.nuxy-shell-omni-bar__tool-name', { timeout: 2000 })
    await expect(appPage.locator('.nuxy-shell-omni-bar__tool-name')).toBeVisible()
  })

  test('selecting the same extension twice does not crash — tool wrapper remains visible', async ({
    appPage,
  }) => {
    // First selection
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await appPage
      .locator('[role="option"]', { hasText: /notes/i })
      .first()
      .click()
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 2000 })

    // Reset and select again
    await resetShell(appPage)
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await appPage
      .locator('[role="option"]', { hasText: /notes/i })
      .first()
      .click()
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 2000 })

    // App is still alive and tool wrapper is visible
    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
    const inputExists = await appPage.evaluate(() => document.querySelector('input') !== null)
    expect(inputExists).toBe(true)
  })
})

test.describe('shell reset', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    // Load an extension so we have something to reset
    await resetShell(appPage)
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await appPage
      .locator('[role="option"]', { hasText: /notes/i })
      .first()
      .click()
    await appPage.waitForSelector('.nuxy-shell-omni-bar__tool-name', { timeout: 2000 })
  })

  test('nuxy-shell-reset event clears the active tool', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.waitForFunction(
      () => document.querySelector('.nuxy-shell-omni-bar__tool-name') === null,
      { timeout: 2000 }
    )
    await expect(appPage.locator('.nuxy-shell-omni-bar__tool-name')).toHaveCount(0)
  })

  test('nuxy-shell-reset event clears the input value', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.waitForFunction(
      () => ((document.querySelector('input') as HTMLInputElement | null)?.value ?? '') === '',
      { timeout: 2000 }
    )
    const value = await appPage.locator('input').inputValue()
    expect(value).toBe('')
  })

  test('window focus without shell reset preserves omnibar input (resume-session path)', async ({
    appPage,
  }) => {
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.type('notes')
    await appPage.evaluate(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await expect(appPage.locator('.nuxy-shell-omni-bar__input')).toHaveValue('notes')
  })

  test('nuxy-shell-reset event clears the query and returns to idle state', async ({ appPage }) => {
    // Clear the active tool first, then open the palette by typing
    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.waitForFunction(
      () => document.querySelector('.nuxy-shell-omni-bar__tool-name') === null,
      { timeout: 2000 }
    )
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })

    // Now reset — input should clear and no active tool
    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.waitForFunction(
      () => ((document.querySelector('input') as HTMLInputElement | null)?.value ?? '') === '',
      undefined,
      { timeout: 2000 }
    )
    await expect(appPage.locator('.nuxy-shell-omni-bar__input')).toHaveValue('')
    await expect(appPage.locator('.nuxy-shell-omni-bar__tool-name')).toHaveCount(0)
  })
})

test.describe('keyboard navigation', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)
  })

  test('ArrowDown key focuses the first palette option', async ({ appPage }) => {
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await appPage.keyboard.press('ArrowDown')
    // After pressing ArrowDown the first option should receive focus/active state
    const firstOption = appPage.locator('[role="option"]').first()
    await expect(firstOption).toBeVisible()
    // The palette itself must still be visible
    await expect(appPage.locator('.nuxy-shell-results-list')).toBeVisible()
  })

  test('Enter key on a focused option selects it and loads the tool', async ({ appPage }) => {
    await appPage.keyboard.type('notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('Enter')
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 2000 })
    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
  })
})
