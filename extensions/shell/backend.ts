import type { CoreContext } from '@nuxy/extension-sdk'
import type { UsageStats } from './types.ts'

export function register(core: CoreContext): void {
  let recentTools: string[] = []
  let usageStats: UsageStats = {}

  async function init() {
    try {
      const stored = await core.storage.read<string[]>('tool-history.json')
      if (Array.isArray(stored)) recentTools = stored
    } catch {
      recentTools = []
    }
    try {
      const stats = await core.storage.read<UsageStats>('usage-stats.json')
      if (stats && typeof stats === 'object' && !Array.isArray(stats)) usageStats = stats
    } catch {
      usageStats = {}
    }
  }

  core.ipc.handle('getRecentTools', async () => recentTools)

  core.ipc.handle('getUsageStats', async () => usageStats)

  core.ipc.handle('recordToolUsed', async (payload: unknown) => {
    let toolId: string
    let query: string | undefined

    if (typeof payload === 'string') {
      toolId = payload
    } else if (
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      'toolId' in payload
    ) {
      const p = payload as { toolId?: unknown; query?: unknown }
      if (typeof p.toolId !== 'string') return recentTools
      toolId = p.toolId
      if (typeof p.query === 'string') query = p.query
    } else {
      return recentTools
    }

    recentTools = [toolId, ...recentTools.filter((id) => id !== toolId)].slice(0, 10)

    if (!usageStats[toolId]) usageStats[toolId] = { count: 0, queries: [] }
    usageStats[toolId].count++
    if (query?.trim()) {
      const q = query.trim().toLowerCase()
      usageStats[toolId].queries = [
        q,
        ...usageStats[toolId].queries.filter((x) => x !== q),
      ].slice(0, 50)
    }

    try {
      await core.storage.write('tool-history.json', recentTools)
      await core.storage.write('usage-stats.json', usageStats)
    } catch (err) {
      core.logger.error('Failed to persist tool history', err)
    }
    return recentTools
  })

  init()
}
