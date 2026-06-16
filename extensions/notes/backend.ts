import type { CoreContext } from '@nuxyorg/extension-sdk'
import type {
  Note,
  NotesCreatePayload,
  NotesUpdatePayload,
  NotesDeletePayload,
  NotesSearchPayload,
  NotesTranscribePayload,
  NotesConfigurePayload,
  TranscribeResult,
  FtsRow,
} from './types.ts'
import { deriveTitle } from './utils/noteTitle.ts'

let db: ReturnType<CoreContext['db']['open']> | null = null
let extDataDir: string | null = null

function notePath(id: string): string {
  return `${extDataDir}/${id}.md`
}

function parseFrontMatter(text: string): { meta: Record<string, unknown>; body: string } {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: text }

  const meta: Record<string, unknown> = {}
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':')
    if (colon < 1) continue
    const key = line.slice(0, colon).trim()
    const rawVal = line.slice(colon + 1).trim()
    const num = Number(rawVal)
    meta[key] = rawVal !== '' && Number.isFinite(num) ? num : rawVal
  }

  return { meta, body: match[2].replace(/^\n/, '') }
}

function serializeNote(note: Note): string {
  return [
    '---',
    `id: ${note.id}`,
    `title: ${note.title}`,
    `createdAt: ${note.createdAt}`,
    `updatedAt: ${note.updatedAt}`,
    '---',
    '',
    note.body,
  ].join('\n')
}

function normalizeNote(raw: Partial<Note> & { id: string }): Note {
  if (!raw.id || typeof raw.id !== 'string') throw new Error('Invalid note: missing id')
  return {
    id: raw.id,
    title: raw.title ?? '',
    body: raw.body ?? '',
    createdAt: raw.createdAt ?? 0,
    updatedAt: raw.updatedAt ?? 0,
  }
}

async function readNote(core: CoreContext, id: string): Promise<Note> {
  const text = await core.fs.readFile(notePath(id))
  const { meta, body } = parseFrontMatter(text)
  return normalizeNote({
    id: (meta.id as string | undefined) ?? id,
    title: meta.title as string | undefined,
    createdAt: meta.createdAt as number | undefined,
    updatedAt: meta.updatedAt as number | undefined,
    body,
  })
}

async function writeNote(core: CoreContext, note: Note): Promise<void> {
  await core.fs.writeFile(notePath(note.id), serializeNote(note))
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

async function migrateJsonToMd(core: CoreContext): Promise<void> {
  let entries: { name: string; isDir: boolean }[]
  try {
    entries = await core.fs.readDir(extDataDir!)
  } catch {
    return
  }

  for (const entry of entries) {
    if (entry.isDir || !entry.name.endsWith('.json')) continue
    const jsonPath = `${extDataDir}/${entry.name}`
    try {
      const text = await core.fs.readFile(jsonPath)
      const raw = JSON.parse(text) as Partial<Note>
      if (!raw.id || typeof raw.id !== 'string') continue
      const note = normalizeNote(raw as Partial<Note> & { id: string })
      await core.fs.writeFile(notePath(note.id), serializeNote(note))
      await core.fs.rm(jsonPath)
      upsertFts(note)
    } catch {
      // Leave file in place if migration fails
    }
  }
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

export async function register(core: CoreContext): Promise<void> {
  extDataDir = `${core.fs.homedir()}/.nxy/data/com.nuxy.notes`
  await core.fs.mkdir(extDataDir, { recursive: true })

  db = core.db.open('fts')
  db.exec('CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id, title, body)')

  await migrateJsonToMd(core)

  core.registry.registerTool({ name: 'notes' })
  core.registry.registerProvider({ name: 'notes' })

  core.ipc.handle(
    'notes:create_from_provider',
    async (payload: unknown): Promise<{ toolId: string; query: string }> => {
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
    }
  )

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
    const results = await Promise.allSettled(
      entries
        .filter((e) => !e.isDir && e.name.endsWith('.md'))
        .map((e) => readNote(core, e.name.slice(0, -3)))
    )
    const notes = results
      .filter((r): r is PromiseFulfilledResult<Note> => r.status === 'fulfilled')
      .map((r) => r.value)
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

  core.ipc.handle(
    'notes:getConfig',
    async (): Promise<{ openaiApiKey: string; language: string; fontSize: string }> => {
      const openaiApiKey = (await core.settings.read<string>('openaiApiKey')) ?? ''
      const language = (await core.settings.read<string>('language')) ?? 'en'
      const fontSize = (await core.settings.read<string>('fontSize')) ?? '14px'
      return { openaiApiKey, language, fontSize }
    }
  )

  core.ipc.handle('notes:transcribe', async (payload: unknown): Promise<TranscribeResult> => {
    const { audioBuffer, language } = payload as NotesTranscribePayload
    const openaiApiKey = (await core.settings.read<string>('openaiApiKey')) ?? ''
    const configLanguage = (await core.settings.read<string>('language')) ?? 'en'
    if (!openaiApiKey) throw new Error('OpenAI API key not configured')

    const tmpPath = `${core.fs.tmpdir()}/nuxy-voice-${Date.now()}.webm`
    await core.fs.writeFile(tmpPath, new Uint8Array(audioBuffer))
    try {
      const transcript = await whisperTranscribe(
        new Uint8Array(audioBuffer),
        openaiApiKey,
        language ?? configLanguage ?? 'en'
      )
      return { transcript }
    } finally {
      await core.fs.rm(tmpPath).catch(() => {})
    }
  })

  core.ipc.handle('notes:configure', async (payload: unknown): Promise<void> => {
    const { openaiApiKey, language } = (payload as NotesConfigurePayload) ?? {}
    if (openaiApiKey !== undefined) {
      await core.settings.write('openaiApiKey', openaiApiKey)
    }
    if (language !== undefined) {
      await core.settings.write('language', language)
    }
  })
}
