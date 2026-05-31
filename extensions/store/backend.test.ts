import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { register } from './backend.ts'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import type { ExtensionListItem } from './types.ts'

function createCore(): {
  core: CoreContext
  handlers: Record<string, (payload: unknown) => unknown>
} {
  return createMockCore(vi, {
    settings: {
      read: vi.fn().mockResolvedValue(null),
    },
    extensions: {
      invoke: vi.fn(),
    },
  })
}

describe('Store Extension Backend', () => {
  let globalFetchSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (globalFetchSpy) {
      globalFetchSpy.mockRestore()
    }
  })

  it('register() registers the store tool', () => {
    const { core } = createCore()
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'store', displayName: 'Store' })
  })

  it('getExtensions fetches registry and lists merged extensions', async () => {
    const { core, handlers } = createCore()
    register(core)

    // Mock fetch response for registry.json
    const mockRegistry = {
      version: 1,
      extensions: [
        {
          id: 'com.nuxy.test-tool',
          name: 'Test Tool',
          description: 'A tool for testing',
          version: '1.2.0',
          type: 'tool',
          author: 'Author',
          downloadUrl: 'https://example.com/tool.nuxyext',
          permissions: ['storage'],
        },
      ],
    }

    const mockFetchResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockRegistry),
    }
    globalFetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockFetchResponse as any)

    // Mock kernel response for listInstalledExtensions
    vi.mocked(core.extensions.invoke).mockResolvedValue({
      success: true,
      data: [
        {
          id: 'com.nuxy.test-tool',
          folderName: 'test-tool',
          manifest: {
            id: 'com.nuxy.test-tool',
            name: 'Test Tool',
            version: '1.1.0', // Older version installed
            type: 'tool',
          },
        },
        {
          id: 'com.nuxy.local-only',
          folderName: 'local-only',
          manifest: {
            id: 'com.nuxy.local-only',
            name: 'Local Only',
            version: '1.0.0',
            type: 'helper',
          },
        },
      ],
    })

    const getExtensionsHandler = handlers['getExtensions'] as (p: unknown) => Promise<ExtensionListItem[]>
    const result = await getExtensionsHandler({})

    expect(globalFetchSpy).toHaveBeenCalled()
    expect(core.extensions.invoke).toHaveBeenCalledWith('kernel', 'listInstalledExtensions')

    expect(result).toHaveLength(2)

    // Verify merged test-tool (installed but needs update)
    const testTool = result.find((x) => x.id === 'com.nuxy.test-tool')!
    expect(testTool).toBeDefined()
    expect(testTool.installed).toBe(true)
    expect(testTool.installedVersion).toBe('1.1.0')
    expect(testTool.version).toBe('1.2.0')
    expect(testTool.canUpdate).toBe(true)

    // Verify merged local-only (only installed locally)
    const localOnly = result.find((x) => x.id === 'com.nuxy.local-only')!
    expect(localOnly).toBeDefined()
    expect(localOnly.installed).toBe(true)
    expect(localOnly.canUpdate).toBe(false)
    expect(localOnly.author).toBe('Local')
  })

  it('installExtension invokes kernel installExtension IPC', async () => {
    const { core, handlers } = createCore()
    register(core)

    vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true })

    const installHandler = handlers['installExtension'] as (p: unknown) => Promise<{ success: boolean }>
    const result = await installHandler({
      extId: 'com.nuxy.test-tool',
      downloadUrl: 'https://example.com/tool.nuxyext',
    })

    expect(core.extensions.invoke).toHaveBeenCalledWith('kernel', 'installExtension', {
      extId: 'com.nuxy.test-tool',
      downloadUrl: 'https://example.com/tool.nuxyext',
    })
    expect(result.success).toBe(true)
  })

  it('uninstallExtension invokes kernel uninstallExtension IPC', async () => {
    const { core, handlers } = createCore()
    register(core)

    vi.mocked(core.extensions.invoke).mockResolvedValue({ success: true })

    const uninstallHandler = handlers['uninstallExtension'] as (p: unknown) => Promise<{ success: boolean }>
    const result = await uninstallHandler({ extId: 'com.nuxy.test-tool' })

    expect(core.extensions.invoke).toHaveBeenCalledWith('kernel', 'uninstallExtension', {
      extId: 'com.nuxy.test-tool',
    })
    expect(result.success).toBe(true)
  })
})
