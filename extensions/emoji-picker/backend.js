/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */

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
    await core.storage.write('favorites.json', favorites)
    return favorites
  })

  core.ipc.handle('copy', async (emoji) => {
    await core.clipboard.writeText(emoji)
    return { ok: true }
  })

  init()
}
