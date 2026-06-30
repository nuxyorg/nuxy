// fallow-ignore-file code-duplication
import { test, expect } from '../../../src/e2e/fixtures.js'

function toolNamePattern(name: string): RegExp {
  return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
}

async function typeInOmnibar(page: any, text: string): Promise<void> {
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
async function submitOmnibar(page: any): Promise<void> {
  await page.waitForFunction(
    () => {
      const actions = (window as any).core?.shell?.getShellActionsGetter()?.() ?? []
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

async function resetShell(page: any) {
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
async function clickToolOption(page: any, name: string): Promise<void> {
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

async function waitForToolMounted(page: any, timeout = 10000): Promise<void> {
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
        return (window.core?.shell?.getShellActionsGetter()?.()?.length ?? 0) > 0
      }
      return true
    },
    undefined,
    { timeout: 5000 }
  )
}

async function openTool(page: any, name: string) {
  await resetShell(page)
  await typeInOmnibar(page, name)
  await clickToolOption(page, name)
  await waitForToolMounted(page)
  await page.locator('.nuxy-shell-omni-bar__input').focus()
}

test.describe('gradient extension', () => {
  test('shell gradient canvas element is present in the DOM', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    const canvas = appPage.locator('#nuxy-shell-gradient-canvas')
    await expect(canvas).toBeAttached({ timeout: 5000 })
  })

  test('shell gradient canvas has non-zero width and height', async ({ appPage }) => {
    await appPage.waitForSelector('#nuxy-shell-gradient-canvas', {
      state: 'attached',
      timeout: 5000,
    })
    const dimensions = await appPage.evaluate(() => {
      const canvas = document.getElementById(
        'nuxy-shell-gradient-canvas'
      ) as HTMLCanvasElement | null
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      return { width: rect.width, height: rect.height }
    })

    expect(dimensions).not.toBeNull()
    expect(dimensions!.width).toBeGreaterThan(0)
    expect(dimensions!.height).toBeGreaterThan(0)
  })
})

test.describe('shell gradient border and glow', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 400 })
  })

  test('shell gradient canvas is hidden by default when no tool is active', async ({ appPage }) => {
    await resetShell(appPage)

    const container = appPage.locator('nuxy-shell')
    await expect(container).toHaveAttribute('gradient-mode', 'off')

    const shellCanvas = appPage.locator('#nuxy-shell-gradient-canvas')
    await expect(shellCanvas).not.toBeVisible({ timeout: 1000 })
  })
})

async function installOllamaMock(appPage: any, electronApp: any) {
  // Mock the Ollama HTTP streaming endpoint in the browser page
  await appPage.route('**/api/chat', async (route: any) => {
    // 3 seconds delay to allow E2E assertions to run while thinking/loading
    await new Promise((r) => setTimeout(r, 3000))
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: '{"message": {"content": "This is a mock response from Llama."}, "done": true}\n',
    })
  })

  const kernelSnapshot = await appPage.evaluate(async () => {
    const inv = (extId: string, ch: string, pl?: any) =>
      (window as any).core.ipc.invoke(extId, ch, pl)
    const [tools, providers, orchestrators, uikit, config] = await Promise.all([
      inv('kernel', 'listTools', {}),
      inv('kernel', 'listProviders', {}),
      inv('kernel', 'listOrchestrators', {}),
      inv('kernel', 'listUikitExtensions', {}),
      inv('kernel', 'getConfig', {}),
    ])
    return { tools, providers, orchestrators, uikit, config }
  })

  await (electronApp as any).evaluate(
    ({ ipcMain }: any, { snapshot }: any) => {
      const originalHandler = (ipcMain as any)._invokeHandlers?.get?.('ext:invoke')
      if (originalHandler) (global as any).__gradientOriginalHandler = originalHandler
      ;(global as any).__ollamaChatDelay = 4000
      // Replace handler directly in map to avoid removeHandler unregistering the IPC channel
      ;(ipcMain as any)._invokeHandlers?.set?.(
        'ext:invoke',
        async (_ev: any, extId: string, channel: string, _payload: any) => {
          if (extId === 'com.nuxy.ollama') {
            if (channel === 'models') {
              return { success: true, data: ['llama3'] }
            }
            if (channel === 'configure') {
              return { success: true }
            }
            if (channel === 'getConfig') {
              return {
                success: true,
                data: { host: 'http://localhost:11434', model: 'llama3', thinkingColor: 'light' },
              }
            }
            if (channel === 'history:load') {
              return { success: true, data: [] }
            }
            if (channel === 'history:save' || channel === 'history:clear') {
              return { success: true }
            }
            if (channel === 'chat') {
              const delay = (global as any).__ollamaChatDelay ?? 0
              if (delay > 0) {
                await new Promise((r) => setTimeout(r, delay))
              }
              return {
                success: true,
                data: { content: 'This is a mock response from Llama.' },
              }
            }
          }
          if (extId === 'kernel') {
            if (channel === 'listTools') return snapshot.tools
            if (channel === 'listProviders') return snapshot.providers
            if (channel === 'listOrchestrators') return snapshot.orchestrators
            if (channel === 'listUikitExtensions') return snapshot.uikit
            if (channel === 'getConfig') return snapshot.config
            if (channel === 'applyWindowSettings') return { success: true }
            if (channel === 'getTheme') return { success: true, data: {} }
            if (channel === 'getThemeByName') return { success: true, data: {} }
            if (channel === 'listThemes') return { success: true, data: [] }
            if (channel === 'getIcon') return { success: true, data: '<svg/>' }
            if (channel === 'listIconPacks') return { success: true, data: [] }
            if (channel === 'listSystemFonts') return { success: true, data: [] }
          }
          return { success: true, data: null }
        }
      )
    },
    { snapshot: kernelSnapshot }
  )
}

test.describe('ollama thinking gradient activation', () => {
  test.beforeAll(async ({ appPage, electronApp }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await installOllamaMock(appPage, electronApp)
  })

  test.afterAll(async ({ electronApp }) => {
    await (electronApp as any).evaluate(({ ipcMain }: any) => {
      const orig = (global as any).__gradientOriginalHandler
      if (orig) (ipcMain as any)._invokeHandlers?.set?.('ext:invoke', orig)
      ;(global as any).__gradientOriginalHandler = undefined
    })
  })

  test('opening ollama and submitting query triggers shell gradient border/glow during thinking state', async ({
    appPage,
  }) => {
    // 1. Reset shell and open Ollama
    await openTool(appPage, 'ollama')

    // Verify gradient is initially inactive/hidden
    const container = appPage.locator('nuxy-shell')
    await expect(container).toHaveAttribute('gradient-mode', 'off')
    const shellCanvas = appPage.locator('#nuxy-shell-gradient-canvas')
    await expect(shellCanvas).not.toBeVisible({ timeout: 1000 })

    // 2. Type a message and hit Enter
    await typeInOmnibar(appPage, 'Hello, who are you?')
    await submitOmnibar(appPage)

    // Expect the gradient class to be applied and canvas to become visible during thinking state
    await expect(container).toHaveAttribute('gradient-mode', 'light', { timeout: 5000 })
    await expect(shellCanvas).toBeVisible()

    // 3. Wait for thinking state to finish (mock response resolves after 4 seconds, so we wait up to 6 seconds)
    const mockMessage = appPage.getByText('This is a mock response from Llama.')
    await expect(mockMessage).toBeVisible({ timeout: 6000 })

    // Expect the gradient class to be removed and canvas to be hidden again
    await expect(container).toHaveAttribute('gradient-mode', 'off')
    await expect(shellCanvas).not.toBeVisible({ timeout: 1000 })
  })
})
