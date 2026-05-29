import { test, expect } from '../../src/e2e/fixtures.js'

async function resetShell(page: any) {
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
  await page.locator('input').focus()
}

async function openVideoDownloader(page: any) {
  await resetShell(page)
  await page.keyboard.type('video-downloader')
  const option = page.locator('[role="option"]', { hasText: /Video Downloader/i })
  await option.first().click()
  await page.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })
  await page.locator('input').focus()
}

test.describe('video downloader tool', () => {
  test('opens and shows empty state prompt', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 1000 })
    await openVideoDownloader(appPage)

    // Verify the empty state is rendered
    const emptyState = appPage.locator('.nuxy-empty-state')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('Paste a video URL')
  })

  test('typing a URL and pressing Enter shows loading state', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 1000 })
    await openVideoDownloader(appPage)

    // Type URL into the omnibar
    const input = appPage.locator('input.nuxy-shell-omni-bar__input')
    await input.fill('https://youtube.com/watch?v=dQw4w9WgXcQ')

    // Press Enter to trigger format fetch
    await appPage.keyboard.press('Enter')

    // The extension should exit the empty state and show a loading/error indicator
    // (yt-dlp is not installed in CI, so we expect either a loading or error state)
    const emptyState = appPage.locator('.nuxy-empty-state')
    // After pressing Enter, the empty state should disappear (loading starts)
    await appPage.waitForFunction(
      () => {
        const es = document.querySelector('.nuxy-empty-state')
        if (!es) return true // gone — loading started
        const txt = es.textContent ?? ''
        // It may show an error state if yt-dlp not installed; that's also acceptable
        return txt.includes('not installed') || txt.includes('error') || txt.includes('Error')
      },
      { timeout: 2000 }
    )

    // Shortcut bar should still be visible with navigation hints
    const shortcutBar = appPage.locator('.nuxy-shortcut-bar')
    await expect(shortcutBar).toBeVisible()
  })

  test('keyboard shortcut bar shows expected hints when tool is open', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 1000 })
    await openVideoDownloader(appPage)

    const shortcutBar = appPage.locator('.nuxy-shortcut-bar')
    await expect(shortcutBar).toBeVisible()

    // Should contain navigation and tab hints
    const barText = await shortcutBar.textContent()
    expect(barText).toMatch(/Navigate|Tab/)
  })

  test('Alt+1, Alt+2, Alt+3 tab shortcuts do not crash the tool', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 1000 })
    await openVideoDownloader(appPage)

    // Press each tab shortcut — should not crash (tool stays open)
    await appPage.keyboard.press('Alt+1')
    await appPage.waitForTimeout(50)
    await appPage.keyboard.press('Alt+2')
    await appPage.waitForTimeout(50)
    await appPage.keyboard.press('Alt+3')
    await appPage.waitForTimeout(50)

    // Tool wrapper should still be present
    const wrapper = appPage.locator('.nuxy-shell-tool-wrapper')
    await expect(wrapper).toBeVisible()
  })

  test('arrow key navigation does not crash when no formats are loaded', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 1000 })
    await openVideoDownloader(appPage)

    // Arrow keys pressed before any formats are loaded should be no-ops (no crash)
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('ArrowUp')
    await appPage.waitForTimeout(50)

    // Tool should still be visible
    const wrapper = appPage.locator('.nuxy-shell-tool-wrapper')
    await expect(wrapper).toBeVisible()
  })
})
