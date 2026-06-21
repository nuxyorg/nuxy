import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  TOOL_SEARCH_PLACEHOLDER_KEY,
  loadToolSearchPlaceholder,
  syncToolSearchPlaceholder,
} from '../utils/tool-search-placeholder.ts'

describe('toolSearchPlaceholder', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      core: {
        ipc: { invoke: vi.fn() },
        shell: { setSearchPlaceholder: vi.fn() },
      },
    })
  })

  it('loadToolSearchPlaceholder returns the flattened search.placeholder key', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { translations: { [TOOL_SEARCH_PLACEHOLDER_KEY]: 'Search through Nyaa' } },
    })
    await expect(loadToolSearchPlaceholder('com.nuxy.nyaa')).resolves.toBe('Search through Nyaa')
  })

  it('loadToolSearchPlaceholder returns null for missing or unresolved keys', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { translations: {} },
    })
    await expect(loadToolSearchPlaceholder('com.nuxy.nyaa')).resolves.toBeNull()
  })

  it('syncToolSearchPlaceholder applies placeholder only while tool stays active', async () => {
    vi.mocked(window.core!.ipc.invoke).mockResolvedValue({
      success: true,
      data: { translations: { [TOOL_SEARCH_PLACEHOLDER_KEY]: 'Search through Nyaa' } },
    })
    let active = true
    syncToolSearchPlaceholder('com.nuxy.nyaa', () => active)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(window.core!.shell!.setSearchPlaceholder).toHaveBeenCalledWith('Search through Nyaa')

    vi.mocked(window.core!.shell!.setSearchPlaceholder).mockClear()
    active = false
    syncToolSearchPlaceholder('com.nuxy.nyaa', () => active)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(window.core!.shell!.setSearchPlaceholder).not.toHaveBeenCalled()
  })
})
