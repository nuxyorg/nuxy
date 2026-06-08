// fallow-ignore-file code-duplication
import { test, expect } from '../../src/e2e/fixtures.js'
import { resetShell, openTool, typeInOmnibar, waitForToolMounted } from '../e2e-helpers.js'

const MOCK_RESULTS = [
  {
    id: 'test-1',
    title: 'Test Anime S01E01 [1080p]',
    magnet: 'magnet:?xt=urn:btih:abc123&dn=Test+Anime',
    size: '1.23 GiB',
    date: '2023-11-14T00:00:00.000Z',
    seeds: 42,
    leeches: 7,
    category: 'Anime - English-translated',
    status: 'default' as const,
  },
  {
    id: 'test-2',
    title: 'Trusted Anime S02E01 [720p]',
    magnet: 'magnet:?xt=urn:btih:xyz789&dn=Trusted+Anime',
    size: '512.0 MiB',
    date: '2023-11-15T00:00:00.000Z',
    seeds: 150,
    leeches: 3,
    category: 'Anime - English-translated',
    status: 'success' as const,
  },
]

async function installNyaaMock(appPage: any, electronApp: any) {
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
    ({ ipcMain }: any, { snapshot, results }: any) => {
      const originalHandler = (ipcMain as any)._invokeHandlers?.get?.('ext:invoke')
      if (originalHandler) (global as any).__nyaaOriginalHandler = originalHandler

      ;(ipcMain as any)._invokeHandlers?.set?.(
        'ext:invoke',
        async (_ev: any, extId: string, channel: string, payload: any) => {
          if (extId === 'com.nuxy.nyaa') {
            if (channel === 'search') {
              return { success: true, data: results }
            }
            if (channel === 'getEnterAction') {
              return { success: true, data: 'copyMagnet' }
            }
            if (channel === 'copyMagnet') {
              return { success: true }
            }
            if (channel === 'copyMagnets') {
              return { success: true }
            }
            if (channel === 'downloadTorrent') {
              return { success: true }
            }
            if (channel === 'downloadTorrents') {
              return { success: true }
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
            // Let all other kernel channels fall through to the original handler
            if ((global as any).__nyaaOriginalHandler) {
              return (global as any).__nyaaOriginalHandler(_ev, extId, channel, payload)
            }
          }
          return { success: true, data: null }
        }
      )
    },
    { snapshot: kernelSnapshot, results: MOCK_RESULTS }
  )
}

async function restoreNyaaMock(electronApp: any) {
  await (electronApp as any).evaluate(({ ipcMain }: any) => {
    const orig = (global as any).__nyaaOriginalHandler
    if (orig) (ipcMain as any)._invokeHandlers?.set?.('ext:invoke', orig)
    ;(global as any).__nyaaOriginalHandler = undefined
  })
}

test.describe('nyaa extension — layout and empty state', () => {
  test.beforeEach(async ({ appPage }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await openTool(appPage, 'nyaa')
  })

  test('opens nyaa tool via search', async ({ appPage }) => {
    const body = await appPage.evaluate(() => document.body.innerText)
    expect(body.toLowerCase()).toMatch(/nyaa/)
  })

  test('renders two-panel layout', async ({ appPage }) => {
    const twoPanel = appPage.locator('nuxy-two-panel')
    await expect(twoPanel).toBeVisible()
  })

  test('shows empty state hint when no query is typed', async ({ appPage }) => {
    const emptyState = appPage.locator('nuxy-empty-state')
    await expect(emptyState.first()).toBeVisible()
    const text = await appPage.evaluate(() => document.body.innerText)
    expect(text.toLowerCase()).toMatch(/search nyaa|type a title|torrents/)
  })
})

test.describe('nyaa extension — search results (mocked)', () => {
  test.beforeAll(async ({ appPage, electronApp }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await installNyaaMock(appPage, electronApp)
  })

  test.afterAll(async ({ electronApp }) => {
    await restoreNyaaMock(electronApp)
  })

  test.beforeEach(async ({ appPage }) => {
    await openTool(appPage, 'nyaa')
    // Type a query so search triggers
    await typeInOmnibar(appPage, 'test anime')
    // Wait for results to appear (debounced 1s + render)
    await appPage.waitForFunction(
      () => document.querySelectorAll('nuxy-list-item').length >= 2,
      undefined,
      { timeout: 4000 }
    )
  })

  test('displays search results in the list', async ({ appPage }) => {
    const items = appPage.locator('nuxy-list-item')
    await expect(items).toHaveCount(2)
  })

  test('first result contains expected title', async ({ appPage }) => {
    const items = appPage.locator('nuxy-list-item')
    await expect(items.first()).toContainText('Test Anime S01E01')
  })

  test('ArrowDown selects first result', async ({ appPage }) => {
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown')

    const active = appPage.locator('nuxy-list-item[active]')
    await expect(active).toHaveCount(1)
    await expect(active.first()).toContainText('Test Anime S01E01')
  })

  test('right panel shows details when a result is selected', async ({ appPage }) => {
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown')

    // Right panel should show properties panel with details
    const propertiesPanel = appPage.locator('nuxy-properties-panel')
    await expect(propertiesPanel).toBeVisible({ timeout: 2000 })
  })

  test('right panel shows select prompt when no result is selected', async ({ appPage }) => {
    // No ArrowDown pressed — nothing selected
    const text = await appPage.evaluate(() => document.body.innerText)
    expect(text.toLowerCase()).toMatch(/select a result/)
  })

  test('ArrowUp after ArrowDown deselects and hides details', async ({ appPage }) => {
    await appPage.locator('.nuxy-shell-omni-bar__input').focus()
    await appPage.keyboard.press('ArrowDown')

    // Verify selection
    await expect(appPage.locator('nuxy-list-item[active]')).toHaveCount(1)

    // Arrow up to deselect
    await appPage.keyboard.press('ArrowUp')

    // No active item
    const active = appPage.locator('nuxy-list-item[active]')
    await expect(active).toHaveCount(0)
  })

  test('second result shows correct seeder/leecher info', async ({ appPage }) => {
    const items = appPage.locator('nuxy-list-item')
    const secondItem = items.nth(1)
    await expect(secondItem).toContainText('150S')
  })

  test('clicking a result selects it and shows details', async ({ appPage }) => {
    const items = appPage.locator('nuxy-list-item')
    await items.first().click()

    const active = appPage.locator('nuxy-list-item[active]')
    await expect(active).toHaveCount(1)

    const propertiesPanel = appPage.locator('nuxy-properties-panel')
    await expect(propertiesPanel).toBeVisible({ timeout: 2000 })
  })
})
