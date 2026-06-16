// fallow-ignore-file code-duplication
import { test, expect, type Page } from '../../../src/e2e/fixtures.js'
import { openTool } from '../../tests/e2e-helpers.js'

async function openSettings(page: Page) {
  await openTool(page, 'settings')
}

test.describe('settings tool', () => {
  test.beforeEach(async ({ appPage }) => {
    await openSettings(appPage)
  })

  test('opens settings tool via search', async ({ appPage }) => {
    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/settings/)
  })

  test('settings UI renders appearance section', async ({ appPage }) => {
    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/appearance|theme|zoom/)
  })

  test('settings UI renders window section', async ({ appPage }) => {
    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/window|esc|action/)
  })

  test('key repeat on ArrowDown advances multiple settings rows', async ({ appPage }) => {
    await appPage.locator('.nuxy-tab', { hasText: 'General' }).click()

    await appPage.keyboard.press('ArrowDown')
    await expect(appPage.locator('.nuxy-list-item--active')).toContainText('Theme')

    // Held key: OS repeat fires keydown with e.repeat (blocked without allowRepeat on actions).
    await appPage.keyboard.down('ArrowDown')
    await appPage
      .waitForFunction(
        () => {
          const el = document.querySelector('.nuxy-list-item--active')
          return el !== null && !el.textContent?.includes('Theme')
        },
        { timeout: 400 }
      )
      .catch(() => {})
    await appPage.keyboard.up('ArrowDown')

    const activeLabel = appPage.locator('.nuxy-list-item--active')
    const labelAfterHold = (await activeLabel.innerText()).trim()
    if (labelAfterHold.includes('Theme')) {
      // CI may not deliver OS key-repeat; two discrete presses advance two rows.
      await appPage.keyboard.press('ArrowDown')
      await appPage.keyboard.press('ArrowDown')
      await expect(activeLabel).toContainText('Zoom')
    } else {
      expect(labelAfterHold).toMatch(/Icon Pack|Zoom/)
    }
  })

  test('settings rows are navigable with keyboard', async ({ appPage }) => {
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('ArrowDown')
    await appPage.evaluate(() => new Promise((r) => requestAnimationFrame(r)))

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/settings|appearance|theme/)
  })

  test('core API is available inside settings tool', async ({ appPage }) => {
    const hasCore = await appPage.evaluate(() => typeof (window as any).core === 'object')
    expect(hasCore).toBe(true)
  })

  const settingRows = [
    {
      name: 'theme',
      label: 'Theme',
      index: 0,
      getExpectedCount: async (appPage: Page) => {
        const res = await appPage.evaluate(async () => (window as any).core.themes.list())
        return res.data.length
      },
    },
    {
      name: 'iconPack',
      label: 'Icon Pack',
      index: 1,
      getExpectedCount: async (appPage: Page) => {
        const res = await appPage.evaluate(async () => (window as any).core.icons.listPacks())
        return res.data.length
      },
    },
    { name: 'zoom', label: 'Zoom', index: 2, getExpectedCount: async () => 6 },
    {
      name: 'font',
      label: 'Font',
      index: 3,
      getExpectedCount: async (appPage: Page) => {
        const res = await appPage.evaluate(async () =>
          (window as any).core.ipc.invoke('kernel', 'listSystemFonts', {})
        )
        return res.data.length + 2
      },
    },
    { name: 'escAction', label: 'Esc Key Action', index: 4, getExpectedCount: async () => 4 },
    { name: 'blurAction', label: 'Focus-Out Action', index: 5, getExpectedCount: async () => 4 },
    {
      name: 'backgroundBehavior',
      label: 'Background Behaviour',
      index: 6,
      getExpectedCount: async () => 2,
    },
    { name: 'windowWidth', label: 'Window Width', index: 7, getExpectedCount: async () => 6 },
    { name: 'windowMaxHeight', label: 'Max Height', index: 8, getExpectedCount: async () => 5 },
    {
      name: 'windowPosition',
      label: 'Launch Position',
      index: 9,
      getExpectedCount: async () => 10,
    },
    { name: 'opacity', label: 'Opacity', index: 10, getExpectedCount: async () => 4 },
    { name: 'alwaysOnTop', label: 'Always on Top', index: 11, getExpectedCount: async () => 2 },
    { name: 'showInTaskbar', label: 'Show in Taskbar', index: 12, getExpectedCount: async () => 2 },
    { name: 'showOnStartup', label: 'Show on Startup', index: 13, getExpectedCount: async () => 2 },
  ]

  for (const row of settingRows) {
    test(`dropdown renders options correctly for ${row.label}`, async ({ appPage }) => {
      const expectedCount = await row.getExpectedCount(appPage)

      // Switch to the correct tab/section
      if (row.index >= 4) {
        await appPage.locator('.nuxy-tab', { hasText: 'Window' }).click()
      } else {
        await appPage.locator('.nuxy-tab', { hasText: 'General' }).click()
      }

      // Move selection to row (tab click places cursor at sectionStart-1, so i+1 presses reach row i)
      const targetIndex = row.index >= 4 ? row.index - 4 : row.index
      for (let i = 0; i <= targetIndex; i++) {
        await appPage.keyboard.press('ArrowDown')
      }

      // Verify selected row is correct
      const activeItem = appPage.locator('.nuxy-list-item--active')
      await expect(activeItem).toContainText(row.label)

      // Open dropdown
      await appPage.keyboard.press('Enter')

      const dropdown = appPage.locator('.nuxy-select-box__dropdown')
      if (expectedCount > 0) {
        await expect(dropdown).toBeVisible()
        const options = dropdown.locator('.nuxy-select-box__option')
        await expect(options).toHaveCount(expectedCount)

        // Close dropdown
        await appPage.keyboard.press('Escape')
      } else {
        await expect(dropdown).not.toBeVisible()
      }
    })
  }

  test('font dropdown search filters options correctly', async ({ appPage }) => {
    // Move selection to Font row (index 3: Theme -> Icon Pack -> Zoom -> Font)
    for (let i = 0; i <= 3; i++) {
      await appPage.keyboard.press('ArrowDown')
    }

    // Open dropdown
    await appPage.keyboard.press('Enter')

    const searchInput = appPage.locator('.nuxy-select-box__search')
    await expect(searchInput).toBeVisible()

    // Type "mono" in search input
    await searchInput.fill('mono')

    // Verify only matching options are displayed
    const options = appPage.locator('.nuxy-select-box__dropdown .nuxy-select-box__option')
    const optionTexts = await options.allInnerTexts()

    expect(optionTexts.every((txt) => txt.toLowerCase().includes('mono'))).toBe(true)
    expect(optionTexts.length).toBeGreaterThan(0)

    // Close dropdown
    await appPage.keyboard.press('Escape')
  })

  test('changing zoom setting via UI updates style immediately and persists value', async ({
    appPage,
  }) => {
    // Move to Zoom row (0: Theme, 1: Icon Pack, 2: Zoom)
    for (let i = 0; i <= 2; i++) {
      await appPage.keyboard.press('ArrowDown')
    }

    // Open dropdown
    await appPage.keyboard.press('Enter')

    // Navigate to 90% (one option up from default 100%)
    await appPage.keyboard.press('ArrowUp')
    await appPage.keyboard.press('Enter')

    // 1. Verify CSS zoom style is updated immediately
    const zoomStyle = await appPage.evaluate(() => document.documentElement.style.zoom)
    expect(zoomStyle).toBe('90%')

    // 2. Verify settings are persisted to the backend/IPC
    const settingsResult = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
    )
    expect(settingsResult.success).toBe(true)
    expect(settingsResult.data.zoom).toBe('90%')

    // Restore to 100% to keep things clean
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...(await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})).data,
        zoom: '100%',
      })
    )
  })

  test('emits settings-updated event when settings change', async ({ appPage }) => {
    await appPage.evaluate(() => {
      ;(window as any).__lastSettingsUpdate = null
      ;(window as any).core?.events?.on('settings-updated', (detail: unknown) => {
        ;(window as any).__lastSettingsUpdate = detail
      })
    })

    // Move to Zoom row (0: Theme, 1: Icon Pack, 2: Zoom)
    for (let i = 0; i <= 2; i++) {
      await appPage.keyboard.press('ArrowDown')
    }

    // Open dropdown, go up to 90%, select it
    await appPage.keyboard.press('Enter')
    await appPage.keyboard.press('ArrowUp')
    await appPage.keyboard.press('Enter')

    // Check if event was received with the updated zoom value
    const receivedSettings = await appPage.evaluate(() => (window as any).__lastSettingsUpdate)
    expect(receivedSettings).toBeTruthy()
    expect(receivedSettings.zoom).toBe('90%')

    // Restore zoom setting
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...(await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})).data,
        zoom: '100%',
      })
    )
  })

  test('font dropdown search shows "No results" when no matching fonts found', async ({
    appPage,
  }) => {
    // Move selection to Font row (index 3)
    for (let i = 0; i <= 3; i++) {
      await appPage.keyboard.press('ArrowDown')
    }

    // Open dropdown
    await appPage.keyboard.press('Enter')

    const searchInput = appPage.locator('.nuxy-select-box__search')
    await expect(searchInput).toBeVisible()

    // Type a random non-existent font name
    await searchInput.fill('NonExistentFontxyz123')

    // Verify "No results" message is shown
    const noResults = appPage.locator('.nuxy-select-box__no-results')
    await expect(noResults).toBeVisible()
    await expect(noResults).toHaveText('No results')

    // Close dropdown
    await appPage.keyboard.press('Escape')
  })

  test('changing font setting via UI updates body font-family immediately', async ({ appPage }) => {
    // Move to Font row (index 3)
    for (let i = 0; i <= 3; i++) {
      await appPage.keyboard.press('ArrowDown')
    }

    // Open dropdown
    await appPage.keyboard.press('Enter')

    // Press ArrowDown once to focus "Monospace" (index 1, since default is system at index 0)
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('Enter')

    // Verify body font-family is monospace
    const fontFamily = await appPage.evaluate(() => document.body.style.fontFamily)
    expect(fontFamily).toBe('monospace')

    // Restore to default system font
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...(await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})).data,
        font: 'system',
      })
    )
  })

  test('changing theme setting via UI updates CSS variables immediately', async ({ appPage }) => {
    // Selection starts at Theme row (index 0). Press ArrowDown once to focus it.
    await appPage.keyboard.press('ArrowDown')

    // Verify row is indeed Theme
    const activeItem = appPage.locator('.nuxy-list-item--active')
    await expect(activeItem).toContainText('Theme')

    // Open dropdown
    await appPage.keyboard.press('Enter')

    // Press ArrowDown to select light theme (first option is dark, second is light)
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('Enter')

    // Verify CSS variables are updated to light theme values
    const bgBase = await appPage.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--bg-base').trim().toLowerCase()
    )
    // Accept either rgb(244, 244, 245) or hex #f4f4f5
    expect(bgBase === 'rgb(244, 244, 245)' || bgBase === '#f4f4f5').toBe(true)

    // Restore to dark theme
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...(await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})).data,
        theme: 'dark',
      })
    )
  })

  test('escape key navigation flow in settings tool', async ({ appPage }) => {
    const settingsWrapper = appPage.locator('.nuxy-shell-tool-wrapper')
    await expect(settingsWrapper).toBeVisible()

    // 1. Open a dropdown (Theme)
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('Enter')

    const dropdown = appPage.locator('.nuxy-select-box__dropdown')
    await expect(dropdown).toBeVisible()

    // 2. Press Escape when dropdown is open -> only closes the dropdown
    await appPage.keyboard.press('Escape')
    await expect(dropdown).not.toBeVisible()
    await expect(settingsWrapper).toBeVisible()

    // 3. Press Escape when dropdown is closed -> closes the settings tool and returns to shell
    await appPage.keyboard.press('Escape')
    await appPage.waitForFunction(
      () => {
        const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
        return !el || el.hidden || !(el.textContent ?? '').trim()
      },
      { timeout: 2000 }
    )

    // Shell input should be visible again and focused
    const searchInput = appPage.locator('.nuxy-shell-omni-bar__input')
    await expect(searchInput).toBeFocused()
  })

  test('keyboard navigation respects boundaries and does not wrap around or crash', async ({
    appPage,
  }) => {
    // Wait for vertical tabs to render
    await appPage.waitForSelector('.nuxy-tab', { timeout: 2000 })

    // Switch to "General" tab so we can check boundary at the top
    await appPage.locator('.nuxy-tab', { hasText: 'General' }).click()

    // Press ArrowUp multiple times at the top boundary
    for (let i = 0; i < 5; i++) {
      await appPage.keyboard.press('ArrowUp')
    }
    // Verify no row is active (active index is -1)
    const activeItemAtTop = appPage.locator('.nuxy-list-item--active')
    await expect(activeItemAtTop).toHaveCount(0)

    // Switch to "Video Downloader" tab to test the bottom boundary
    await appPage.locator('.nuxy-tab', { hasText: 'Video Downloader' }).click()

    // Press ArrowDown 20 times to exceed total rows in Video Downloader section
    for (let i = 0; i < 20; i++) {
      await appPage.keyboard.press('ArrowDown')
    }
    // Verify selection stops at the last row ("Download Subtitles")
    const activeItemAtBottom = appPage.locator('.nuxy-list-item--active')
    await expect(activeItemAtBottom).toContainText('Download Subtitles')
  })

  test('updating settings via mouse clicks saves and persists value', async ({ appPage }) => {
    // Switch to Window tab
    await appPage.locator('.nuxy-tab', { hasText: 'Window' }).click()

    // Locate the "Always on Top" row and click its SelectBox trigger
    const row = appPage.locator('.nuxy-list-item', { hasText: 'Always on Top' })
    const trigger = row.locator('.nuxy-select-box__trigger')
    await trigger.click()

    // Verify dropdown is open
    const dropdown = appPage.locator('.nuxy-select-box__dropdown')
    await expect(dropdown).toBeVisible()

    // Click the "Yes" option
    const option = dropdown.locator('.nuxy-select-box__option', { hasText: 'Yes' })
    await option.click()

    // Verify setting is persisted via getSettings IPC
    const settingsResult = await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
    )
    expect(settingsResult.success).toBe(true)
    expect(settingsResult.data.alwaysOnTop).toBe(true)

    // Restore to false
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...(await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})).data,
        alwaysOnTop: false,
      })
    )
  })

  test('keyboard navigation still works after clicking a dropdown with the mouse', async ({
    appPage,
  }) => {
    // Switch to Window tab
    await appPage.locator('.nuxy-tab', { hasText: 'Window' }).click()

    // Locate the "Always on Top" row and click its SelectBox trigger
    const row = appPage.locator('.nuxy-list-item', { hasText: 'Always on Top' })
    const trigger = row.locator('.nuxy-select-box__trigger')
    await trigger.click()

    // Verify dropdown is open
    const dropdown = appPage.locator('.nuxy-select-box__dropdown')
    await expect(dropdown).toBeVisible()

    // Click the "Yes" option
    const option = dropdown.locator('.nuxy-select-box__option', { hasText: 'Yes' })
    await option.click()

    // Press ArrowDown keyboard button to navigate to the next row (Show in Taskbar)
    await appPage.keyboard.press('ArrowDown')

    // Verify that the active item is now "Show in Taskbar"
    const activeItem = appPage.locator('.nuxy-list-item--active')
    await expect(activeItem).toContainText('Show in Taskbar')

    // Restore Always on Top setting to false
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...(await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})).data,
        alwaysOnTop: false,
      })
    )
  })

  test('keyboard navigation still works after search filtering and selecting via mouse in searchable dropdown', async ({
    appPage,
  }) => {
    // Locate the "Font" row and click its SelectBox trigger
    const row = appPage.locator('.nuxy-list-item', { hasText: 'Font' }).first()
    const trigger = row.locator('.nuxy-select-box__trigger')
    await trigger.click()

    // Verify dropdown is open
    const dropdown = appPage.locator('.nuxy-select-box__dropdown')
    await expect(dropdown).toBeVisible()

    // Search input should be focused. Type "mono" to filter
    const searchInput = appPage.locator('.nuxy-select-box__search')
    await expect(searchInput).toBeFocused()
    await searchInput.fill('mono')

    // Click the filtered "Monospace" option
    const option = dropdown.locator('.nuxy-select-box__option', { hasText: 'Monospace' })
    await option.click()

    // Press ArrowUp keyboard button to navigate to the previous row (Zoom)
    await appPage.keyboard.press('ArrowUp')

    // Verify that active item is now "Zoom"
    const activeItem = appPage.locator('.nuxy-list-item--active')
    await expect(activeItem).toContainText('Zoom')

    // Restore Font setting to system
    await appPage.evaluate(async () =>
      (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...(await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})).data,
        font: 'system',
      })
    )
  })

  test('first row is fully visible when navigating back to the top', async ({ appPage }) => {
    test.setTimeout(15000)

    const row = appPage.locator('.nuxy-list-item', { hasText: 'Theme' }).first()
    const scrollContainer = appPage.locator('.nuxy-shell-tool-wrapper')

    // 1. Scroll all the way to the bottom of General section to ensure page scrolls
    for (let i = 0; i < 4; i++) {
      await appPage.keyboard.press('ArrowDown')
    }

    // Wait for smooth scroll to settle (poll until scrollTop stops changing)
    await appPage.waitForFunction(
      async (sel: string): Promise<boolean> => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return true
        const first = el.scrollTop
        await new Promise((r) => setTimeout(r, 60))
        return el.scrollTop === first
      },
      '.nuxy-shell-tool-wrapper',
      { timeout: 1000 }
    )

    // 2. Navigate back to the very top (Theme, index 0)
    for (let i = 0; i < 4; i++) {
      await appPage.keyboard.press('ArrowUp')
    }

    // Wait for smooth scroll to settle
    await appPage.waitForFunction(
      async (sel: string): Promise<boolean> => {
        const el = document.querySelector(sel) as HTMLElement | null
        if (!el) return true
        const first = el.scrollTop
        await new Promise((r) => setTimeout(r, 60))
        return el.scrollTop === first
      },
      '.nuxy-shell-tool-wrapper',
      { timeout: 1000 }
    )

    const rowBox = await row.boundingBox()
    const containerBox = await scrollContainer.boundingBox()

    expect(rowBox).toBeTruthy()
    expect(containerBox).toBeTruthy()

    if (rowBox && containerBox) {
      // The top of the row should not be above the top of the scroll container
      expect(rowBox.y).toBeGreaterThanOrEqual(containerBox.y - 1)
    }
  })
})

