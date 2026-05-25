/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
import { DatabaseSync } from 'node:sqlite'
import os from 'os'
import path from 'path'
import fs from 'fs'
import https from 'https'
import { randomUUID } from 'crypto'

const EXT_DATA_DIR = path.join(os.homedir(), '.nuxy', 'data', 'com.nuxy.notes')
const DB_PATH = path.join(EXT_DATA_DIR, 'fts.db')

let db = null

function ensureDataDir() {
  if (!fs.existsSync(EXT_DATA_DIR)) {
    fs.mkdirSync(EXT_DATA_DIR, { recursive: true })
  }
}

function getDb() {
  if (db) return db
  db = new DatabaseSync(DB_PATH)
  db.exec(
    'CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(id, title, body)'
  )
  return db
}

function notePath(id) {
  return path.join(EXT_DATA_DIR, `${id}.json`)
}

function readNote(id) {
  return JSON.parse(fs.readFileSync(notePath(id), 'utf8'))
}

function writeNote(note) {
  fs.writeFileSync(notePath(note.id), JSON.stringify(note))
}

function upsertFts(note) {
  const database = getDb()
  const del = database.prepare('DELETE FROM notes_fts WHERE id = ?')
  del.run(note.id)
  const ins = database.prepare('INSERT INTO notes_fts(id, title, body) VALUES (?, ?, ?)')
  ins.run(note.id, note.title, note.body)
}

function deleteFts(id) {
  const database = getDb()
  const del = database.prepare('DELETE FROM notes_fts WHERE id = ?')
  del.run(id)
}

function whisperTranscribe(filePath, apiKey, language = 'en') {
  return new Promise((resolve, reject) => {
    const boundary = `----NuxyBoundary${Date.now()}`
    const fileBuffer = fs.readFileSync(filePath)
    const filename = path.basename(filePath)

    const preamble = Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: audio/webm\r\n\r\n`
    )
    const modelPart = Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`
    )
    const langPart = language
      ? Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n`)
      : Buffer.alloc(0)
    const closing = Buffer.from(`--${boundary}--\r\n`)
    const body = Buffer.concat([preamble, fileBuffer, modelPart, langPart, closing])

    const req = https.request(
      {
        hostname: 'api.openai.com',
        path: '/v1/audio/transcriptions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => { data += chunk })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data)
            if (res.statusCode !== 200)
              reject(new Error(parsed.error?.message ?? `HTTP ${res.statusCode}`))
            else resolve(parsed.text)
          } catch (e) {
            reject(e)
          }
        })
      }
    )
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

/** @param {CoreContext} core */
export function register(core) {
  ensureDataDir()
  getDb()

  core.registry.registerTool({ name: 'notes' })

  core.ipc.handle('notes:list', async () => {
    const files = fs.readdirSync(EXT_DATA_DIR).filter((f) => f.endsWith('.json'))
    const notes = files.map((f) => {
      const id = f.replace('.json', '')
      return readNote(id)
    })
    return notes.sort((a, b) => b.updatedAt - a.updatedAt)
  })

  core.ipc.handle('notes:create', async ({ title, body }) => {
    const now = Date.now()
    const note = {
      id: randomUUID(),
      title,
      body,
      createdAt: now,
      updatedAt: now,
    }
    writeNote(note)
    upsertFts(note)
    return note
  })

  core.ipc.handle('notes:update', async ({ id, title, body }) => {
    const existing = readNote(id)
    const updated = {
      ...existing,
      ...(title !== undefined ? { title } : {}),
      ...(body !== undefined ? { body } : {}),
      updatedAt: Date.now(),
    }
    writeNote(updated)
    upsertFts(updated)
    return updated
  })

  core.ipc.handle('notes:delete', async ({ id }) => {
    fs.unlinkSync(notePath(id))
    deleteFts(id)
  })

  core.ipc.handle('notes:search', async ({ query }) => {
    if (!query || query.trim() === '') return []
    const database = getDb()
    const stmt = database.prepare(
      'SELECT id, title, body FROM notes_fts WHERE notes_fts MATCH ? ORDER BY rank'
    )
    const rows = stmt.all(query)
    return rows.map((row) => {
      try {
        return readNote(row.id)
      } catch {
        return { id: row.id, title: row.title, body: row.body, createdAt: 0, updatedAt: 0 }
      }
    })
  })

  core.ipc.handle('notes:transcribe', async ({ audioBuffer, language }) => {
    const config = await core.storage.read('config.json')
    if (!config?.openaiApiKey) throw new Error('OpenAI API key not configured')

    const tmpFile = path.join(os.tmpdir(), `nuxy-voice-${Date.now()}.webm`)
    fs.writeFileSync(tmpFile, Buffer.from(audioBuffer))
    try {
      const transcript = await whisperTranscribe(tmpFile, config.openaiApiKey, language ?? config.language ?? 'en')
      return { transcript }
    } finally {
      fs.unlinkSync(tmpFile)
    }
  })

  core.ipc.handle('notes:configure', async ({ openaiApiKey, language } = {}) => {
    const existing = (await core.storage.read('config.json')) ?? {}
    const updated = {
      ...existing,
      ...(openaiApiKey !== undefined ? { openaiApiKey } : {}),
      ...(language !== undefined ? { language } : {}),
    }
    await core.storage.write('config.json', updated)
  })
}
