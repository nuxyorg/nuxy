/** Browser-side shell tool state (CE keeps tool-name node in DOM, toggles hidden). */

function toolNamePattern(name: string): RegExp {
  return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

export async function typeInOmnibar(page: any, text: string): Promise<void> {
  const input = page.locator('.nuxy-shell-omni-bar__input')
  await input.click()
  await input.fill(text)
  await input.dispatchEvent('input', { bubbles: true })
  await page.waitForFunction(
    (t) => (document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement)?.value === t,
    text,
    { timeout: 2000 }
  )
}

/** Submit omnibar query — waits for React tool key actions to see the typed query. */
export async function submitOmnibar(page: any): Promise<void> {
  await page.waitForFunction(
    () => {
      const actions = (window as any).core?.shell?.getKeyActionsGetter()?.() ?? []
      const enter = actions.find((a: { key: string }) => a.key === 'Enter')
      if (!enter) return true
      return typeof enter.activeOn !== 'function' || enter.activeOn()
    },
    undefined,
    { timeout: 3000 }
  )
  await page.locator('.nuxy-shell-omni-bar__input').focus()
  await page.keyboard.press('Enter')
}

/** Shell keyboard nav listens on nuxy-shell-omni-bar; Playwright key presses on the inner input do not reach it reliably. */
export async function pressOmnibarKey(page: any, key: string): Promise<void> {
  await page.evaluate((k) => {
    document.querySelector('nuxy-shell-omni-bar')?.dispatchEvent(
      new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })
    )
  }, key)
}

export async function typeInCommandPalette(page: any, text: string): Promise<void> {
  const input = page.locator('.nuxy-command-palette__input')
  await input.click()
  await input.fill(text)
  await input.dispatchEvent('input', { bubbles: true })
}

export async function resetShell(page: any) {
  await page.evaluate(() => {
    window.core?.events?.emit('shell-reset')
  })
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
      const toolActive =
        el !== null && !el.hidden && (el.textContent ?? '').trim().length > 0
      const palette = document.querySelector('.nuxy-command-palette')
      const input = document.querySelector('.nuxy-shell-omni-bar__input') as HTMLInputElement | null
      return !toolActive && palette === null && (input?.value ?? '') === ''
    },
    undefined,
    { timeout: 2000 }
  )
  await page.waitForSelector('[role="option"]', { timeout: 2000 }).catch(() => {})
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

/** Click a tool row from omnibar results — avoids provider rows that also match the query. */
export async function clickToolOption(page: any, name: string): Promise<void> {
  const pattern = toolNamePattern(name)
  await page.waitForFunction(
    (toolName) => {
      const re = new RegExp(toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      for (const section of document.querySelectorAll('.nuxy-provider-section')) {
        const header = section.querySelector('.nuxy-provider-section__header span')?.textContent ?? ''
        if (!/^Tools$/i.test(header.trim())) continue
        for (const option of section.querySelectorAll('[role="option"]')) {
          if (re.test(option.textContent ?? '')) return true
        }
      }
      return false
    },
    name,
    { timeout: 3000 }
  )
  const toolsSection = page.locator('.nuxy-provider-section').filter({
    has: page.locator('.nuxy-provider-section__header span', { hasText: /^Tools$/i }),
  })
  await toolsSection.locator('[role="option"]').filter({ hasText: pattern }).first().click()
}

export async function waitForToolMounted(page: any, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const el = document.querySelector('.nuxy-shell-omni-bar__tool-name') as HTMLElement | null
      return !!el && !el.hidden && !!(el.textContent ?? '').trim()
    },
    undefined,
    { timeout }
  )
  await page.waitForFunction(
    () => {
      const host = document.querySelector('.nuxy-shell-tool-wrapper nuxy-tool-host')
      if (!host || host.classList.contains('nuxy-tool-host--loading')) return false
      if (host.childElementCount === 0) return false
      // React island tools register key actions after first paint (useEffect).
      if (host.querySelector('.nuxy-react-tool-island')) {
        return (window.core?.shell?.getKeyActionsGetter()?.()?.length ?? 0) > 0
      }
      return true
    },
    undefined,
    { timeout: 5000 }
  )
}

/** Notes edit textarea — scoped to avoid strict-mode collisions with stale nodes. */
export function notesTextarea(page: any) {
  return page.locator('.nuxy-shell-tool-wrapper .nuxy-two-panel__right textarea').first()
}

export async function openTool(page: any, name: string) {
  await resetShell(page)
  await typeInOmnibar(page, name)
  await clickToolOption(page, name)
  await waitForToolMounted(page)
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

export async function openCommandPalette(page: any) {
  await openTool(page, 'notes')
  await page.waitForFunction(
    () => (document.querySelector('.nuxy-shell-tool-wrapper nuxy-tool-host')?.childElementCount ?? 0) > 0,
    { timeout: 5000 }
  )
  // Register multiple palette actions (save, delete, …) by creating a note first.
  await page.keyboard.press('Control+n')
  await notesTextarea(page).waitFor({ state: 'visible', timeout: 3000 })
  await page.keyboard.press('Control+k')
  const input = page.locator('.nuxy-command-palette__input')
  await input.waitFor({ state: 'visible', timeout: 2000 })
  await input.click()
  await page.waitForFunction(
    () => document.activeElement?.classList.contains('nuxy-command-palette__input'),
    { timeout: 2000 }
  )
}
