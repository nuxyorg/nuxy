import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { flattenTranslations, flattenShellActions } from '@nuxyorg/core'
import type { TorrentItem } from '../types.ts'
import {
  QbittorrentController,
  isPausedState,
  isPendingResolved,
  resolvePendingActions,
} from '../controller.ts'
import enLocale from '../locales/en.json'

const enTranslations = flattenTranslations(enLocale)

function makeTorrent(overrides: Partial<TorrentItem> = {}): TorrentItem {
  return {
    hash: 'abc123',
    name: 'Ubuntu ISO',
    size: 4_000_000_000,
    progress: 0.5,
    dlspeed: 1024,
    upspeed: 0,
    eta: 3600,
    state: 'downloading',
    category: 'linux',
    tags: '',
    savePath: '/downloads',
    magnetUri: 'magnet:?xt=urn:btih:abc123',
    ...overrides,
  }
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

describe('isPausedState', () => {
  it('treats qBittorrent paused/stopped/error states as paused', () => {
    expect(isPausedState('pausedDL')).toBe(true)
    expect(isPausedState('pausedUP')).toBe(true)
    expect(isPausedState('stoppedDL')).toBe(true)
    expect(isPausedState('stoppedUP')).toBe(true)
    expect(isPausedState('error')).toBe(true)
    expect(isPausedState('missingFiles')).toBe(true)
  })

  it('treats active states as not paused', () => {
    expect(isPausedState('downloading')).toBe(false)
    expect(isPausedState('uploading')).toBe(false)
    expect(isPausedState('stalledUP')).toBe(false)
  })
})

describe('isPendingResolved', () => {
  it('resolves pause when the torrent becomes paused', () => {
    expect(isPendingResolved('pause', 'pausedDL', true)).toBe(true)
    expect(isPendingResolved('pause', 'downloading', true)).toBe(false)
  })

  it('resolves resume when the torrent becomes active', () => {
    expect(isPendingResolved('resume', 'downloading', true)).toBe(true)
    expect(isPendingResolved('resume', 'pausedDL', true)).toBe(false)
  })

  it('resolves recheck when the torrent enters a checking state', () => {
    expect(isPendingResolved('recheck', 'checkingDL', true)).toBe(true)
    expect(isPendingResolved('recheck', 'downloading', true)).toBe(false)
  })

  it('resolves reannounce once the torrent is still present after refresh', () => {
    expect(isPendingResolved('reannounce', 'downloading', true)).toBe(true)
    expect(isPendingResolved('reannounce', 'downloading', false)).toBe(false)
  })

  it('resolves remove when the torrent disappears', () => {
    expect(isPendingResolved('remove', 'downloading', false)).toBe(true)
    expect(isPendingResolved('remove', 'downloading', true)).toBe(false)
  })
})

describe('resolvePendingActions', () => {
  it('drops resolved pending entries after the minimum duration elapsed', () => {
    const torrents = [makeTorrent({ state: 'pausedDL' })]
    const pending = resolvePendingActions({ abc123: 'pause' }, torrents, { abc123: 0 }, 500)
    expect(pending).toEqual({})
  })

  it('keeps resolved pending entries visible until the minimum duration elapsed', () => {
    const torrents = [makeTorrent({ state: 'pausedDL' })]
    const pending = resolvePendingActions({ abc123: 'pause' }, torrents, { abc123: 450 }, 500)
    expect(pending).toEqual({ abc123: 'pause' })
  })

  it('keeps pending entries until the expected state arrives', () => {
    const torrents = [makeTorrent({ state: 'downloading' })]
    const pending = resolvePendingActions({ abc123: 'pause' }, torrents, { abc123: 0 }, 500)
    expect(pending).toEqual({ abc123: 'pause' })
  })
})

describe('QbittorrentController', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ;(window.core!.ipc!.invoke as ReturnType<typeof vi.fn>).mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the torrent list on connect', async () => {
    mockInvoke((channel) => (channel === 'list' ? [makeTorrent()] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    expect(controller.state.torrents).toHaveLength(1)
    controller.disconnect()
  })

  it('refreshes the list on a polling interval while connected', async () => {
    let calls = 0
    mockInvoke((channel) => {
      if (channel !== 'list') return null
      calls += 1
      return calls === 1 ? [] : [makeTorrent()]
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.advanceTimersByTimeAsync(0)
    expect(controller.state.torrents).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(2000)
    expect(controller.state.torrents).toHaveLength(1)
    controller.disconnect()
  })

  it('stops polling after disconnect', async () => {
    const ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    mockInvoke((channel) => (channel === 'list' ? [] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.disconnect()

    ipcInvoke.mockClear()
    await vi.advanceTimersByTimeAsync(6000)
    expect(ipcInvoke).not.toHaveBeenCalled()
  })

  it('filters torrents by name when a query is set', async () => {
    mockInvoke((channel) =>
      channel === 'list'
        ? [
            makeTorrent({ hash: 'a', name: 'Ubuntu ISO' }),
            makeTorrent({ hash: 'b', name: 'Debian ISO' }),
          ]
        : null
    )

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    expect(controller.filteredTorrents).toHaveLength(2)
    controller.setQuery('ubu')
    expect(controller.filteredTorrents).toHaveLength(1)
    expect(controller.filteredTorrents[0].hash).toBe('a')
    controller.disconnect()
  })

  it('enters add mode when the query is a magnet link, hiding the torrent list', async () => {
    mockInvoke((channel) => (channel === 'list' ? [makeTorrent()] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    controller.setQuery('magnet:?xt=urn:btih:def456')
    expect(controller.isAddMode).toBe(true)
    expect(controller.filteredTorrents).toHaveLength(0)
    controller.disconnect()
  })

  it('addTorrent calls the add channel, clears the omnibar, and refreshes', async () => {
    let added = false
    mockInvoke((channel) => {
      if (channel === 'add') {
        added = true
        return undefined
      }
      return channel === 'list' ? (added ? [makeTorrent()] : []) : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await controller.addTorrent('magnet:?xt=urn:btih:def456')

    expect(window.core!.shell!.controlOmniBar).toHaveBeenCalledWith('clear')
    expect(controller.state.torrents).toHaveLength(1)
    expect(controller.state.addError).toBeNull()
    controller.disconnect()
  })

  it('addTorrent surfaces an error without crashing', async () => {
    mockInvoke((channel) => {
      if (channel === 'add') throw new Error('qBittorrent rejected the torrent')
      return channel === 'list' ? [] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await controller.addTorrent('not-a-real-torrent')
    expect(controller.state.addError).toBe('qBittorrent rejected the torrent')
    expect(controller.state.adding).toBe(false)
    controller.disconnect()
  })

  it('togglePause resumes a paused torrent and pauses an active one', async () => {
    const calledChannels: string[] = []
    mockInvoke((channel) => {
      calledChannels.push(channel)
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await controller.togglePause(makeTorrent({ state: 'pausedDL' }))
    await controller.togglePause(makeTorrent({ state: 'downloading' }))

    expect(calledChannels).toContain('resume')
    expect(calledChannels).toContain('pause')
    controller.disconnect()
  })

  it('Enter opens the save folder for a completed torrent instead of toggling pause', async () => {
    const calledChannels: { channel: string; payload?: unknown }[] = []
    mockInvoke((channel, payload) => {
      calledChannels.push({ channel, payload })
      return channel === 'list'
        ? [makeTorrent({ progress: 1, state: 'pausedUP', savePath: '/downloads/done' })]
        : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.store.setState({ selectedIndex: 0 })

    const enter = controller.getKeyActions().find((a) => a.id === 'qbit-toggle-pause')
    expect(enter?.label).toBe(enTranslations['actions.openFolder'])
    expect(enter?.activeOn?.()).toBe(true)

    enter?.handler?.()

    expect(calledChannels).toContainEqual({
      channel: 'openSavePath',
      payload: { savePath: '/downloads/done' },
    })
    expect(calledChannels.some((c) => c.channel === 'pause' || c.channel === 'resume')).toBe(false)
    controller.disconnect()
  })

  it('shows pending state while pause/resume is waiting for qBittorrent to update', async () => {
    let listState = 'downloading'
    mockInvoke(async (channel) => {
      if (channel === 'pause') {
        listState = 'downloading'
        return undefined
      }
      if (channel === 'list') return [makeTorrent({ state: listState })]
      return null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    const pausePromise = controller.togglePause(makeTorrent({ state: 'downloading' }))
    expect(controller.getPendingAction('abc123')).toBe('pause')

    await pausePromise
    expect(controller.getPendingAction('abc123')).toBe('pause')

    listState = 'pausedDL'
    await controller.refresh()
    expect(controller.getPendingAction('abc123')).toBe('pause')

    await vi.advanceTimersByTimeAsync(400)
    expect(controller.getPendingAction('abc123')).toBeNull()
    controller.disconnect()
  })

  it('clears pending state when a torrent action fails', async () => {
    mockInvoke((channel) => {
      if (channel === 'pause') throw new Error('pause failed')
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await expect(controller.togglePause(makeTorrent())).rejects.toThrow('pause failed')
    expect(controller.getPendingAction('abc123')).toBeNull()
    controller.disconnect()
  })

  it('disables shell actions while the selected torrent is pending', async () => {
    mockInvoke((channel) => (channel === 'list' ? [makeTorrent()] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.store.setState({ selectedIndex: 0, pendingActions: { abc123: 'pause' } })

    const pauseAction = controller.getKeyActions().find((a) => a.id === 'qbit-toggle-pause')
    expect(pauseAction?.activeOn?.()).toBe(false)
    controller.disconnect()
  })

  it('recheck, reannounce and remove call their respective channels', async () => {
    const calledChannels: string[] = []
    mockInvoke((channel) => {
      calledChannels.push(channel)
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    const item = makeTorrent()
    await controller.recheck(item)
    await controller.reannounce(item)
    await controller.remove(item, true)

    expect(calledChannels).toContain('recheck')
    expect(calledChannels).toContain('reannounce')
    expect(calledChannels).toContain('remove')
    controller.disconnect()
  })

  it('applyDeeplinkPath adds a torrent from the add deeplink exactly once', async () => {
    const addedUrls: string[] = []
    mockInvoke((channel, payload) => {
      if (channel === 'add') {
        addedUrls.push((payload as { url: string }).url)
        return undefined
      }
      return channel === 'list' ? [] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    const path = 'add?url=magnet%3A%3Fxt%3Durn%3Abtih%3Adef456'
    expect(await controller.applyDeeplinkPath(path)).toBe(true)
    expect(await controller.applyDeeplinkPath(path)).toBe(true)
    expect(addedUrls).toEqual(['magnet:?xt=urn:btih:def456'])

    expect(await controller.applyDeeplinkPath('remove?hash=abc')).toBe(false)
    controller.disconnect()
  })

  it('refresh surfaces list errors without crashing', async () => {
    mockInvoke((channel) => {
      if (channel === 'list') throw new Error('Connection refused')
      return null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    expect(controller.state.error).toBe('Connection refused')
    expect(controller.state.loading).toBe(false)
    controller.disconnect()
  })

  it('sets loading true as soon as connect starts, until the first list resolves', async () => {
    let resolveList: ((value: TorrentItem[]) => void) | null = null
    mockInvoke((channel) => {
      if (channel !== 'list') return null
      return new Promise<TorrentItem[]>((resolve) => {
        resolveList = resolve
      })
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    expect(controller.state.loading).toBe(true)

    resolveList!([makeTorrent()])
    await vi.runOnlyPendingTimersAsync()
    expect(controller.state.loading).toBe(false)
    controller.disconnect()
  })

  it('maps an auth failure during refresh to connectionState "auth_failed"', async () => {
    mockInvoke((channel) => {
      if (channel === 'list') throw new Error('Invalid qBittorrent username or password')
      return null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    expect(controller.state.connectionState).toBe('auth_failed')
    expect(controller.state.error).toBe('Invalid qBittorrent username or password')
    controller.disconnect()
  })

  it('clears connectionState once the list loads successfully again', async () => {
    let shouldFail = true
    mockInvoke((channel) => {
      if (channel !== 'list') return null
      if (shouldFail) throw new Error('Invalid qBittorrent username or password')
      return [makeTorrent()]
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    expect(controller.state.connectionState).toBe('auth_failed')

    shouldFail = false
    await controller.refresh()
    expect(controller.state.connectionState).toBeNull()
    expect(controller.state.error).toBeNull()
    controller.disconnect()
  })

  it('sets actionError when a torrent action fails, without blocking the rejection', async () => {
    mockInvoke((channel) => {
      if (channel === 'pause') throw new Error('pause failed')
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await expect(controller.togglePause(makeTorrent())).rejects.toThrow('pause failed')
    expect(controller.state.actionError).toBe('pause failed')
    controller.disconnect()
  })

  it('clears actionError on the next successful refresh', async () => {
    let shouldFailPause = true
    mockInvoke((channel) => {
      if (channel === 'pause' && shouldFailPause) throw new Error('pause failed')
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await expect(controller.togglePause(makeTorrent())).rejects.toThrow('pause failed')
    expect(controller.state.actionError).toBe('pause failed')

    shouldFailPause = false
    await controller.refresh()
    expect(controller.state.actionError).toBeNull()
    controller.disconnect()
  })

  it('clears actionError when the query changes', async () => {
    mockInvoke((channel) => {
      if (channel === 'pause') throw new Error('pause failed')
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await expect(controller.togglePause(makeTorrent())).rejects.toThrow('pause failed')
    expect(controller.state.actionError).toBe('pause failed')

    controller.setQuery('ubuntu')
    expect(controller.state.actionError).toBeNull()
    controller.disconnect()
  })

  it('refresh handles non-Error throws with a generic message', async () => {
    const ipcModule = await import('../utils/ipc.ts')
    vi.spyOn(ipcModule, 'invoke').mockRejectedValue('network down')

    const controller = new QbittorrentController(() => {})
    await controller.refresh()

    expect(controller.state.error).toBe('Failed to load torrents')
    vi.restoreAllMocks()
  })

  it('sorts filtered torrents alphabetically by name', async () => {
    mockInvoke((channel) =>
      channel === 'list'
        ? [makeTorrent({ hash: 'b', name: 'Zebra' }), makeTorrent({ hash: 'a', name: 'Alpha' })]
        : null
    )

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    expect(controller.filteredTorrents.map((t) => t.name)).toEqual(['Alpha', 'Zebra'])
    controller.disconnect()
  })

  it('setQuery is a no-op when the query is unchanged', async () => {
    mockInvoke((channel) => (channel === 'list' ? [] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    controller.setQuery('ubuntu')
    const refreshCalls = vi.mocked(window.core!.shell!.refreshShellActions).mock.calls.length
    controller.setQuery('ubuntu')
    expect(vi.mocked(window.core!.shell!.refreshShellActions).mock.calls.length).toBe(refreshCalls)
    controller.disconnect()
  })

  it('remove resets selection when the filtered list becomes empty', async () => {
    mockInvoke((channel) => {
      if (channel === 'remove') return undefined
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.setSelectedIndex(0)

    mockInvoke((channel) => {
      if (channel === 'remove') return undefined
      return channel === 'list' ? [] : null
    })

    await controller.remove(makeTorrent(), false)
    expect(controller.state.selectedIndex).toBe(-1)
    controller.disconnect()
  })

  it('remove clamps selectedIndex when items remain', async () => {
    mockInvoke((channel) =>
      channel === 'list'
        ? [makeTorrent({ hash: 'a', name: 'A' }), makeTorrent({ hash: 'b', name: 'B' })]
        : null
    )

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.setSelectedIndex(1)

    await controller.remove(makeTorrent({ hash: 'b', name: 'B' }), false)

    expect(controller.state.selectedIndex).toBe(0)
    controller.disconnect()
  })

  it('flashCopied clears copiedHash after 1500ms', async () => {
    mockInvoke((channel) => (channel === 'list' ? [makeTorrent()] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await controller.copyMagnet(makeTorrent())
    expect(controller.state.copiedHash).toBe('abc123')

    await vi.advanceTimersByTimeAsync(1500)
    expect(controller.state.copiedHash).toBeNull()
    controller.disconnect()
  })

  it('syncSearchPlaceholder sets the translated placeholder', async () => {
    mockInvoke((channel) => (channel === 'list' ? [] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    expect(window.core!.shell!.setSearchPlaceholder).toHaveBeenCalledWith(
      'Search torrents, or paste a magnet/.torrent link'
    )
    controller.disconnect()
  })

  it('getKeyActions returns the same actions as the shell registration getter', async () => {
    mockInvoke((channel) => (channel === 'list' ? [makeTorrent()] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.store.setState({ selectedIndex: 0 })

    const fromGetter = controller.getKeyActions()
    expect(fromGetter.some((a) => a.id === 'qbit-toggle-pause')).toBe(true)
    controller.disconnect()
  })

  it('openSavePath invokes the openSavePath channel with the save path', async () => {
    const calledChannels: { channel: string; payload?: unknown }[] = []
    mockInvoke((channel, payload) => {
      calledChannels.push({ channel, payload })
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    await controller.openSavePath(makeTorrent({ savePath: '/downloads/ubuntu' }))
    expect(calledChannels).toContainEqual({
      channel: 'openSavePath',
      payload: { savePath: '/downloads/ubuntu' },
    })
    controller.disconnect()
  })

  it('copyMagnet and copySavePath invoke clipboard channels and flash copiedHash', async () => {
    const calledChannels: string[] = []
    mockInvoke((channel) => {
      calledChannels.push(channel)
      return channel === 'list' ? [makeTorrent()] : null
    })

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    const item = makeTorrent()
    await controller.copyMagnet(item)
    expect(calledChannels).toContain('copyMagnet')
    expect(controller.state.copiedHash).toBe(item.hash)

    await controller.copySavePath(item)
    expect(calledChannels).toContain('copySavePath')
    controller.disconnect()
  })

  it('copyMagnet flashes copiedKind "magnet" and copySavePath flashes copiedKind "savePath"', async () => {
    mockInvoke((channel) => (channel === 'list' ? [makeTorrent()] : null))

    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()

    const item = makeTorrent()
    await controller.copyMagnet(item)
    expect(controller.state.copiedKind).toBe('magnet')

    await controller.copySavePath(item)
    expect(controller.state.copiedKind).toBe('savePath')
    controller.disconnect()
  })
})

describe('QbittorrentController keyboard actions', () => {
  let controlOmniBarMock: ReturnType<typeof vi.fn>
  let getter: (() => ReturnType<QbittorrentController['getKeyActions']>) | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    ;(window.core!.ipc!.invoke as ReturnType<typeof vi.fn>).mockReset()
    controlOmniBarMock = window.core!.shell!.controlOmniBar as ReturnType<typeof vi.fn>
    controlOmniBarMock.mockReset()
    vi.mocked(window.core!.shell!.registerShellActions).mockImplementation((fn) => {
      getter = fn as typeof getter
    })
    mockInvoke((channel) => {
      if (channel === 'getExtensionTranslations') {
        return { locale: 'en', dir: 'ltr', translations: enTranslations }
      }
      return channel === 'list' ? [makeTorrent()] : null
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('hides the omnibar when navigating down into the list', () => {
    const controller = new QbittorrentController(() => {})
    controller.connect()
    controller.store.setState({ torrents: [makeTorrent()], selectedIndex: -1 })

    const down = flattenShellActions(getter!()).find((a) => a.key === 'ArrowDown')
    down?.handler?.()

    expect(controlOmniBarMock).toHaveBeenCalledWith('hide')
    expect(controller.state.selectedIndex).toBe(0)
    controller.disconnect()
  })

  it('shows the omnibar when navigating up past the first item', () => {
    const controller = new QbittorrentController(() => {})
    controller.connect()
    controller.store.setState({ torrents: [makeTorrent()], selectedIndex: 0 })

    const up = flattenShellActions(getter!()).find((a) => a.key === 'ArrowUp')
    up?.handler?.()

    expect(controlOmniBarMock).toHaveBeenCalledWith('show')
    expect(controller.state.selectedIndex).toBe(-1)
    controller.disconnect()
  })

  it('exposes all secondary actions in the Ctrl+K menu when an item is selected', () => {
    const controller = new QbittorrentController(() => {})
    controller.connect()
    controller.store.setState({ torrents: [makeTorrent()], selectedIndex: 0 })

    const actions = getter!()
    const secondaryIds = [
      'qbit-copy-magnet',
      'qbit-copy-save-path',
      'qbit-open-folder',
      'qbit-recheck',
      'qbit-reannounce',
      'qbit-remove',
      'qbit-remove-with-data',
    ]

    for (const id of secondaryIds) {
      const action = actions.find((a) => a.id === id)
      expect(action?.showInMenu).toBe(true)
      expect(action?.section).toBe('actions')
    }
    controller.disconnect()
  })

  it('qbit-open-folder calls openSavePath for the selected torrent and is disabled without a save path', () => {
    const controller = new QbittorrentController(() => {})
    controller.connect()
    controller.store.setState({
      torrents: [makeTorrent({ savePath: '/downloads/ubuntu' })],
      selectedIndex: 0,
    })

    const action = getter!().find((a) => a.id === 'qbit-open-folder')
    expect(action?.activeOn?.()).toBe(true)

    controller.store.setState({ torrents: [makeTorrent({ savePath: '' })], selectedIndex: 0 })
    const disabledAction = getter!().find((a) => a.id === 'qbit-open-folder')
    expect(disabledAction?.activeOn?.()).toBe(false)
    controller.disconnect()
  })

  it('does not show secondary actions in the footer bar', () => {
    const controller = new QbittorrentController(() => {})
    controller.connect()
    controller.store.setState({ torrents: [makeTorrent()], selectedIndex: 0 })

    const actions = getter!()
    const secondaryIds = [
      'qbit-copy-magnet',
      'qbit-copy-save-path',
      'qbit-recheck',
      'qbit-reannounce',
      'qbit-remove',
      'qbit-remove-with-data',
    ]

    for (const id of secondaryIds) {
      expect(actions.find((a) => a.id === id)?.hint).toBeUndefined()
    }

    const footerIds = ['qbit-navigate', 'qbit-toggle-pause']
    for (const id of footerIds) {
      expect(actions.find((a) => a.id === id)?.hint).toBeDefined()
    }
    controller.disconnect()
  })

  it('hides Ctrl+K secondary actions when nothing is selected', () => {
    const controller = new QbittorrentController(() => {})
    controller.connect()
    controller.store.setState({ torrents: [makeTorrent()], selectedIndex: -1 })

    const action = getter!().find((a) => a.id === 'qbit-copy-magnet')
    expect(action?.showInMenu).toBe(false)
    expect(action?.activeOn?.()).toBe(false)
    controller.disconnect()
  })

  it('exposes Enter-to-add action in add mode', async () => {
    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.setQuery('magnet:?xt=urn:btih:abc123')

    const addAction = getter!().find((a) => a.id === 'qbit-add')
    expect(addAction?.activeOn?.()).toBe(true)
    expect(addAction?.label).toBe('Add torrent')
    controller.disconnect()
  })

  it('shows resume label for a paused torrent on Enter', async () => {
    const controller = new QbittorrentController(() => {})
    controller.connect()
    await vi.runOnlyPendingTimersAsync()
    controller.store.setState({
      torrents: [makeTorrent({ state: 'pausedDL' })],
      selectedIndex: 0,
    })

    const enter = getter!().find((a) => a.id === 'qbit-toggle-pause')
    expect(enter?.label).toBe('Resume')
    controller.disconnect()
  })
})
