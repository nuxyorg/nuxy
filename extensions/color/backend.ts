import type { CoreContext } from '@nuxy/extension-sdk'
import type { SavedColor } from './types.ts'
import { parseColorInput, rgbToHsl, formatHex, formatRgb, formatHsl } from './utils/colorParse.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: core.i18n.t('tool.name') })

  let history: SavedColor[] = []

  async function init(): Promise<void> {
    try {
      const stored = await core.storage.read<SavedColor[]>('history.json')
      history = Array.isArray(stored) ? stored : []
      core.logger.info(`Loaded ${history.length} color history item(s) from storage.`)
    } catch (err) {
      core.logger.error('Failed to read color history from storage, initializing empty.', err)
      history = []
    }
  }

  async function persistHistory(): Promise<void> {
    try {
      await core.storage.write<SavedColor[]>('history.json', history)
    } catch (err) {
      core.logger.error('Failed to persist color history.', err)
    }
  }

  function buildSavedColor(r: number, g: number, b: number, id: string): SavedColor {
    const { h, s, l } = rgbToHsl(r, g, b)
    return {
      id,
      hex: formatHex(r, g, b),
      rgb: formatRgb(r, g, b),
      hsl: formatHsl(h, s, l),
      r,
      g,
      b,
      h,
      s,
      l,
      savedAt: new Date().toISOString(),
    }
  }

  core.ipc.handle('parseColor', async (payload: unknown): Promise<SavedColor | null> => {
    const { input } = payload as { input: string }
    const parsed = parseColorInput(input)
    if (!parsed) return null
    return buildSavedColor(parsed.r, parsed.g, parsed.b, '')
  })

  core.ipc.handle('getHistory', async (): Promise<SavedColor[]> => {
    return history
  })

  core.ipc.handle('saveColor', async (payload: unknown): Promise<SavedColor[]> => {
    const { color } = payload as { color: SavedColor }
    const newItem: SavedColor = {
      ...color,
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
    }
    history = [newItem, ...history.filter((c) => c.hex !== newItem.hex)]
    if (history.length > 50) {
      history = history.slice(0, 50)
    }
    await persistHistory()
    return history
  })

  core.ipc.handle('deleteColor', async (payload: unknown): Promise<SavedColor[]> => {
    const { id } = payload as { id: string }
    history = history.filter((c) => c.id !== id)
    await persistHistory()
    return history
  })

  core.ipc.handle('copyColor', async (payload: unknown): Promise<void> => {
    const { text } = payload as { text: string }
    await core.clipboard.writeText(text)
  })

  core.ipc.handle('getCopyFormat', async (): Promise<string> => {
    return (await core.settings.read<string>('copyFormat')) ?? 'hex'
  })

  init()
}
