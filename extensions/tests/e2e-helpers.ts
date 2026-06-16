/** Browser-side shell tool state (CE keeps tool-name node in DOM, toggles hidden). */

function getShellViewShadow(): ShadowRoot | null {
  return document.querySelector('nuxy-shell-view')?.shadowRoot ?? null
}

function getOmniBarInput(): HTMLInputElement | null {
  return (
    getShellViewShadow()
      ?.querySelector('nuxy-shell-omni-bar')
      ?.shadowRoot?.querySelector('.nuxy-shell-omni-bar__input') ?? null
  )
}

function getOmniBarToolName(): HTMLElement | null {
  return (
    getShellViewShadow()
      ?.querySelector('nuxy-shell-omni-bar')
      ?.shadowRoot?.querySelector('.nuxy-shell-omni-bar__tool-name') ?? null
  )
}

function getCommandPalette(): HTMLElement | null {
  return getShellViewShadow()?.querySelector('nuxy-command-palette') ?? null
}

function toolNamePattern(name: string): RegExp {
  return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

export async function typeInOmnibar(page: any, text: string): Promise<void> {
  const input = page.locator('.nuxy-shell-omni-bar__input')
  await input.click()
  await input.fill(text)
  await input.dispatchEvent('input', { bubbles: true })
  await page.waitForFunction(
    (t: string) => {
      const view = document.querySelector('nuxy-shell-view')
      const omni = view?.shadowRoot?.querySelector('nuxy-shell-omni-bar')
      const inp = omni?.shadowRoot?.querySelector(
        '.nuxy-shell-omni-bar__input'
      ) as HTMLInputElement | null
      return inp?.value === t
    },
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

export async function pressOmnibarKey(page: any, key: string): Promise<void> {
  await page.evaluate((k: string) => {
    const view = document.querySelector('nuxy-shell-view')
    const omni = view?.shadowRoot?.querySelector('nuxy-shell-omni-bar')
    const input = omni?.shadowRoot?.querySelector(
      '.nuxy-shell-omni-bar__input'
    ) as HTMLInputElement | null
    const target = input ?? omni
    target?.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
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
      const view = document.querySelector('nuxy-shell-view')
      const omni = view?.shadowRoot?.querySelector('nuxy-shell-omni-bar')
      const el = omni?.shadowRoot?.querySelector(
        '.nuxy-shell-omni-bar__tool-name'
      ) as HTMLElement | null
      const toolActive = el !== null && !el.hidden && (el.textContent ?? '').trim().length > 0
      const palette = view?.shadowRoot?.querySelector('nuxy-command-palette')
      const input = omni?.shadowRoot?.querySelector(
        '.nuxy-shell-omni-bar__input'
      ) as HTMLInputElement | null
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
    (toolName: string) => {
      const re = new RegExp(toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      const view = document.querySelector('nuxy-shell-view')
      const root = view?.shadowRoot
      if (!root) {
        console.log('E2E Debug: no nuxy-shell-view or shadowRoot found')
        return false
      }
      const sections = root.querySelectorAll('.nuxy-provider-section')
      console.log('E2E Debug: sections count =', sections.length)
      console.log('E2E Debug: controller query =', (view as any).controller?.state?.query)
      console.log('E2E Debug: controller savedQuery =', (view as any).controller?.state?.savedQuery)
      for (const section of sections) {
        console.log('E2E Debug: section HTML =', section.innerHTML)
        const headerEl = section.querySelector('.nuxy-provider-section__header span')
        const header = headerEl?.textContent ?? ''
        console.log('E2E Debug: found section header =', header.trim())
        if (!/^Tools$/i.test(header.trim())) continue
        const options = section.querySelectorAll('[role="option"]')
        console.log('E2E Debug: options count in Tools section =', options.length)
        for (const option of options) {
          const txt = option.textContent ?? ''
          console.log('E2E Debug: option text =', txt)
          if (re.test(txt)) return true
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
      const view = document.querySelector('nuxy-shell-view')
      const omni = view?.shadowRoot?.querySelector('nuxy-shell-omni-bar')
      const el = omni?.shadowRoot?.querySelector(
        '.nuxy-shell-omni-bar__tool-name'
      ) as HTMLElement | null
      console.log(
        'E2E Debug: waitForToolMounted - activeTool =',
        (view as any).controller?.state?.activeTool
      )
      console.log('E2E Debug: waitForToolMounted - tool-name text =', el?.textContent)
      console.log('E2E Debug: waitForToolMounted - tool-name hidden =', el?.hidden)
      return !!el && !el.hidden && !!(el.textContent ?? '').trim()
    },
    undefined,
    { timeout }
  )
  await page.waitForFunction(
    () => {
      const view = document.querySelector('nuxy-shell-view')
      const host = view?.shadowRoot?.querySelector('.nuxy-shell-tool-wrapper nuxy-tool-host')
      if (!host || host.hasAttribute('loading')) return false
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
    () => {
      const view = document.querySelector('nuxy-shell-view')
      const host = view?.shadowRoot?.querySelector('.nuxy-shell-tool-wrapper nuxy-tool-host')
      return (host?.childElementCount ?? 0) > 0
    },
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
    () => {
      const view = document.querySelector('nuxy-shell-view')
      let active = view?.shadowRoot?.activeElement
      if (active?.tagName?.toLowerCase() === 'nuxy-command-palette') {
        active = active.shadowRoot?.activeElement
      }
      return active?.classList?.contains('nuxy-command-palette__input')
    },
    { timeout: 2000 }
  )
}
