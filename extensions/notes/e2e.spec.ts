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
    { timeout: 400 }
  )
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

async function openNotes(page: any) {
  await resetShell(page)
  await page.keyboard.type('notes')
  const option = page.locator('[role="option"]', { hasText: 'notes' })
  await option.first().click()
  await page.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })
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
    await appPage.waitForSelector('input', { timeout: 400 })
    await deleteAllNotes(appPage)
    await openNotes(appPage)
  })

  test.afterEach(async ({ appPage }) => {
    await deleteAllNotes(appPage)
  })

  test('renders empty state with ⌃N hint when no notes exist', async ({ appPage }) => {
    const emptyState = appPage.locator('.nuxy-empty-state')
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
    const listItem = appPage.locator('.nuxy-list-item').first()
    await expect(listItem).toBeVisible({ timeout: 1000 })
  })

  test('Ctrl+N creates note and opens it in right panel', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-textarea', { timeout: 1000 })
    const textarea = appPage.locator('.nuxy-textarea')
    await expect(textarea).toBeVisible()
  })

  test('arrow keys navigate the note list', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.keyboard.press('Control+n')
    await appPage.waitForFunction(
      () => document.querySelectorAll('.nuxy-list-item').length >= 2,
      { timeout: 2000 }
    )

    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown')

    const active = appPage.locator('.nuxy-list-item--active')
    await expect(active).toHaveCount(1)
  })

  test('Enter on selected note opens it in the right panel', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 1000 })

    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('Enter')

    const textarea = appPage.locator('.nuxy-textarea')
    await expect(textarea).toBeVisible()
  })

  test('Ctrl+S saves title and body changes', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-input', { timeout: 1000 })

    const titleInput = appPage.locator('.nuxy-input').first()
    await titleInput.fill('Test Title')

    const textarea = appPage.locator('.nuxy-textarea')
    await textarea.fill('Test body content')

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
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 1000 })

    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('Enter')

    const countBefore = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
      return res?.data?.length ?? 0
    })

    await appPage.keyboard.press('Delete')
    await appPage.evaluate(() => new Promise((r) => setTimeout(r, 200)))

    const countAfter = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
      return res?.data?.length ?? 0
    })
    expect(countAfter).toBe(countBefore - 1)
  })

  test('Delete key is inactive when no note is selected', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 1000 })

    const countBefore = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
      return res?.data?.length ?? 0
    })

    await appPage.keyboard.press('Delete')
    await appPage.evaluate(() => new Promise((r) => setTimeout(r, 100)))

    const countAfter = await appPage.evaluate(async () => {
      const res = await (window as any).core.ipc.invoke('com.nuxy.notes', 'notes:list', {})
      return res?.data?.length ?? 0
    })
    expect(countAfter).toBe(countBefore)
  })

  test('Ctrl+S is inactive when no note is selected', async ({ appPage }) => {
    await appPage.keyboard.press('Control+n')
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 1000 })

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
    await appPage.waitForSelector('.nuxy-list-item', { timeout: 400 })

    const items = appPage.locator('.nuxy-list-item')
    await expect(items).toHaveCount(1)
    await expect(items.first()).toContainText('Alpha Note')
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
