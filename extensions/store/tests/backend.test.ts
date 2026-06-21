import { describe, it, expect, vi, afterEach } from 'vitest'
import { register } from '../backend.ts'
import type { CoreContext } from '@nuxyorg/extension-sdk'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import type { ExtensionListItem } from '../types.ts'

const DEFAULT_REGISTRY_URL =
  'https://raw.githubusercontent.com/atagulalan/nuxy-assets/main/registry.json'

function createCore(settingsRegistryUrl: string | null = null): {
  core: CoreContext
  handlers: Record<string, (payload?: unknown) => Promise<unknown>>
} {
  return createMockCore({
    settings: {
      read: vi.fn().mockResolvedValue(settingsRegistryUrl),
    },
    extensions: {
      invoke: vi.fn(),
    },
  })
}

/** Minimal LoadedExtension shape the kernel returns */
function makeLoadedExt(id: string, version: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    folderName: id.split('.').pop(),
    manifest: {
      id,
      name: id,
      version,
      type: 'tool',
      ...overrides,
    },
  }
}

/** Minimal StoreExtension shape the remote registry returns */
function makeRemoteExt(id: string, version: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    description: `${id} description`,
    version,
    type: 'tool' as const,
    author: 'Test Author',
    downloadUrl: `https://example.com/${id}.nuxyext`,
    permissions: [],
    ...overrides,
  }
}

function makeRegistry(extensions: ReturnType<typeof makeRemoteExt>[]) {
  return { version: 1, extensions }
}

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(data),
  })
}

