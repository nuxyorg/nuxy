import type { CoreContext } from '@nuxy/extension-sdk'
import type { CopyResult } from './types.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'emoji-picker' })

  let favorites: string[] = []

  async function init(): Promise<void> {
    try {
      const stored = await core.storage.read('favorites.json')
      if (Array.isArray(stored)) favorites = stored as string[]
    } catch {
      favorites = []
    }
    core.logger.info(`Emoji Picker: loaded ${favorites.length} favorite(s)`)
  }

  core.ipc.handle('getFavorites', async () => favorites)

  core.ipc.handle('toggleFavorite', async (emoji: unknown) => {
    const e = emoji as string
    if (favorites.includes(e)) {
      favorites = favorites.filter((f) => f !== e)
    } else {
      favorites = [e, ...favorites].slice(0, 60)
    }
    try {
      await core.storage.write('favorites.json', favorites)
    } catch {
      // storage errors are non-fatal; updated favorites are still returned
    }
    return favorites
  })

  core.ipc.handle('copy', async (emoji: unknown): Promise<CopyResult> => {
    const e = emoji as string
    await core.clipboard.writeText(e)
    await (core.clipboard.writeText as (text: string, type?: string) => Promise<void>)(
      e,
      'selection'
    ).catch(() => {})
    return { ok: true }
  })

  core.ipc.handle('paste', async (): Promise<CopyResult> => {
    // Shift+Insert is a universal paste shortcut on Linux
    const { code } = await core.shell
      .exec('xdotool', ['key', '--clearmodifiers', 'Shift+Insert'])
      .catch(() => ({ code: 1, stdout: '' }))

    if (code !== 0) {
      core.logger.warn('Shift+Insert paste failed, trying ctrl+v')
      await core.shell.exec('xdotool', ['key', '--clearmodifiers', 'ctrl+v']).catch(() => {})
    }

    return { ok: true }
  })

  init()
}
