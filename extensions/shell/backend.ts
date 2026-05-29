import type { CoreContext } from '@nuxy/extension-sdk'

export function register(core: CoreContext): void {
  let recentTools: string[] = []

  async function init() {
    try {
      const stored = await core.storage.read<string[]>('tool-history.json')
      if (Array.isArray(stored)) recentTools = stored
    } catch {
      recentTools = []
    }
  }

  core.ipc.handle('getRecentTools', async () => recentTools)

  core.ipc.handle('recordToolUsed', async (toolId: unknown) => {
    if (typeof toolId !== 'string') return recentTools
    recentTools = [toolId, ...recentTools.filter((id) => id !== toolId)].slice(0, 10)
    try {
      await core.storage.write('tool-history.json', recentTools)
    } catch (err) {
      core.logger.error('Failed to persist tool history', err)
    }
    return recentTools
  })

  init()
}
