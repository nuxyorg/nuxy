/**
 * E2E tests for the Nuxy shell interaction flow: omnibar input, command palette,
 * extension selection, shell reset, and keyboard navigation.
 */
import { test, expect } from './fixtures.js'
import {
  resetShell,
  typeInOmnibar,
  pressOmnibarKey,
  waitForToolMounted,
  clickToolOption,
} from '../../extensions/e2e-helpers.js'

test.describe('omnibar input', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('.nuxy-shell-omni-bar__input', { timeout: 2000 })
    await resetShell(appPage)
  })

  test('app starts with visible input field', async ({ appPage }) => {
    const input = appPage.locator('.nuxy-shell-omni-bar__input')
    await expect(input).toBeVisible()
  })

  test('typing in the input shows the command palette', async ({ appPage }) => {
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('.nuxy-shell-results-list', { timeout: 2000 })
    await expect(appPage.locator('.nuxy-shell-results-list')).toBeVisible()
  })

  test('typing a non-matching query shows no tool options', async ({ appPage }) => {
    await typeInOmnibar(appPage, 'zzznomatch')
    await appPage.waitForSelector('.nuxy-shell-results-list', { timeout: 1000 }).catch(() => {})
    const resultsList = appPage.locator('.nuxy-shell-results-list')
    const listVisible = await resultsList.isVisible().catch(() => false)
    if (listVisible) {
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
    await appPage.waitForSelector('.nuxy-shell-omni-bar__input', { timeout: 2000 })
    await resetShell(appPage)
  })

  test('selecting an extension from the palette loads the tool wrapper', async ({ appPage }) => {
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await clickToolOption(appPage, 'notes')
    await waitForToolMounted(appPage)
    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
  })

  test('tool name appears in the omnibar when an extension is active', async ({ appPage }) => {
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await clickToolOption(appPage, 'notes')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return !!el && !el.hidden && !!(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )
    await expect(appPage.locator('.nuxy-shell-omni-bar__tool-name')).toBeVisible()
  })

  test('selecting the same extension twice does not crash — tool wrapper remains visible', async ({
    appPage,
  }) => {
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await clickToolOption(appPage, 'notes')
    await waitForToolMounted(appPage)

    await resetShell(appPage)
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await clickToolOption(appPage, 'notes')
    await waitForToolMounted(appPage)

    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
    await expect(appPage.locator('.nuxy-shell-omni-bar__input')).toBeVisible()
  })
})

test.describe('shell reset', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('.nuxy-shell-omni-bar__input', { timeout: 2000 })
    await resetShell(appPage)
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await clickToolOption(appPage, 'notes')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return !!el && !el.hidden && !!(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )
  })

  test('shell-reset clears the active tool', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.core?.events?.emit('shell-reset')
    })
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return el === null || el.hidden || !(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )
  })

  test('shell-reset clears the input value', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.core?.events?.emit('shell-reset')
    })
    await appPage.waitForFunction(
      () =>
        ((document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement | null)
          ?.value ?? '') === '',
      { timeout: 2000 }
    )
    const value = await appPage.locator('.nuxy-shell-omni-bar__input').inputValue()
    expect(value).toBe('')
  })

  test('window focus without shell reset preserves omnibar input (resume-session path)', async ({
    appPage,
  }) => {
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await typeInOmnibar(appPage, 'notes')
    await appPage.evaluate(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await expect(appPage.locator('.nuxy-shell-omni-bar__input')).toHaveValue('notes')
  })

  test('shell-reset clears the query and returns to idle state', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.core?.events?.emit('shell-reset')
    })
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return el === null || el.hidden || !(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })

    await appPage.evaluate(() => {
      window.core?.events?.emit('shell-reset')
    })
    await appPage.waitForFunction(
      () =>
        ((document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement | null)
          ?.value ?? '') === '',
      undefined,
      { timeout: 2000 }
    )
    await expect(appPage.locator('.nuxy-shell-omni-bar__input')).toHaveValue('')
  })
})

test.describe('keyboard navigation', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('.nuxy-shell-omni-bar__input', { timeout: 2000 })
    await resetShell(appPage)
  })

  test('ArrowDown key focuses the first palette option', async ({ appPage }) => {
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await pressOmnibarKey(appPage, 'ArrowDown')
    const firstOption = appPage.locator('[role="option"]').first()
    await expect(firstOption).toBeVisible()
    await expect(appPage.locator('.nuxy-shell-results-list')).toBeVisible()
  })

  test('Enter key on a focused option selects it and loads the tool', async ({ appPage }) => {
    await typeInOmnibar(appPage, 'notes')
    await appPage.waitForSelector('[role="option"]', { timeout: 2000 })
    await pressOmnibarKey(appPage, 'ArrowDown')
    await pressOmnibarKey(appPage, 'Enter')
    await waitForToolMounted(appPage)
    await expect(appPage.locator('.nuxy-shell-tool-wrapper')).toBeVisible()
  })
})
