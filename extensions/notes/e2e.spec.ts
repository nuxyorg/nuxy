import { test, expect } from '../../src/e2e/fixtures.ts'

async function resetShell(page: any) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
  })
  await page.waitForFunction(
    () => {
      const toolName = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      const input = document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement | null
      return toolName === null && (input?.value ?? '') === ''
    },
    { timeout: 2000 }
  )
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

async function openNotes(page: any) {
  await resetShell(page)
  console.log("Waiting for shell to load tools...")
  await page.locator('[role="option"]').first().waitFor({ state: 'visible', timeout: 5000 })
  console.log("Typing notes...")
  const input = page.locator('.nuxy-shell-omni-bar__input')
  await input.fill('notes')
  console.log("Waiting for option...")
  try {
    const option = page.locator('[role="option"]', { hasText: 'notes' })
    await option.first().waitFor({ state: 'visible', timeout: 5000 })
    console.log("Found option, clicking...")
    await option.first().click()
  } catch (err) {
    console.log("Failed to find/click notes option. HTML content:")
    console.log(await page.content())
    throw err
  }
  await page.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 2000 })
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

async function deleteAllNotes(page: any) {
  await page.evaluate(async () => {
    const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
    if (res?.success && Array.isArray(res.data)) {
      for (const note of res.data) {
        await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:delete', { id: note.id })
      }
    }
  })
}

test.describe('notes extension — keyboard navigation', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await deleteAllNotes(appPage)
    await openNotes(appPage)
  })

  test.afterEach(async ({ appPage }) => {
    await deleteAllNotes(appPage)
  })

  test('renders empty state with ⌃N hint when no notes exist', async ({ appPage }) => {
    const emptyState = appPage.locator('.nuxy-two-panel__left .nuxy-empty-state')
    await expect(emptyState).toBeVisible()
    const hint = emptyState.locator('.nuxy-empty-state__hint')
    await expect(hint).toContainText('⌃N')
  })

  test('no buttons are rendered (keyboard-only rule)', async ({ appPage }) => {
    const buttons = appPage.locator('.nuxy-shell-tool-wrapper button')
    await expect(buttons).toHaveCount(0)
  })

  test('Ctrl+N creates a new note', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    // There will be index 0 ("New Note") and index 1 (the new note)
    const items = appPage.locator('.nuxy-list-item')
    await expect(items).toHaveCount(2)
  })

  test('Ctrl+N creates note and opens it in right panel', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-textarea', { timeout: 2000 })
    const textarea = appPage.locator('.nuxy-textarea')
    await expect(textarea).toBeVisible()
  })

  test('arrow keys navigate the note list', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.keyboard.press('Control+n')
    await appPage.waitForFunction(
      () => document.querySelectorAll('.nuxy-list-item').length >= 3,
      { timeout: 3000 }
    )

    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown') // selects index 0 ("New Note")

    const active = appPage.locator('.nuxy-list-item--active')
    await expect(active).toHaveCount(1)
  })

  test('Enter on selected note opens it in the right panel', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 2000 })

    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown') // selects index 0 ("New Note")
    await appPage.keyboard.press('ArrowDown') // selects index 1 (the note)
    await appPage.keyboard.press('Enter')

    const textarea = appPage.locator('.nuxy-textarea')
    await expect(textarea).toBeVisible()
  })

  test('Ctrl+S saves body changes and derives title', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-textarea', { timeout: 2000 })

    const textarea = appPage.locator('.nuxy-textarea')
    await textarea.fill('Test Title\nTest body content')

    await appPage.keyboard.press('Control+s')
    await appPage.evaluate(() => new Promise((r) => setTimeout(r, 200)))

    const result = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
      return res?.data
    })
    expect(result.some((n: any) => n.title === 'Test Title')).toBe(true)
  })

  test('Delete key deletes the selected note', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    // Wait for the textarea to confirm handleNew() completed and editMode=true
    await appPage.waitForSelector('.nuxy-textarea', { timeout: 2000 })

    // Exit edit mode first to allow list navigation
    await appPage.keyboard.press('Escape')
    // Wait for the textarea to disappear (editMode=false committed)
    await appPage.waitForSelector('.nuxy-textarea', { state: 'detached', timeout: 2000 })

    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown') // selects index 0 ("New Note")
    await appPage.keyboard.press('ArrowDown') // selects index 1 (the note)

    const items = appPage.locator('.nuxy-list-item')
    await expect(items).toHaveCount(2)

    console.log('[DEBUG] Item 0 classes:', await items.nth(0).getAttribute('class'))
    console.log('[DEBUG] Item 1 classes:', await items.nth(1).getAttribute('class'))
    console.log('[DEBUG] Active element tag:', await appPage.evaluate(() => document.activeElement?.tagName))
    console.log('[DEBUG] Active element classes:', await appPage.evaluate(() => document.activeElement?.className))

    await appPage.keyboard.press('Delete')
    
    // Wait for the UI note list to update (only "New Note" remains)
    await expect(items).toHaveCount(1)
  })

  test('Delete key is inactive when no note is selected', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 2000 })

    // Exit edit mode first
    await appPage.keyboard.press('Escape')

    const countBefore = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
      return res?.data?.length ?? 0
    })

    // Focus omnibar so selection is reset to -1 (no note is selected in left list)
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('Delete')
    await appPage.evaluate(() => new Promise((r) => setTimeout(r, 100)))

    const countAfter = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
      return res?.data?.length ?? 0
    })
    expect(countAfter).toBe(countBefore)
  })

  test('Ctrl+S is inactive when no note is selected', async ({ appPage }) => {
    // Start with empty notes, no note selected
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('Control+s')
    await appPage.evaluate(() => new Promise((r) => setTimeout(r, 100)))

    const emptyState = appPage.locator('.nuxy-two-panel__right .nuxy-empty-state')
    await expect(emptyState).toBeVisible()
  })

  test('query prop filters notes list', async ({ appPage }) => {
    await appPage.evaluate(async () => {
      await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:create', {
        title: 'Alpha Note',
        body: '',
      })
      await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:create', {
        title: 'Beta Note',
        body: '',
      })
    })

    await appPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    })
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.type('alpha')

    const option = appPage.locator('[role="option"]', { hasText: 'notes' })
    await option.first().click()
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 2000 })

    const items = appPage.locator('.nuxy-list-item')
    // index 0 is "New Note", index 1 is Alpha Note
    await expect(items).toHaveCount(2)
    await expect(items.nth(1)).toContainText('Alpha Note')
  })

  test('two-panel layout renders left and right panels', async ({ appPage }) => {
    const twoPanel = appPage.locator('.nuxy-two-panel')
    await expect(twoPanel).toBeVisible()

    const left = appPage.locator('.nuxy-two-panel__left')
    const right = appPage.locator('.nuxy-two-panel__right')
    await expect(left).toBeVisible()
    await expect(right).toBeVisible()
  })

  test('saves note via provider click', async ({ appPage }) => {
    await resetShell(appPage)
    const input = appPage.locator('.nuxy-shell-omni-bar__input')
    await input.fill('something222')
    const option = appPage.locator('[role="option"]', { hasText: 'Save as note' })
    await option.first().waitFor({ state: 'visible', timeout: 5000 })
    await option.first().click()
    // Verify that notes tool opens and the note is created & selected
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 5000 })
    const items = appPage.locator('.nuxy-list-item')
    await expect(items).toHaveCount(2) // index 0 is "New Note", index 1 is "something222"
    await expect(items.nth(1)).toContainText('something222')
  })
})
