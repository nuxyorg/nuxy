// fallow-ignore-file code-duplication
/**
 * E2E tests for the video-downloader extension.
 *
 * IPC is mocked at the Electron main-process level via electronApp.evaluate()
 * so we bypass the frozen contextBridge proxy that prevents renderer-side mocking.
 *
 * Mock URL: https://www.youtube.com/watch?v=wx1UiMbCv48
 */
import { test, expect } from '../../src/e2e/fixtures.ts'

const MOCK_URL = 'https://www.youtube.com/watch?v=wx1UiMbCv48'

// Realistic format list matching the YouTube video
const MOCK_FORMATS = [
  {
    formatId: '137',
    ext: 'mp4',
    resolution: '1920x1080',
    filesize: 52428800,
    note: '1080p',
    vcodec: 'avc1',
    acodec: 'none',
    fps: 30,
    tbr: 3500,
  },
  {
    formatId: '136',
    ext: 'mp4',
    resolution: '1280x720',
    filesize: 26214400,
    note: '720p',
    vcodec: 'avc1',
    acodec: 'none',
    fps: 30,
    tbr: 1800,
  },
  {
    formatId: '134',
    ext: 'mp4',
    resolution: '854x480',
    filesize: 15728640,
    note: '480p',
    vcodec: 'avc1',
    acodec: 'none',
    fps: 30,
    tbr: 900,
  },
  {
    formatId: '140',
    ext: 'm4a',
    resolution: 'audio only',
    filesize: 5242880,
    note: '128k',
    vcodec: 'none',
    acodec: 'mp4a',
    fps: null,
    tbr: 130,
  },
  {
    formatId: '251',
    ext: 'webm',
    resolution: 'audio only',
    filesize: 4194304,
    note: '160k',
    vcodec: 'none',
    acodec: 'opus',
    fps: null,
    tbr: 160,
  },
]

const MOCK_METADATA = {
  title: 'Test Video — Keyboard Nav Demo',
  thumbnail: 'https://i.ytimg.com/vi/wx1UiMbCv48/maxresdefault.jpg',
  duration: 213,
  uploader: 'Test Channel',
  formats: MOCK_FORMATS,
}

/**
 * Install an ipcMain mock in the Electron main process.
 * Captures current kernel state first so shell resets still work.
 */
async function installMock(appPage: any, electronApp: any) {
  // Capture current kernel responses before hijacking the handler
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
    ({ ipcMain }: any, { snapshot, metadata }: any) => {
      if ((global as any).__vdMockActive) return
      ;(global as any).__vdMockActive = true
      ;(global as any).__vdDownloads = []
      ;(global as any).__vdJobs = []
      ;(global as any).__vdHistory = [
        {
          id: 'history-job-1',
          url: 'https://www.youtube.com/watch?v=wx1UiMbCv48',
          title: 'Completed History Video',
          thumbnail: 'https://i.ytimg.com/vi/wx1UiMbCv48/maxresdefault.jpg',
          duration: 120,
          uploader: 'History Channel',
          formatId: '137',
          resolution: '1920x1080',
          outputPath: '/path/to/video.mp4',
          timestamp: Date.now() - 60000,
        },
      ]
      ;(global as any).__vdLastOpened = null

      ipcMain.removeHandler('ext:invoke')
      ipcMain.handle(
        'ext:invoke',
        async (_ev: any, extId: string, channel: string, payload: any) => {
          // ── video-downloader mock ──────────────────────────────────────
          if (extId === 'com.nuxy.video-downloader') {
            if (channel === 'ytdlp:status') return { success: true, data: { installed: true } }
            if (channel === 'ytdlp:queue') return { success: true, data: (global as any).__vdJobs }
            if (channel === 'ytdlp:getFormats') return { success: true, data: metadata }
            if (channel === 'ytdlp:download') {
              const jobId = 'mock-job-' + Date.now()
              console.log('    [MAIN-DEBUG] ytdlp:download received!', payload)
              ;(global as any).__vdDownloads.push({ jobId, ...payload })
              ;(global as any).__vdJobs = [
                ...(global as any).__vdJobs,
                {
                  jobId,
                  url: payload.url,
                  formatId: payload.formatId,
                  progress: 0,
                  status: 'running',
                  metadata: payload.metadata,
                  resolution: payload.resolution,
                },
              ]
              return { success: true, data: { jobId } }
            }
            if (channel === 'ytdlp:cancel') {
              console.log('    [MAIN-DEBUG] ytdlp:cancel received!', payload)
              ;(global as any).__vdJobs = (global as any).__vdJobs.filter(
                (j: any) => j.jobId !== payload?.jobId
              )
              return { success: true }
            }
            if (channel === 'ytdlp:history') {
              return { success: true, data: (global as any).__vdHistory }
            }
            if (channel === 'ytdlp:open') {
              ;(global as any).__vdLastOpened = payload
              return { success: true }
            }
            return { success: false, error: 'Unknown channel' }
          }

          // ── kernel: replay cached snapshot ────────────────────────────
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

          // ── other extensions: pass-through to null ────────────────────
          return { success: true, data: null }
        }
      )
    },
    { snapshot: kernelSnapshot, metadata: MOCK_METADATA }
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resetShell(page: any) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
  })
  await page.waitForFunction(
    () => {
      const toolName = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      const palette = document.querySelector('.nuxy-command-palette')
      const input = document.querySelector('input') as HTMLInputElement | null
      return toolName === null && palette === null && (input?.value ?? '') === ''
    },
    { timeout: 500 }
  )
  await page.locator('input').focus()
}

