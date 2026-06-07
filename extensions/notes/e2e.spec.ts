import { test, expect } from '../../src/e2e/fixtures.js'

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
  await page.locator('[role="option"]').first().waitFor({ state: 'visible', timeout: 5000 })
  const input = page.locator('.nuxy-shell-omni-bar__input')
  await input.fill('notes')
  const option = page.locator('[role="option"]', { hasText: 'notes' })
  await option.first().waitFor({ state: 'visible', timeout: 2000 })
  await option.first().click()
  await page.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 5000 })
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
    await appPage.waitForFunction(() => document.querySelectorAll('.nuxy-list-item').length >= 3, {
      timeout: 3000,
    })

    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown') // selects index 0 ("New Note")

    const active = appPage.locator('.nuxy-list-item--active')
    await expect(active).toHaveCount(1)
  })

  test('Enter on selected note opens it in the right panel', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    // Ctrl+N enters editMode=true (textarea visible, left panel hidden)
    await appPage.waitForSelector('.nuxy-textarea', { timeout: 2000 })

    // Exit edit mode so the list becomes navigable
    await appPage.keyboard.press('Escape')
    await appPage.waitForSelector('.nuxy-textarea', { state: 'detached', timeout: 2000 })

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

    // Poll until the saved note appears in the backend
    await expect(async () => {
      const result = await appPage.evaluate(async () => {
        const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
        return res?.data
      })
      expect(result.some((n: any) => n.title === 'Test Title')).toBe(true)
    }).toPass({ timeout: 2000 })
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

    await appPage.keyboard.press('Delete')

    // Wait for the UI note list to update (only "New Note" remains)
    await expect(items).toHaveCount(1)
  })

  test('Delete key is inactive when no note is selected', async ({ appPage }) => {
    // beforeEach deleted all notes — selectedIndex starts at -1, nothing is selected
    const countBefore = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
      return res?.data?.length ?? 0
    })
    expect(countBefore).toBe(0)

    await appPage.keyboard.press('Delete')

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

    const emptyState = appPage.locator('.nuxy-two-panel__right .nuxy-empty-state')
    await expect(emptyState).toBeVisible()
  })

  test('query prop filters notes list', async ({ appPage }) => {
    // Create notes while Notes is already open (beforeEach opened it)
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

    // Re-open Notes to pick up the newly created notes (fresh mount re-fetches list)
    await resetShell(appPage)
    await appPage.keyboard.type('note')
    const toolOption = appPage.locator('[role="option"]', { hasText: /notes/i })
    await toolOption.first().waitFor({ state: 'visible', timeout: 2000 })
    await toolOption.first().click()
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 2000 })

    // Wait for 3 items: New Note + Alpha Note + Beta Note
    await appPage.waitForFunction(
      () => document.querySelectorAll('.nuxy-list-item').length >= 3,
      undefined,
      { timeout: 2000 }
    )

    // Type 'alpha' in the omnibar while Notes is active — Notes uses query prop to filter
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.type('alpha')

    // Notes should filter to show only Alpha Note (+ New Note header)
    await appPage.waitForFunction(
      () => document.querySelectorAll('.nuxy-list-item').length === 2,
      undefined,
      { timeout: 2000 }
    )

    const items = appPage.locator('.nuxy-list-item')
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
