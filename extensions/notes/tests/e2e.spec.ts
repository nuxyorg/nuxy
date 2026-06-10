import { test, expect } from '../../../src/e2e/fixtures.js'
import {
  resetShell,
  openTool,
  notesTextarea,
  typeInOmnibar,
  waitForToolMounted,
} from '../../e2e-helpers.js'

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
    await openTool(appPage, 'notes')
  })

  test.afterEach(async ({ appPage }) => {
    await deleteAllNotes(appPage)
  })

  test('renders empty state with ⌃N hint when no notes exist', async ({ appPage }) => {
    const emptyState = appPage.locator('.nuxy-two-panel__left .nuxy-empty-state')
    await expect(emptyState).toBeVisible()
    const hint = emptyState.locator('.nuxy-empty-state__hint').first()
    await expect(hint).toContainText(/⌃N|create a new note/i)
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
    await expect(notesTextarea(appPage)).toBeVisible({ timeout: 2000 })
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
    await expect(notesTextarea(appPage)).toBeVisible({ timeout: 2000 })

    // Exit edit mode so the list becomes navigable
    await appPage.keyboard.press('Escape')
    await expect(notesTextarea(appPage)).toBeHidden({ timeout: 2000 })

    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown') // selects index 0 ("New Note")
    await appPage.keyboard.press('ArrowDown') // selects index 1 (the note)
    await appPage.keyboard.press('Enter')
    await expect(notesTextarea(appPage)).toBeVisible({ timeout: 3000 })
  })

  test('Ctrl+S saves body changes and derives title', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await expect(notesTextarea(appPage)).toBeVisible({ timeout: 2000 })

    const textarea = notesTextarea(appPage)
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
    await expect(notesTextarea(appPage)).toBeVisible({ timeout: 2000 })

    // Exit edit mode first to allow list navigation
    await appPage.keyboard.press('Escape')
    await expect(notesTextarea(appPage)).toBeHidden({ timeout: 2000 })

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
    await openTool(appPage, 'notes')

    // Wait for 3 items: New Note + Alpha Note + Beta Note
    await appPage.waitForFunction(
      () => document.querySelectorAll('.nuxy-list-item').length >= 3,
      undefined,
      { timeout: 2000 }
    )

    // Type 'alpha' in the omnibar while Notes is active — Notes uses query prop to filter
    await typeInOmnibar(appPage, 'alpha')

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
})

test.describe('notes provider', () => {
  test.beforeEach(async ({ appPage }) => {
    await deleteAllNotes(appPage)
  })

  test.afterEach(async ({ appPage }) => {
    await deleteAllNotes(appPage)
  })

  test('saves note via provider click', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await resetShell(appPage)
    await typeInOmnibar(appPage, 'something222')
    const option = appPage.locator('[role="option"]', { hasText: 'Save as note' })
    await option.first().waitFor({ state: 'visible', timeout: 5000 })
    await option.first().click()
    await waitForToolMounted(appPage)
    await expect(async () => {
      const items = appPage.locator('.nuxy-list-item')
      await expect(items).toHaveCount(2)
      await expect(items.nth(1)).toContainText('something222')
    }).toPass({ timeout: 10000 })
  })
})
