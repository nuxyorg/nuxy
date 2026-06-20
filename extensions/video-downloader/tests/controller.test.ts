import { describe, it, expect, vi, beforeEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      controlOmniBar: vi.fn(),
      setSearchPlaceholder: vi.fn(),
      setShellResetPaused: vi.fn(),
    },
    window: {
      setBlurSuppressed: vi.fn(),
      setBlurSuppressedSync: vi.fn().mockResolvedValue({ suppressed: true }),
      clearBlurSuppressed: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}) },
    deeplink: { dispatch: vi.fn().mockResolvedValue({ ok: true }) },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { flattenTranslations } from '@nuxyorg/core'
import { VideoDownloaderController } from '../controller.ts'
import type { VideoMetadata } from '../types.ts'
import enLocale from '../locales/en.json'

const enTranslations = flattenTranslations(enLocale)

const sampleMetadata: VideoMetadata = {
  title: 'Test Video',
  thumbnail: null,
  duration: 120,
  uploader: 'Uploader',
  formats: [
    {
      formatId: '137',
      ext: 'mp4',
      resolution: '1920x1080',
      filesize: 10_000_000,
      note: '1080p',
      vcodec: 'avc1',
      acodec: 'none',
    },
    {
      formatId: '140',
      ext: 'm4a',
      resolution: 'audio only',
      filesize: 1_000_000,
      note: 'audio',
      vcodec: 'none',
      acodec: 'mp4a',
    },
  ],
}

function mockInvoke(impl: (channel: string, payload?: unknown) => unknown): void {
  const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
  ipcInvoke.mockImplementation(async (_extId: string, channel: string, payload?: unknown) => {
    if (channel === 'getExtensionTranslations') {
      return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
    }
    try {
      return { success: true, data: await impl(channel, payload) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}

function actionByKey(controller: VideoDownloaderController, key: string) {
  return controller
    .getKeyActions()
    .find((action) => action.key === key && !action.modifiers?.length)
}

describe('VideoDownloaderController two-panel navigation', () => {
  beforeEach(() => {
    ;(window.core!.ipc!.invoke as ReturnType<typeof vi.fn>).mockReset()
    ;(window.core!.shell!.refreshShellActions as ReturnType<typeof vi.fn>).mockReset()
  })

  function setupWithMetadata(
    activeTab: VideoDownloaderController['state']['activeTab'] = 'recommended'
  ) {
    const controller = new VideoDownloaderController(() => {})
    controller.store.setState({
      url: 'https://example.com/watch?v=1',
      metadata: sampleMetadata,
      ytdlpInstalled: true,
      activeTab,
      selectedIndex: 0,
      focusedPanel: 'right',
    })
    return controller
  }

  it('keeps focus on the left panel when navigating tabs with arrow keys', () => {
    const controller = setupWithMetadata('video_audio')
    controller.store.setState({ focusedPanel: 'left', selectedIndex: -1 })

    actionByKey(controller, 'ArrowUp')?.handler()
    expect(controller.state.activeTab).toBe('recommended')
    expect(controller.state.focusedPanel).toBe('left')
    expect(controller.state.selectedIndex).toBe(-1)

    actionByKey(controller, 'ArrowDown')?.handler()
    expect(controller.state.activeTab).toBe('video_audio')
    expect(controller.state.focusedPanel).toBe('left')
  })

  it('moves focus to the right panel when Enter is pressed on the left panel', () => {
    const controller = setupWithMetadata()
    controller.store.setState({ focusedPanel: 'left', selectedIndex: -1 })

    actionByKey(controller, 'Enter')?.handler()

    expect(controller.state.focusedPanel).toBe('right')
    expect(controller.state.selectedIndex).toBe(0)
  })

  it('returns focus to the left panel from the first format row with ArrowUp', () => {
    const controller = setupWithMetadata()

    actionByKey(controller, 'ArrowUp')?.handler()

    expect(controller.state.focusedPanel).toBe('left')
    expect(controller.state.selectedIndex).toBe(-1)
  })

  it('opens the right panel when a tab is clicked', () => {
    const controller = setupWithMetadata()
    controller.store.setState({ focusedPanel: 'left', selectedIndex: -1 })

    controller.setActiveTab('audio_only')

    expect(controller.state.activeTab).toBe('audio_only')
    expect(controller.state.focusedPanel).toBe('right')
    expect(controller.state.selectedIndex).toBe(-1)
  })

  it('refreshes shell actions after formats are fetched', async () => {
    mockInvoke((channel) => {
      if (channel === 'status') return { installed: true }
      if (channel === 'getFormats') return sampleMetadata
      return null
    })

    const controller = new VideoDownloaderController(() => {})
    controller.connect()
    controller.store.setState({ url: 'https://example.com/watch?v=1' })
    ;(window.core!.shell!.refreshShellActions as ReturnType<typeof vi.fn>).mockClear()

    await controller.getFormats()

    expect(controller.state.metadata).not.toBeNull()
    expect(window.core!.shell!.refreshShellActions).toHaveBeenCalled()
    controller.disconnect()
  })

  it('redirects to the download manager after queuing a download', async () => {
    mockInvoke((channel) => {
      if (channel === 'status') return { installed: true }
      if (channel === 'download') return { jobId: 'job-1' }
      return null
    })
    ;(window.core!.deeplink!.dispatch as ReturnType<typeof vi.fn>).mockClear()

    const controller = setupWithMetadata()

    await controller.startDownload('137')

    expect(window.core!.deeplink!.dispatch).toHaveBeenCalledWith('nuxy://download-manager')
    expect(controller.state.metadata).toBeNull()
  })
})