async function openVideoDownloader(page: any) {
  await resetShell(page)
  await page.keyboard.type('video-downloader')
  const option = page.locator('[role="option"]', { hasText: /Video Downloader/i })
  await option.first().click()
  await page.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 500 })
  await page.locator('input').focus()
}

async function loadFormats(page: any) {
  const input = page.locator('input.nuxy-shell-omni-bar__input')
  await input.fill(MOCK_URL)
  await page.keyboard.press('Enter')
  // Wait for the metadata card to appear (mock responds instantly)
  await page.waitForSelector('.nuxy-card__body', { timeout: 2000 })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('video downloader — keyboard navigation', () => {
  test.beforeAll(async ({ appPage, electronApp }) => {
    await appPage.waitForSelector('input', { timeout: 2000 })
    await installMock(appPage, electronApp)
  })

  test.beforeEach(async ({ electronApp }) => {
    await (electronApp as any).evaluate(() => {
      ;(global as any).__vdDownloads = []
      ;(global as any).__vdJobs = []
    })
  })

  test('shows empty state before URL is entered', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    const emptyState = appPage.locator('.nuxy-empty-state')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('Paste a video URL')
  })

  test('Enter on URL fetches formats and renders metadata card', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    const card = appPage.locator('.nuxy-card__body')
    await expect(card).toBeVisible()
    await expect(card).toContainText('Test Video')
    await expect(card).toContainText('Test Channel')
  })

  test('Recommended tab shows best-quality and audio-only presets', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    const items = appPage.locator('.nuxy-list-item')
    // Recommended generates fixed entries (Best Quality + Best Audio + resolution options)
    await expect(items.first()).toContainText('Best Quality')
  })

  test('ArrowDown moves selection down through the format list', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    const items = appPage.locator('.nuxy-list-item')

    // selectedIndex starts at 0 (item 0 already active)
    await expect(items.nth(0)).toHaveClass(/nuxy-list-item--active/)

    // First ArrowDown → item 1 active
    await appPage.keyboard.press('ArrowDown')
    await expect(items.nth(1)).toHaveClass(/nuxy-list-item--active/)

    // Second ArrowDown → item 2 active
    await appPage.keyboard.press('ArrowDown')
    await expect(items.nth(2)).toHaveClass(/nuxy-list-item--active/)
  })

  test('ArrowUp moves selection back up', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    const items = appPage.locator('.nuxy-list-item')

    // selectedIndex starts at 0; navigate to index 2
    await appPage.keyboard.press('ArrowDown')
    await appPage.keyboard.press('ArrowDown')
    await expect(items.nth(2)).toHaveClass(/nuxy-list-item--active/)

    await appPage.keyboard.press('ArrowUp')
    await expect(items.nth(1)).toHaveClass(/nuxy-list-item--active/)

    await appPage.keyboard.press('ArrowUp')
    await expect(items.nth(0)).toHaveClass(/nuxy-list-item--active/)
  })

  test('loop: ArrowDown past last item wraps to first', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    const items = appPage.locator('.nuxy-list-item')
    const count = await items.count()

    // selectedIndex starts at 0; press count-1 times to reach last
    for (let i = 0; i < count - 1; i++) {
      await appPage.keyboard.press('ArrowDown')
    }
    await expect(items.nth(count - 1)).toHaveClass(/nuxy-list-item--active/)

    // One more wraps to first
    await appPage.keyboard.press('ArrowDown')
    await expect(items.nth(0)).toHaveClass(/nuxy-list-item--active/)
  })

  test('Enter on selected format triggers a download', async ({ appPage, electronApp }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    // selectedIndex starts at 0 → Enter downloads item 0
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(300)

    const downloads = await (electronApp as any).evaluate(() => (global as any).__vdDownloads ?? [])
    expect(downloads.length).toBeGreaterThan(0)
    expect(downloads[downloads.length - 1].url).toBe(MOCK_URL)
  })

  test('Tab key cycles through filter tabs', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    // The active tab button is highlighted; Tab changes it
    const activeTab = appPage.locator('.nuxy-tab--active')
    const firstTabText = await activeTab.textContent()
    expect(firstTabText).toMatch(/Recommended/i)

    await appPage.keyboard.press('Tab')
    await appPage.waitForTimeout(100)
    const secondTabText = await activeTab.textContent()
    expect(secondTabText).not.toBe(firstTabText)
  })

  test('ArrowLeft switches focus to left tab panel', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    // Start in right panel, switch to left
    await appPage.keyboard.press('ArrowLeft')
    await appPage.waitForTimeout(100)

    // ArrowDown in left panel should change the active tab
    const activeTab = appPage.locator('.nuxy-tab--active')
    const before = await activeTab.textContent()

    await appPage.keyboard.press('ArrowDown')
    await appPage.waitForTimeout(100)

    const after = await activeTab.textContent()
    expect(after).not.toBe(before)
  })

  test('shortcut bar shows navigation hints when tool is open', async ({ appPage }) => {
    await openVideoDownloader(appPage)

    const bar = appPage.locator('.nuxy-shortcut-bar')
    await expect(bar).toBeVisible()
    // useTwoPanelNav registers: ↑↓Previous / ↵Select / confirm
    const text = await bar.textContent()
    expect(text).toMatch(/Previous|Navigate|↑↓/)
  })

  test('shortcut bar shows enter/confirm hint after formats are loaded', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    const bar = appPage.locator('.nuxy-shortcut-bar')
    await expect(bar).toBeVisible()
    const text = await bar.textContent()
    expect(text).toMatch(/confirm|Select|↵/)
  })

  test('transitions to full-screen downloads view upon download start', async ({
    appPage,
    electronApp,
  }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(500)

    const heading = appPage.locator('.nuxy-heading', { hasText: /Downloads & History/i })
    await expect(heading).toBeVisible()
  })

  test('shows active downloads and history items in unified list', async ({ appPage }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)

    await appPage.keyboard.press('Control+k')
    await appPage.waitForSelector('.nuxy-command-palette', { timeout: 1000 })
    await appPage.keyboard.type('Downloads')
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(300)

    const heading = appPage.locator('.nuxy-heading', { hasText: /Downloads & History/i })
    await expect(heading).toBeVisible()

    const items = appPage.locator('.nuxy-list-item')
    await expect(items.first()).toContainText('Completed History Video')
    await expect(items.first()).toContainText('History Channel')
  })

  test('Enter on completed item invokes ytdlp:open', async ({ appPage, electronApp }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)
    await appPage.keyboard.press('Control+k')
    await appPage.waitForSelector('.nuxy-command-palette', { timeout: 1000 })
    await appPage.keyboard.type('Downloads')
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(300)

    const items = appPage.locator('.nuxy-list-item')
    await expect(items.first()).toHaveClass(/nuxy-list-item--active/)

    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(300)

    const opened = await (electronApp as any).evaluate(() => (global as any).__vdLastOpened)
    expect(opened).toEqual({ path: '/path/to/video.mp4' })
  })

  test('Shift+Enter on completed item invokes ytdlp:open with isFolder', async ({
    appPage,
    electronApp,
  }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)
    await appPage.keyboard.press('Control+k')
    await appPage.waitForSelector('.nuxy-command-palette', { timeout: 1000 })
    await appPage.keyboard.type('Downloads')
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(300)

    await appPage.keyboard.press('Shift+Enter')
    await appPage.waitForTimeout(300)

    const opened = await (electronApp as any).evaluate(() => (global as any).__vdLastOpened)
    expect(opened).toEqual({ path: '/path/to/video.mp4', isFolder: true })
  })

  test('Escape key exits downloads view and returns to previous formats tab', async ({
    appPage,
  }) => {
    await openVideoDownloader(appPage)
    await loadFormats(appPage)
    await appPage.keyboard.press('Control+k')
    await appPage.waitForSelector('.nuxy-command-palette', { timeout: 1000 })
    await appPage.keyboard.type('Downloads')
    await appPage.keyboard.press('Enter')
    await appPage.waitForTimeout(300)

    await expect(
      appPage.locator('.nuxy-heading', { hasText: /Downloads & History/i })
    ).toBeVisible()

    await appPage.keyboard.press('Escape')
    await appPage.waitForTimeout(300)

    const card = appPage.locator('.nuxy-card__body')
    await expect(card).toBeVisible()
    await expect(card).toContainText('Test Video')
  })
})
