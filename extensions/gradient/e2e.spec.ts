// fallow-ignore-file code-duplication
import { test, expect } from '../../src/e2e/fixtures.js'
import { resetShell, openTool } from '../e2e-helpers.js'

const openGradient = (page: any) => openTool(page, 'gradient')

test.describe('gradient extension', () => {
  test('shell gradient canvas element is present in the DOM', async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    const canvas = appPage.locator('#nuxy-shell-gradient-canvas')
    await expect(canvas).toBeAttached({ timeout: 5000 })
  })

  test('shell gradient canvas has non-zero width and height', async ({ appPage }) => {
    await appPage.waitForSelector('#nuxy-shell-gradient-canvas', { state: 'attached', timeout: 5000 })
    const dimensions = await appPage.evaluate(() => {
      const canvas = document.getElementById('nuxy-shell-gradient-canvas') as HTMLCanvasElement | null
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

  test('shell gradient canvas is hidden by default when no tool is active', async ({
    appPage,
  }) => {
    await resetShell(appPage)

    const container = appPage.locator('.nuxy-shell-container')
    await expect(container).not.toHaveClass(/nuxy-shell-container--gradient-active/)

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
        async (_ev: any, extId: string, channel: string, payload: any) => {
          if (extId === 'com.nuxy.ollama') {
            if (channel === 'models') {
              return { success: true, data: ['llama3'] }
            }
            if (channel === 'configure') {
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
    await resetShell(appPage)
    await appPage.keyboard.type('ollama')
    const option = appPage.locator('[role="option"]', { hasText: 'ollama' })
    await option.first().click()
    await appPage.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 500 })

    // Verify gradient is initially inactive/hidden
    const container = appPage.locator('.nuxy-shell-container')
    await expect(container).not.toHaveClass(/nuxy-shell-container--gradient-active/)
    const shellCanvas = appPage.locator('#nuxy-shell-gradient-canvas')
    await expect(shellCanvas).not.toBeVisible({ timeout: 1000 })

    // 2. Type a message and hit Enter
    const input = appPage.locator('.nuxy-shell-omni-bar__input')
    await input.focus()
    await appPage.keyboard.type('Hello, who are you?')
    await appPage.keyboard.press('Enter')

    // Expect the gradient class to be applied and canvas to become visible immediately during thinking state
    await expect(container).toHaveClass(/nuxy-shell-container--gradient-active/)
    await expect(shellCanvas).toBeVisible()

    // 3. Wait for thinking state to finish (mock response resolves after 4 seconds, so we wait up to 6 seconds)
    const mockMessage = appPage.getByText('This is a mock response from Llama.')
    await expect(mockMessage).toBeVisible({ timeout: 6000 })

    // Expect the gradient class to be removed and canvas to be hidden again
    await expect(container).not.toHaveClass(/nuxy-shell-container--gradient-active/)
    await expect(shellCanvas).not.toBeVisible({ timeout: 1000 })
  })
})
