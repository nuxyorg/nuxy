import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  Note,
  NotesCreatePayload,
  NotesUpdatePayload,
  NotesDeletePayload,
  NotesSearchPayload,
  NotesTranscribePayload,
  NotesConfigurePayload,
  NotesConfig,
  TranscribeResult,
  FtsRow,
} from './types.ts'

let db: ReturnType<CoreContext['db']['open']> | null = null
let extDataDir: string | null = null

function notePath(id: string): string {
  return `${extDataDir}/${id}.json`
}

async function readNote(core: CoreContext, id: string): Promise<Note> {
  const text = await core.fs.readFile(notePath(id))
  return JSON.parse(text) as Note
}

async function writeNote(core: CoreContext, note: Note): Promise<void> {
  await core.fs.writeFile(notePath(note.id), JSON.stringify(note))
}

function upsertFts(note: Note): void {
  const del = db!.prepare('DELETE FROM notes_fts WHERE id = ?')
  del.run(note.id)
  const ins = db!.prepare('INSERT INTO notes_fts(id, title, body) VALUES (?, ?, ?)')
  ins.run(note.id, note.title, note.body)
}

function deleteFts(id: string): void {
  const del = db!.prepare('DELETE FROM notes_fts WHERE id = ?')
  del.run(id)
}

async function whisperTranscribe(
  audioBuffer: Uint8Array,
  apiKey: string,
  language: string = 'en'
): Promise<string> {
  const form = new FormData()
  form.append(
    'file',
    new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/webm' }),
    'audio.webm'
  )
  form.append('model', 'whisper-1')
  if (language) form.append('language', language)

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  const data = (await res.json()) as { text?: string; error?: { message?: string } }
  if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`)
  return data.text ?? ''
}

function deriveTitle(body: string): string {
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return 'New Note'
  const firstLine = lines[0]
  if (firstLine.length > 40) {
    return firstLine.slice(0, 40) + '...'
  }
  return firstLine
}

export async function register(core: CoreContext): Promise<void> {
  extDataDir = `${core.fs.homedir()}/.nuxy/data/com.nuxy.notes`
  await core.fs.mkdir(extDataDir, { recursive: true })

  db = core.db.open('fts')
  db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id, title, body)')

  core.registry.registerTool({ name: 'notes' })
  core.registry.registerProvider({ name: 'notes' })

  core.ipc.handle('notes:create_from_provider', async (payload: unknown): Promise<{ toolId: string; query: string }> => {
    const { text } = payload as { text: string }
    const title = deriveTitle(text)
    const now = Date.now()
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      body: text,
      createdAt: now,
      updatedAt: now,
    }
    await writeNote(core, note)
    upsertFts(note)
    return {
      toolId: 'com.nuxy.notes',
      query: `select:${note.id}`,
    }
  })

  core.ipc.handle('eval', async (payload: unknown): Promise<{ items: unknown[] }> => {
    const text = (payload as { text?: string } | null | undefined)?.text ?? ''
    if (!text.trim()) return { items: [] }

    let matchingNotes: FtsRow[] = []
    try {
      const stmt = db!.prepare(
        'SELECT id, title, body FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank'
      )
      matchingNotes = stmt.all(text) as unknown as FtsRow[]
    } catch {
      try {
        const stmt = db!.prepare(
          'SELECT id, title, body FROM notes_fts WHERE title LIKE ? OR body LIKE ?'
        )
        matchingNotes = stmt.all(`%${text}%`, `%${text}%`) as unknown as FtsRow[]
      } catch {}
    }

    const items: unknown[] = []
    matchingNotes.forEach((row) => {
      items.push({
        id: 'com.nuxy.notes',
        title: row.title || 'Untitled',
        subtitle: `notes — ${row.body.slice(0, 40)}`,
        isTool: true,
        initialQuery: text,
      })
    })

    items.push({
      id: 'com.nuxy.notes',
      title: 'Save as note',
      subtitle: `notes — "${text}"`,
      execute: {
        channel: 'notes:create_from_provider',
        payload: { text },
      },
    })

    return { items }
  })

  core.ipc.handle('notes:list', async (): Promise<Note[]> => {
    const entries = await core.fs.readDir(extDataDir!)
    const notes = await Promise.all(
      entries
        .filter((e) => !e.isDir && e.name.endsWith('.json'))
        .map((e) => readNote(core, e.name.replace('.json', '')))
    )
    return notes.sort((a, b) => b.updatedAt - a.updatedAt)
  })

  core.ipc.handle('notes:create', async (payload: unknown): Promise<Note> => {
    const { title, body } = payload as NotesCreatePayload
    const now = Date.now()
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      body,
      createdAt: now,
      updatedAt: now,
    }
    await writeNote(core, note)
    upsertFts(note)
    return note
  })

  core.ipc.handle('notes:update', async (payload: unknown): Promise<Note> => {
    const { id, title, body } = payload as NotesUpdatePayload
    const existing = await readNote(core, id)
    const updated: Note = {
      ...existing,
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
      updatedAt: Date.now(),
    }
    await writeNote(core, updated)
    upsertFts(updated)
    return updated
  })

  core.ipc.handle('notes:delete', async (payload: unknown): Promise<void> => {
    const { id } = payload as NotesDeletePayload
    await core.fs.rm(notePath(id))
    deleteFts(id)
  })

  core.ipc.handle('notes:search', async (payload: unknown): Promise<Note[]> => {
    const { query } = payload as NotesSearchPayload
    if (!query || query.trim() === '') return []
    const stmt = db!.prepare(
      'SELECT id, title, body FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank'
    )
    const rows = stmt.all(query) as unknown as FtsRow[]
    return Promise.all(
      rows.map(async (row) => {
        try {
          return await readNote(core, row.id)
        } catch {
          return { id: row.id, title: row.title, body: row.body, createdAt: 0, updatedAt: 0 }
        }
      })
    )
  })

  core.ipc.handle('notes:transcribe', async (payload: unknown): Promise<TranscribeResult> => {
    const { audioBuffer, language } = payload as NotesTranscribePayload
    const config = await core.storage.read<NotesConfig>('config.json')
    if (!config?.openaiApiKey) throw new Error('OpenAI API key not configured')

    const tmpPath = `${core.fs.tmpdir()}/nuxy-voice-${Date.now()}.webm`
    await core.fs.writeFile(tmpPath, new Uint8Array(audioBuffer))
    try {
      const transcript = await whisperTranscribe(
        new Uint8Array(audioBuffer),
        config.openaiApiKey,
        language ?? config.language ?? 'en'
      )
      return { transcript }
    } finally {
      await core.fs.rm(tmpPath).catch(() => {})
    }
  })

  core.ipc.handle('notes:configure', async (payload: unknown): Promise<void> => {
    const { openaiApiKey, language } = (payload as NotesConfigurePayload) ?? {}
    const existing = (await core.storage.read<NotesConfig>('config.json')) ?? {}
    const updated: NotesConfig = {
      ...existing,
      ...(openaiApiKey !== undefined ? { openaiApiKey } : {}),
      ...(language !== undefined ? { language } : {}),
    }
    await core.storage.write('config.json', updated)
  })
}
