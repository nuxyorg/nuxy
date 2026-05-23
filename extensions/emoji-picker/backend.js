/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
import { execFile } from 'child_process'


/** @param {CoreContext} core */
export function register(core) {
  core.registry.registerTool({ name: 'emoji-picker' })

  let favorites = []

  async function init() {
    try {
      const stored = await core.storage.read('favorites.json')
      if (Array.isArray(stored)) favorites = stored
    } catch {
      favorites = []
    }
    core.logger.info(`Emoji Picker: loaded ${favorites.length} favorite(s)`)
  }

  core.ipc.handle('getFavorites', async () => favorites)

  core.ipc.handle('toggleFavorite', async (emoji) => {
    if (favorites.includes(emoji)) {
      favorites = favorites.filter((e) => e !== emoji)
    } else {
      favorites = [emoji, ...favorites].slice(0, 60)
    }
    try {
      await core.storage.write('favorites.json', favorites)
    } catch {
      // storage errors are non-fatal; updated favorites are still returned
    }
    return favorites
  })

  core.ipc.handle('copy', async (emoji) => {
    await core.clipboard.writeText(emoji)
    // Also write to selection (primary clipboard) for Linux middle-click/shift-insert compatibility if possible
    try {
      await core.clipboard.writeText(emoji, 'selection')
    } catch (e) {
      // ignore
    }
    return { ok: true }
  })

  core.ipc.handle('paste', async () => {
    return new Promise((resolve) => {
      // Shift+Insert is a universal paste shortcut on Linux (works in terminals and GUIs)
      execFile('xdotool', ['key', '--clearmodifiers', 'Shift+Insert'], (err) => {
        if (err) {
          console.error('Failed to paste with Shift+Insert, trying ctrl+v', err)
          execFile('xdotool', ['key', '--clearmodifiers', 'ctrl+v'], () => {
            resolve({ ok: true })
          })
        } else {
          resolve({ ok: true })
        }
      })
    })
  })

  init()
}
