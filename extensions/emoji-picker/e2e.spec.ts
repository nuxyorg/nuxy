import { test, expect, type Page } from '../../src/e2e/fixtures.js'
import { resetShell } from '../e2e-helpers.js'

async function openEmojiPicker(page: import('@playwright/test').Page) {
  await resetShell(page)
  await page.keyboard.type('emoji')
  await page.waitForSelector('[role="option"]', { timeout: 400 })
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    () => document.querySelector('.nuxy-shell-omni-bar__tool-name') !== null,
    { timeout: 400 }
  )
}

test.describe('emoji picker', () => {
  test('keyboard navigation traverses grid sections correctly', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
    await openEmojiPicker(appPage)

    // Wait for emoji grid to fully render before navigating
    await appPage.waitForFunction(() => document.querySelector('.nuxy-grid') !== null, {
      timeout: 400,
    })

    // Focus the right panel (enters right grid at index 0, first category, Column 0)
    await appPage.keyboard.press('ArrowRight')

    // Find the active grid item
    const activeItem = appPage.locator('.nuxy-grid-item--active')
    await expect(activeItem).toBeVisible()

    // Get the grid item counts and dimensions of the rendered sections
    const gridLayout = await appPage.evaluate(() => {
      const grids = Array.from(document.querySelectorAll('.nuxy-grid'))
      return grids.map((grid, sectionIdx) => {
        const items = Array.from(grid.querySelectorAll('.nuxy-grid-item'))
        return {
          sectionIdx,
          count: items.length,
          rows: Math.ceil(items.length / 9),
          lastRowStartIdx: Math.floor((items.length - 1) / 9) * 9,
          firstEmoji: items[0].textContent || '',
          lastRowFirstEmoji: items[Math.floor((items.length - 1) / 9) * 9].textContent || '',
        }
      })
    })

    if (gridLayout.length < 2) {
      return
    }

    const firstSection = gridLayout[0]
    const secondSection = gridLayout[1]

    // We are at index 0 (Row 0, Column 0) of the first section.
    // Press ArrowDown (firstSection.rows - 1) times to reach the last row of the first section.
    for (let i = 0; i < firstSection.rows - 1; i++) {
      await appPage.keyboard.press('ArrowDown')
    }

    // Now we should be on the first element of the last row of the first section
    await expect(activeItem).toHaveText(firstSection.lastRowFirstEmoji)

    // Press ArrowDown once more to cross the boundary into the first element of the second section
    await appPage.keyboard.press('ArrowDown')
    await expect(activeItem).toHaveText(secondSection.firstEmoji)

    // Press ArrowUp once! We expect to go back to the first element of the last row of the first section!
    await appPage.keyboard.press('ArrowUp')
    await expect(activeItem).toHaveText(firstSection.lastRowFirstEmoji)
  })
})