describe('Store Extension Backend', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ---------------------------------------------------------------------------
  // register()
  // ---------------------------------------------------------------------------
  describe('register()', () => {
    it('registers the store tool', () => {
      const { core } = createCore()
      register(core)
      expect(core.registry.registerTool).toHaveBeenCalledOnce()
      expect(core.registry.registerTool).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'store' })
      )
    })

    it('registers all expected IPC handlers', () => {
      const { core, handlers } = createCore()
      register(core)
      expect(handlers).toHaveProperty('getExtensions')
      expect(handlers).toHaveProperty('installExtension')
      expect(handlers).toHaveProperty('uninstallExtension')
    })
  })

  // ---------------------------------------------------------------------------
  // getExtensions — happy path
  // ---------------------------------------------------------------------------
  describe('getExtensions — happy path', () => {
    it('fetches the default registry URL when settings returns null', async () => {
      const { core, handlers } = createCore(null)
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: [] })

      await (handlers['getExtensions'] as () => Promise<unknown>)()

      expect(fetch).toHaveBeenCalledWith(DEFAULT_REGISTRY_URL)
    })

    it('uses custom registryUrl from settings when provided', async () => {
      const customUrl = 'https://my-registry.example.com/registry.json'
      const { core, handlers } = createCore(customUrl)
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: [] })

      await (handlers['getExtensions'] as () => Promise<unknown>)()

      expect(fetch).toHaveBeenCalledWith(customUrl)
    })

    it('returns merged list of remote + installed extensions', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal(
        'fetch',
        mockFetch(
          makeRegistry([
            makeRemoteExt('com.nuxy.alpha', '1.0.0'),
            makeRemoteExt('com.nuxy.beta', '2.0.0'),
          ])
        )
      )
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.nuxy.alpha', '1.0.0')],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.id)).toContain('com.nuxy.alpha')
      expect(result.map((r) => r.id)).toContain('com.nuxy.beta')
    })

    it('calls kernel listInstalledExtensions', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: [] })

      await handlers['getExtensions']!()

      expect(core.extensions.invoke).toHaveBeenCalledWith('kernel', 'listInstalledExtensions')
    })
  })

  // ---------------------------------------------------------------------------
  // getExtensions — installed / not-installed flags
  // ---------------------------------------------------------------------------
  describe('getExtensions — installed / not-installed flags', () => {
    it('sets installed: true, installedVersion, canUpdate for a matching installed extension with a newer remote version', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([makeRemoteExt('com.nuxy.tool', '1.2.0')])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.nuxy.tool', '1.1.0')],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.nuxy.tool')!

      expect(item.installed).toBe(true)
      expect(item.installedVersion).toBe('1.1.0')
      expect(item.version).toBe('1.2.0')
      expect(item.canUpdate).toBe(true)
    })

    it('sets canUpdate: false when installed version equals remote version', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([makeRemoteExt('com.nuxy.tool', '1.0.0')])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.nuxy.tool', '1.0.0')],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.nuxy.tool')!

      expect(item.canUpdate).toBe(false)
    })

    it('sets installed: false for a remote extension that is not locally installed', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal(
        'fetch',
        mockFetch(makeRegistry([makeRemoteExt('com.nuxy.remote-only', '1.0.0')]))
      )
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: [] })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.nuxy.remote-only')!

      expect(item.installed).toBe(false)
      expect(item.installedVersion).toBeUndefined()
      expect(item.canUpdate).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // getExtensions — local-only extensions
  // ---------------------------------------------------------------------------
  describe('getExtensions — local-only extensions', () => {
    it('appends locally installed extensions NOT in the remote catalog', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.local.custom', '0.9.0')],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]

      expect(result).toHaveLength(1)
      const item = result[0]
      expect(item.id).toBe('com.local.custom')
      expect(item.installed).toBe(true)
      expect(item.installedVersion).toBe('0.9.0')
      expect(item.canUpdate).toBe(false)
      expect(item.author).toBe('Local')
      expect(item.downloadUrl).toBe('')
    })

    it('local-only extension is NOT duplicated if it also appears in remote catalog', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([makeRemoteExt('com.nuxy.shared', '1.0.0')])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.nuxy.shared', '1.0.0')],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const matches = result.filter((r) => r.id === 'com.nuxy.shared')

      expect(matches).toHaveLength(1)
    })
  })

  // ---------------------------------------------------------------------------
  // getExtensions — isSystem
  // ---------------------------------------------------------------------------
  describe('getExtensions — isSystem flag', () => {
    it('marks com.nuxy.shell as isSystem: true (from remote catalog)', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([makeRemoteExt('com.nuxy.shell', '1.0.0')])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: [] })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.nuxy.shell')!

      expect(item.isSystem).toBe(true)
    })

    it('marks com.nuxy.settings as isSystem: true (from remote catalog)', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([makeRemoteExt('com.nuxy.settings', '1.0.0')])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: [] })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.nuxy.settings')!

      expect(item.isSystem).toBe(true)
    })

    it('marks an installed extension with bootstrap: true as isSystem: true', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal(
        'fetch',
        mockFetch(makeRegistry([makeRemoteExt('com.nuxy.bootstrapped', '1.0.0')]))
      )
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.nuxy.bootstrapped', '1.0.0', { bootstrap: true })],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.nuxy.bootstrapped')!

      expect(item.isSystem).toBe(true)
    })

    it('marks a local-only extension with bootstrap: true as isSystem: true', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.local.bootstrapped', '1.0.0', { bootstrap: true })],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.local.bootstrapped')!

      expect(item.isSystem).toBe(true)
    })

    it('marks a regular extension as isSystem: false', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([makeRemoteExt('com.nuxy.regular', '1.0.0')])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: [] })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.nuxy.regular')!

      expect(item.isSystem).toBe(false)
    })

    it('marks com.nuxy.shell local-only as isSystem: true', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.nuxy.shell', '1.0.0')],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]
      const item = result.find((r) => r.id === 'com.nuxy.shell')!

      expect(item.isSystem).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // getExtensions — network / kernel failure modes
  // ---------------------------------------------------------------------------
  describe('getExtensions — failure modes', () => {
    it('returns only locally installed extensions when remote fetch throws a network error', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.local.installed', '1.0.0')],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('com.local.installed')
      expect(result[0].installed).toBe(true)
      expect(result[0].author).toBe('Local')
    })

    it('logs the error when remote fetch fails', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: [] })

      await handlers['getExtensions']!()

      expect(core.logger.error).toHaveBeenCalled()
    })

    it('treats a non-ok HTTP response as an empty remote list', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal(
        'fetch',
        mockFetch(makeRegistry([makeRemoteExt('com.nuxy.tool', '1.0.0')]), false)
      )
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [makeLoadedExt('com.local.installed', '1.0.0')],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]

      expect(result.find((r) => r.id === 'com.nuxy.tool')).toBeUndefined()
      expect(result.find((r) => r.id === 'com.local.installed')).toBeDefined()
    })

    it('treats kernel success: false as empty installed list', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([makeRemoteExt('com.nuxy.tool', '1.0.0')])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: false, error: 'kernel error' })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]

      expect(result).toHaveLength(1)
      expect(result[0].installed).toBe(false)
    })

    it('treats kernel returning non-array data as empty installed list', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal('fetch', mockFetch(makeRegistry([makeRemoteExt('com.nuxy.tool', '1.0.0')])))
      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true, data: null })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]

      expect(result).toHaveLength(1)
      expect(result[0].installed).toBe(false)
    })

    it('returns empty array and logs error on complete outer-catch failure', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.mocked(core.settings.read).mockRejectedValue(new Error('Settings explosion'))

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]

      expect(result).toEqual([])
      expect(core.logger.error).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // installExtension
  // ---------------------------------------------------------------------------
  describe('installExtension', () => {
    it('proxies install to kernel with correct arguments', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true })

      const result = (await handlers['installExtension']!({
        extId: 'com.nuxy.tool',
        downloadUrl: 'https://example.com/tool.nuxyext',
      })) as { success: boolean }

      expect(core.extensions.invoke).toHaveBeenCalledWith('kernel', 'installExtension', {
        extId: 'com.nuxy.tool',
        downloadUrl: 'https://example.com/tool.nuxyext',
      })
      expect(result.success).toBe(true)
    })

    it('returns success: false and error when kernel reports failure', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: false,
        error: 'Download failed',
      })

      const result = (await handlers['installExtension']!({
        extId: 'com.nuxy.tool',
        downloadUrl: 'https://example.com/tool.nuxyext',
      })) as { success: boolean; error?: string }

      expect(result.success).toBe(false)
      expect(result.error).toBe('Download failed')
    })
  })

  // ---------------------------------------------------------------------------
  // uninstallExtension
  // ---------------------------------------------------------------------------
  describe('uninstallExtension', () => {
    it('proxies uninstall to kernel with correct extId', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true })

      const result = (await handlers['uninstallExtension']!({
        extId: 'com.nuxy.tool',
      })) as { success: boolean }

      expect(core.extensions.invoke).toHaveBeenCalledWith('kernel', 'uninstallExtension', {
        extId: 'com.nuxy.tool',
      })
      expect(result.success).toBe(true)
    })

    it('returns success: false and error when kernel reports failure', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: false,
        error: 'Not found',
      })

      const result = (await handlers['uninstallExtension']!({
        extId: 'com.nuxy.missing',
      })) as { success: boolean; error?: string }

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not found')
    })
  })

  // ---------------------------------------------------------------------------
  // Integration: full merge scenario
  // ---------------------------------------------------------------------------
  describe('getExtensions — integration: full merge scenario', () => {
    it('correctly merges remote catalog + installed + local-only in one call', async () => {
      const { core, handlers } = createCore()
      register(core)

      vi.stubGlobal(
        'fetch',
        mockFetch(
          makeRegistry([
            makeRemoteExt('com.nuxy.up-to-date', '1.0.0'),
            makeRemoteExt('com.nuxy.needs-update', '2.0.0'),
            makeRemoteExt('com.nuxy.not-installed', '1.0.0'),
            makeRemoteExt('com.nuxy.shell', '1.0.0'),
          ])
        )
      )
      vi.mocked(core.extensions.invoke).mockResolvedValue({
        success: true,
        data: [
          makeLoadedExt('com.nuxy.up-to-date', '1.0.0'),
          makeLoadedExt('com.nuxy.needs-update', '1.5.0'),
          makeLoadedExt('com.local.only', '0.1.0'),
        ],
      })

      const result = (await handlers['getExtensions']!()) as ExtensionListItem[]

      expect(result).toHaveLength(5)

      const upToDate = result.find((r) => r.id === 'com.nuxy.up-to-date')!
      expect(upToDate.installed).toBe(true)
      expect(upToDate.canUpdate).toBe(false)

      const needsUpdate = result.find((r) => r.id === 'com.nuxy.needs-update')!
      expect(needsUpdate.installed).toBe(true)
      expect(needsUpdate.canUpdate).toBe(true)
      expect(needsUpdate.installedVersion).toBe('1.5.0')
      expect(needsUpdate.version).toBe('2.0.0')

      const notInstalled = result.find((r) => r.id === 'com.nuxy.not-installed')!
      expect(notInstalled.installed).toBe(false)
      expect(notInstalled.canUpdate).toBe(false)

      const shell = result.find((r) => r.id === 'com.nuxy.shell')!
      expect(shell.isSystem).toBe(true)

      const localOnly = result.find((r) => r.id === 'com.local.only')!
      expect(localOnly.installed).toBe(true)
      expect(localOnly.author).toBe('Local')
      expect(localOnly.canUpdate).toBe(false)
    })
  })
})
