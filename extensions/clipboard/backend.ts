import type { CoreContext } from '@nuxyorg/extension-sdk'
import type { ClipboardItem, AddHistoryItemInput } from './types.ts'
import { sortHistory, createHistoryItem } from './utils/history.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({
    name: 'clipboard',
  })

  let history: ClipboardItem[] = []
  let lastText = ''
  let lastImage: string | null = null

  async function init(): Promise<void> {
    try {
      const stored = await core.storage.read<ClipboardItem[]>('history.json')
      history = Array.isArray(stored) ? stored : []
      core.logger.info(`Loaded ${history.length} clipboard history item(s) from storage.`)
    } catch (err) {
      core.logger.error('Failed to read clipboard history from storage, initializing empty.', err)
      history = []
    }

    history = sortHistory(history)

    try {
      lastText = (await core.clipboard.readText()) || ''
      const storeImages = (await core.settings.read<boolean>('storeImages')) ?? true
      lastImage = storeImages ? await core.clipboard.readImage() : null
      if (history.length === 0) {
        if (lastImage) {
          await addHistoryItem({ text: lastText || 'Image', image: lastImage })
        } else if (lastText && lastText.trim()) {
          await addHistoryItem({ text: lastText })
        }
      }
    } catch (err) {
      core.logger.error('Failed to read initial system clipboard.', err)
    }

    const monitorTick = async (): Promise<void> => {
      try {
        const storeImages = (await core.settings.read<boolean>('storeImages')) ?? true
        const currentText = await core.clipboard.readText()
        const currentImage = storeImages ? await core.clipboard.readImage() : null

        if (currentImage) {
          if (currentImage !== lastImage) {
            lastImage = currentImage
            lastText = currentText
            await addHistoryItem({ text: currentText || 'Image', image: currentImage })
          }
        } else if (currentText && currentText.trim() && currentText !== lastText) {
          lastText = currentText
          lastImage = null
          await addHistoryItem({ text: currentText })
        }
      } catch (err) {
        core.logger.silly('Error reading clipboard in poll loop', err)
      }

      let pollDelay = 1000
      try {
        const pollInterval = await core.settings.read<number>('pollIntervalMs')
        if (pollInterval) pollDelay = pollInterval
      } catch {
        // keep default delay
      }
      setTimeout(monitorTick, pollDelay)
    }

    setTimeout(monitorTick, 1000)
  }

  async function addHistoryItem(input: AddHistoryItemInput): Promise<void> {
    const newItem = createHistoryItem(input)

    history = [
      newItem,
      ...history.filter((i) => {
        if (input.image) return i.image !== input.image
        return i.text !== input.text
      }),
    ]

    const maxHistoryItems = (await core.settings.read<number>('maxHistoryItems')) ?? 100
    const pinned = history.filter((i) => i.pinned)
    const unpinned = history.filter((i) => !i.pinned)
    history = [...pinned, ...unpinned.slice(0, maxHistoryItems)]

    history = sortHistory(history)

    try {
      await core.storage.write('history.json', history)
    } catch (err) {
      core.logger.error('Failed to write clipboard history to storage.', err)
    }
  }

  async function persistAfterMutation(): Promise<void> {
    try {
      await core.storage.write('history.json', history)
    } catch (err) {
      core.logger.error('Failed to persist clipboard history.', err)
    }
  }

  core.ipc.handle('getHistory', async (): Promise<ClipboardItem[]> => history)

  core.ipc.handle('clearHistory', async (): Promise<ClipboardItem[]> => {
    history = history.filter((i) => i.pinned)
    await persistAfterMutation()
    return history
  })

  core.ipc.handle('pinItem', async (payload: unknown): Promise<ClipboardItem[]> => {
    const item = history.find((i) => i.id === (payload as string))
    if (item) {
      item.pinned = true
      history = sortHistory(history)
      await persistAfterMutation()
    }
    return history
  })

  core.ipc.handle('unpinItem', async (payload: unknown): Promise<ClipboardItem[]> => {
    const item = history.find((i) => i.id === (payload as string))
    if (item) {
      item.pinned = false
      history = sortHistory(history)
      await persistAfterMutation()
    }
    return history
  })

  core.ipc.handle('deleteItem', async (payload: unknown): Promise<ClipboardItem[]> => {
    history = history.filter((item) => item.id !== (payload as string))
    await persistAfterMutation()
    return history
  })

  core.ipc.handle('checkFile', async (payload: unknown): Promise<boolean> => {
    return core.fs.fileExists(payload as string)
  })

  core.ipc.handle('copyFile', async (payload: unknown): Promise<ClipboardItem[]> => {
    const found = history.find((item) => item.id === (payload as string))
    if (!found) return history
    const path = found.text?.trim()
    if (!path) return history
    const exists = await core.fs.fileExists(path)
    if (!exists) throw new Error(`File not found: ${path}`)
    await core.clipboard.writeFiles([path])
    found.copiedAt = new Date().toISOString()
    history = [found, ...history.filter((item) => item.id !== found.id)]
    await core.storage.write('history.json', history)
    return history
  })

  core.ipc.handle('copyItem', async (payload: unknown): Promise<ClipboardItem[]> => {
    const found = history.find((item) => item.id === (payload as string))
    if (found) {
      try {
        if (found.image && core.clipboard.writeImage) {
          await core.clipboard.writeImage(found.image)
          lastImage = found.image
          lastText = found.text || ''
        } else {
          await core.clipboard.writeText(found.text)
          lastText = found.text
          lastImage = null
        }
        found.copiedAt = new Date().toISOString()
        history = [found, ...history.filter((item) => item.id !== found.id)]
        history = sortHistory(history)
        await core.storage.write('history.json', history)
      } catch (err) {
        core.logger.error(`Failed to copy item "${found.id}" to clipboard.`, err)
      }
    }
    return history
  })

  void init()
}