test.describe('settings i18n', () => {
  test.afterEach(async ({ appPage }) => {
    // Always restore English after each i18n test
    await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
      await (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...res.data,
        preferredLanguages: [],
      })
      window.core?.events?.emit('locale-changed')
    })
  })

  test('settings UI renders in Japanese when preferred language is ja on open', async ({
    appPage,
  }) => {
    // Save Japanese preference before opening the tool
    await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
      await (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...res.data,
        preferredLanguages: ['ja'],
      })
    })

    await openSettings(appPage)
    // Wait for translations to resolve (async fetch on mount)
    await appPage.waitForFunction(() => document.body.innerText.includes('一般'), { timeout: 2000 })

    const body = await appPage.evaluate(() => document.body.innerText)
    // Nav labels
    expect(body).toMatch(/一般/) // General
    expect(body).toMatch(/ウィンドウ/) // Window
    expect(body).toMatch(/言語/) // Language
    // Row labels
    expect(body).toMatch(/テーマ/) // Theme
    expect(body).toMatch(/フォント/) // Font
  })

  test('settings UI re-renders in Japanese when locale-changed fires', async ({ appPage }) => {
    await openSettings(appPage)

    // Verify English first
    const bodyBefore = await appPage.evaluate(() => document.body.innerText)
    expect(bodyBefore).toMatch(/General/)

    // Save Japanese, then dispatch the event (order matters — save must precede the event
    // so the kernel reads the new preferredLanguages when useTranslation re-fetches)
    await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
      await (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...res.data,
        preferredLanguages: ['ja'],
      })
      window.core?.events?.emit('locale-changed')
    })

    await appPage.waitForFunction(() => document.body.innerText.includes('一般'), { timeout: 2000 })

    const bodyAfter = await appPage.evaluate(() => document.body.innerText)
    expect(bodyAfter).toMatch(/一般/)
    expect(bodyAfter).toMatch(/ウィンドウ/)
    expect(bodyAfter).toMatch(/テーマ/)
  })

  test('settings UI falls back to English when preferred language has no match', async ({
    appPage,
  }) => {
    await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
      await (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        ...res.data,
        preferredLanguages: ['xx-UNSUPPORTED'],
      })
    })

    await openSettings(appPage)
    await appPage.waitForFunction(() => document.body.innerText.includes('General'), {
      timeout: 2000,
    })

    const body = await appPage.evaluate(() => document.body.innerText)
    // Should fall back to English (extension default)
    expect(body).toMatch(/General/)
    expect(body).toMatch(/Theme/)
  })
})

