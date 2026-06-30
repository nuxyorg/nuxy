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
  await page
    .waitForSelector('[role="option"]', { timeout: 2000 })
    .catch((err: unknown) =>
      console.warn('[e2e] optional waitForSelector [role="option"] failed', err)
    )
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
      if (!root) return false
      const sections = root.querySelectorAll('.nuxy-shell-results-section')
      for (const section of sections) {
        const headerEl = section.querySelector('nuxy-section-header')
        const header = headerEl?.getAttribute('label') ?? ''
        if (!/^Tools$/i.test(header.trim())) continue
        const options = section.querySelectorAll('[role="option"]')
        for (const option of options) {
          const txt = option.textContent ?? ''
          if (re.test(txt)) return true
        }
      }
      return false
    },
    name,
    { timeout: 3000 }
  )
  const toolsSection = page.locator('.nuxy-shell-results-section').filter({
    has: page.locator('nuxy-section-header[label="Tools"]'),
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
      if (host.querySelector('.nuxy-react-tool-island')) {
        return (window.core?.shell?.getKeyActionsGetter()?.()?.length ?? 0) > 0
      }
      return true
    },
    undefined,
    { timeout: 5000 }
  )
}
