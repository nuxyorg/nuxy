const DEFAULT = {
  // Appearance
  theme: 'dark',
  iconPack: '',
  zoom: '100%',
  font: 'system',
  // Window behaviour (formerly nuxyconfig)
  escAction: 'hide',
  blurAction: 'hide',
  windowWidth: 800,
  windowMaxHeight: 600,
  alwaysOnTop: false,
  opacity: 1,
  showInTaskbar: false,
  showOnStartup: false,
  windowPosition: '1/2, 1/3',
}

export function register(core) {
  core.ipc.handle('getSettings', async () => {
    const saved = await core.storage.read('settings.json')
    return { ...DEFAULT, ...(saved || {}) }
  })

  core.ipc.handle('saveSettings', async (data) => {
    const next = { ...DEFAULT, ...data }
    await core.storage.write('settings.json', next)
    return next
  })
}
