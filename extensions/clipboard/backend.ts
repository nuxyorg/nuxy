import type { CoreContext } from '@nuxy/extension-sdk'
import type { ClipboardItem, AddHistoryItemInput } from './types.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({
    name: 'clipboard',
  })

  let history: ClipboardItem[] = []
  let lastText = ''
  let lastImage: string | null = null

  // Initialize from sandboxed storage
  async function init(): Promise<void> {
    try {
      const stored = await core.storage.read('history.json')
      if (Array.isArray(stored)) {
        history = stored as ClipboardItem[]
      } else {
        history = []
      }
      core.logger.info(`Loaded ${history.length} clipboard history item(s) from storage.`)
    } catch (err) {
      core.logger.error('Failed to read clipboard history from storage, initializing empty.', err)
      history = []
    }

    // Initialize the lastText and lastImage with current clipboard value
    try {
      lastText = (await core.clipboard.readText()) || ''
      lastImage = (await core.clipboard.readImage()) as string | null
      // If there's something already on clipboard and history is empty, add it
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

    // Start the monitoring loop (polling every 1000ms)
    setInterval(async () => {
      try {
        const currentText = await core.clipboard.readText()
        const currentImage = (await core.clipboard.readImage()) as string | null

        if (currentImage) {
          if (currentImage !== lastImage) {
            lastImage = currentImage
            lastText = currentText // update text too so we don't trigger text change next tick
            await addHistoryItem({ text: currentText || 'Image', image: currentImage })
          }
        } else if (currentText && currentText.trim() && currentText !== lastText) {
          lastText = currentText
          lastImage = null
          await addHistoryItem({ text: currentText })
        }
      } catch (err) {
        // Gracefully log error if clipboard becomes temporarily unavailable
        core.logger.silly('Error reading clipboard in poll loop', err)
      }
    }, 1000)
  }

  function sortHistory(): void {
    history.sort((a, b) => new Date(b.copiedAt).getTime() - new Date(a.copiedAt).getTime())
    const pinned = history.filter((i) => i.pinned)
    const unpinned = history.filter((i) => !i.pinned)
    history = [...pinned, ...unpinned]
  }

  // Add an item to the history, deduplicate, and persist
  async function addHistoryItem(item: AddHistoryItemInput): Promise<void> {
    const newItem: ClipboardItem = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(),
      text: item.text,
      image: item.image ?? null,
      copiedAt: new Date().toISOString(),
      pinned: false,
    }

    // De-duplicate: remove older items with exact same text (if no image), or exact same image
    history = [
      newItem,
      ...history.filter((i) => {
        if (item.image) return i.image !== item.image
        return i.text !== item.text
      }),
    ]

    // Cap at 100 unpinned entries (pinned items are never evicted)
    const pinned = history.filter((i) => i.pinned)
    const unpinned = history.filter((i) => !i.pinned)
    history = [...pinned, ...unpinned.slice(0, 100)]

    sortHistory()

    // Persist to sandboxed storage
    try {
      await core.storage.write('history.json', history)
    } catch (err) {
      core.logger.error('Failed to write clipboard history to storage.', err)
    }
  }

  // IPC Handler: get history list
  core.ipc.handle('getHistory', async (_payload: unknown) => {
    return history
  })

  // IPC Handler: clear all items (preserves pinned)
  core.ipc.handle('clearHistory', async (_payload: unknown) => {
    history = history.filter((i) => i.pinned)
    try {
      await core.storage.write('history.json', history)
    } catch (err) {
      core.logger.error('Failed to clear clipboard storage.', err)
    }
    return history
  })

  // IPC Handler: pin an item
  core.ipc.handle('pinItem', async (payload: unknown) => {
    const id = payload as string
    const item = history.find((i) => i.id === id)
    if (item) {
      item.pinned = true
      sortHistory()
      try {
        await core.storage.write('history.json', history)
      } catch (err) {
        core.logger.error('Failed to update clipboard storage after pin.', err)
      }
    }
    return history
  })

  // IPC Handler: unpin an item
  core.ipc.handle('unpinItem', async (payload: unknown) => {
    const id = payload as string
    const item = history.find((i) => i.id === id)
    if (item) {
      item.pinned = false
      sortHistory()
      try {
        await core.storage.write('history.json', history)
      } catch (err) {
        core.logger.error('Failed to update clipboard storage after unpin.', err)
      }
    }
    return history
  })

  // IPC Handler: delete specific item
  core.ipc.handle('deleteItem', async (payload: unknown) => {
    const id = payload as string
    history = history.filter((item) => item.id !== id)
    try {
      await core.storage.write('history.json', history)
    } catch (err) {
      core.logger.error('Failed to update clipboard storage after deletion.', err)
    }
    return history
  })

  // IPC Handler: check if a file path exists on disk
  core.ipc.handle('checkFile', async (payload: unknown) => {
    return core.fs.fileExists(payload as string)
  })

  // IPC Handler: copy a file item to the system clipboard (as a file, not text)
  core.ipc.handle('copyFile', async (payload: unknown) => {
    const id = payload as string
    const found = history.find((item) => item.id === id)
    if (!found) return history
    const path = found.text?.trim()
    if (!path) return history
    const exists = await core.fs.fileExists(path)
    if (!exists) throw new Error(`File not found: ${path}`)
    await core.clipboard.writeFiles([path])
    found.copiedAt = new Date().toISOString()
    history = [found, ...history.filter((item) => item.id !== id)]
    await core.storage.write('history.json', history)
    return history
  })

  // IPC Handler: copy item to system clipboard and move it to top of history
  core.ipc.handle('copyItem', async (payload: unknown) => {
    const id = payload as string
    const found = history.find((item) => item.id === id)
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
        // Prevent triggering the poll loop since we set it ourselves

        // Re-sort: move this item to the top of its group (pinned stays in pinned section)
        found.copiedAt = new Date().toISOString()
        history = [found, ...history.filter((item) => item.id !== id)]
        sortHistory()
        await core.storage.write('history.json', history)
      } catch (err) {
        core.logger.error(`Failed to copy item "${id}" to clipboard.`, err)
      }
    }
    return history
  })

  // Run initialization
  init()
}
