import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  Snippet,
  AddSnippetPayload,
  DeleteSnippetPayload,
  CopySnippetPayload,
  GetSnippetsPayload,
} from './types.ts'

const STORAGE_KEY = 'snippets.json'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'snippets' })

  async function readSnippets(): Promise<Snippet[]> {
    return (await core.storage.read<Snippet[]>(STORAGE_KEY)) ?? []
  }

  async function writeSnippets(snippets: Snippet[]): Promise<void> {
    await core.storage.write<Snippet[]>(STORAGE_KEY, snippets)
  }

  function sortByUpdatedAt(snippets: Snippet[]): Snippet[] {
    return [...snippets].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  core.ipc.handle('getSnippets', async (payload: unknown): Promise<Snippet[]> => {
    const { query } = (payload as GetSnippetsPayload) ?? {}
    const snippets = await readSnippets()
    const sorted = sortByUpdatedAt(snippets)
    if (!query) return sorted
    const q = query.toLowerCase()
    return sorted.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        s.tags.some((tag) => tag.toLowerCase().includes(q))
    )
  })

  core.ipc.handle('addSnippet', async (payload: unknown): Promise<Snippet> => {
    const { title, content, tags = [] } = payload as AddSnippetPayload
    const now = new Date().toISOString()
    const snippet: Snippet = {
      id: crypto.randomUUID(),
      title,
      content,
      tags,
      createdAt: now,
      updatedAt: now,
    }
    const existing = await readSnippets()
    await writeSnippets([snippet, ...existing])
    core.logger.info('Snippet added', { id: snippet.id, title: snippet.title })
    return snippet
  })

  core.ipc.handle('deleteSnippet', async (payload: unknown): Promise<Snippet[]> => {
    const { id } = payload as DeleteSnippetPayload
    const existing = await readSnippets()
    const found = existing.find((s) => s.id === id)
    if (!found) {
      core.logger.warn('deleteSnippet: id not found', { id })
      return sortByUpdatedAt(existing)
    }
    const updated = existing.filter((s) => s.id !== id)
    await writeSnippets(updated)
    return sortByUpdatedAt(updated)
  })

  core.ipc.handle('copySnippet', async (payload: unknown): Promise<{ copied: true }> => {
    const { id } = payload as CopySnippetPayload
    const existing = await readSnippets()
    const snippet = existing.find((s) => s.id === id)
    if (!snippet) {
      throw new Error(core.i18n.t('errors.notFound'))
    }
    await core.clipboard.writeText(snippet.content)
    return { copied: true }
  })

  core.ipc.handle('saveClipboardAsSnippet', async (_payload: unknown): Promise<Snippet> => {
    const content = await core.clipboard.readText()
    const trimmed = content.trim()
    const title = trimmed.length > 40 ? trimmed.slice(0, 40) + '...' : trimmed
    const now = new Date().toISOString()
    const snippet: Snippet = {
      id: crypto.randomUUID(),
      title,
      content,
      tags: [],
      createdAt: now,
      updatedAt: now,
    }
    const existing = await readSnippets()
    await writeSnippets([snippet, ...existing])
    core.logger.info('Saved clipboard as snippet', { id: snippet.id, title: snippet.title })
    return snippet
  })
}
