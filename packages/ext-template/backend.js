/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */

/** @param {CoreContext} core */
export function register(core) {
  core.registry.registerTool({ name: 'my-extension' })

  core.ipc.handle('ping', async () => ({ ok: true }))
}