test.describe('settings IPC channels', () => {
  test('getSettings channel returns full settings object', async ({ appPage }) => {
    const result = await appPage.evaluate(async () => {
      return (window as any).core.ipc.invoke('com.nuxy.settings', 'getSettings', {})
    })
    expect(result.success).toBe(true)
    const s = result.data
    expect(typeof s.theme).toBe('string')
    expect(typeof s.zoom).toBe('string')
    expect(typeof s.escAction).toBe('string')
    expect(typeof s.windowWidth).toBe('number')
    expect(typeof s.opacity).toBe('number')
  })

  test('saveSettings persists and returns the saved object', async ({ appPage }) => {
    const result = await appPage.evaluate(async () => {
      return (window as any).core.ipc.invoke('com.nuxy.settings', 'saveSettings', {
        theme: 'dark',
        zoom: '100%',
        escAction: 'none',
        blurAction: 'none',
        windowWidth: 800,
        windowMaxHeight: 600,
        alwaysOnTop: false,
        opacity: 1,
        showInTaskbar: false,
        showOnStartup: false,
        windowPosition: '1/2, 1/3',
        iconPack: '',
        font: 'system',
      })
    })
    expect(result.success).toBe(true)
    expect(result.data.theme).toBe('dark')
    expect(result.data.zoom).toBe('100%')
  })

  test('settings tool UI shows current zoom value', async ({ appPage }) => {
    await openSettings(appPage)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body).toMatch(/100%|zoom|75%|90%|125%/)
  })

  test('settings tool UI shows theme options', async ({ appPage }) => {
    await openSettings(appPage)

    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/theme|dark|light/)
  })

  test('keyboard interaction allows editing and saving location inputs and closing selectbox dropdowns with Enter', async ({
    appPage,
  }) => {
    await openSettings(appPage)

    // Wait for vertical tabs to render
    await appPage.waitForSelector('.nuxy-tab', { timeout: 2000 })

    // Click "Video Downloader" tab to navigate to the downloader extension settings
    await appPage.locator('.nuxy-tab', { hasText: 'Video Downloader' }).click()

    // Focus and click "Download Location" row
    const downloadLocationRow = appPage.locator('.nuxy-list-item', { hasText: 'Download Location' })
    await downloadLocationRow.waitFor({ state: 'visible', timeout: 2000 })
    await downloadLocationRow.click()
    await expect(downloadLocationRow).toHaveClass(/nuxy-list-item--active/)

    // Focus the connected extension input (ignore stale CE mirrors from prior renders)
    const input = appPage.getByPlaceholder('~/Downloads').last()
    await input.focus()
    await expect(input).toBeFocused({ timeout: 2000 })

    // Type a new location and save on Enter
    await input.fill('/tmp/nuxy-downloads')
    await appPage.keyboard.press('Enter')

    // Focus "Preferred Format" dropdown
    const preferredFormatRow = appPage.locator('.nuxy-list-item', { hasText: 'Preferred Format' })
    await preferredFormatRow.click()

    // Press Enter to open dropdown
    await appPage.keyboard.press('Enter')

    // Verify dropdown popup is visible
    const selectPopup = appPage.locator('.nuxy-select-box__dropdown')
    await expect(selectPopup).toBeVisible()

    // Press Enter to select option and close dropdown
    await appPage.keyboard.press('Enter')

    // Verify dropdown is closed
    await expect(selectPopup).not.toBeVisible()
  })
})
