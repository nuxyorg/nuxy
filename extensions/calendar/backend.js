/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
import { DatabaseSync } from 'node:sqlite'
import { randomUUID } from 'crypto'
import os from 'os'
import path from 'path'
import fs from 'fs'

const EXT_DATA_DIR = path.join(os.homedir(), '.nuxy', 'data', 'com.nuxy.calendar')
const DB_PATH = path.join(EXT_DATA_DIR, 'calendar.db')

function ensureDataDir() {
  if (!fs.existsSync(EXT_DATA_DIR)) {
    fs.mkdirSync(EXT_DATA_DIR, { recursive: true })
  }
}

function rowToEvent(row) {
  return {
    id: row.id,
    title: row.title,
    datetime: row.datetime,
    notes: row.notes,
    remindMin: row.remind_min,
    createdAt: row.created_at,
  }
}

export function checkReminders(core, getDb) {
  const db = getDb()
  if (!db) return Promise.resolve()

  const now = Date.now()
  const windowStart = now
  const windowEnd = now + 60000

  const stmt = db.prepare(
    `SELECT * FROM events WHERE remind_min > 0
     AND datetime - remind_min * 60 * 1000 >= ?
     AND datetime - remind_min * 60 * 1000 < ?`
  )
  const allRows = stmt.all(windowStart, windowEnd)
  const rows = allRows.filter((row) => {
    if (row.remind_min <= 0) return false
    const fireAt = row.datetime - row.remind_min * 60 * 1000
    return fireAt >= windowStart && fireAt < windowEnd
  })

  const promises = rows.map(async (row) => {
    core.logger.info(`Reminder firing for event: ${row.title}`)
    try {
      await core.extensions.invoke('kernel', 'notification:send', {
        title: 'Reminder',
        body: row.title,
      })
    } catch (_err) {
      // notification bridge may not exist yet
    }
  })

  return Promise.all(promises).then(() => undefined)
}

/** @param {CoreContext} core */
export function register(core) {
  ensureDataDir()

  const db = new DatabaseSync(DB_PATH)
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT,
      datetime INTEGER,
      notes TEXT,
      remind_min INTEGER,
      created_at INTEGER
    )
  `)

  core.registry.registerTool({ name: 'calendar' })

  const reminderInterval = setInterval(() => checkReminders(core, () => db), 60_000)

  core.ipc.handle('calendar:list', async ({ from, to } = {}) => {
    let stmt
    let rows
    if (from !== undefined && to !== undefined) {
      stmt = db.prepare(
        'SELECT * FROM events WHERE datetime BETWEEN ? AND ? ORDER BY datetime ASC'
      )
      rows = stmt.all(from, to)
    } else {
      stmt = db.prepare('SELECT * FROM events ORDER BY datetime ASC')
      rows = stmt.all()
    }
    return rows.map(rowToEvent)
  })

  core.ipc.handle('calendar:create', async ({ title, datetime, notes = '', remindMin = 0 }) => {
    const id = randomUUID()
    const createdAt = Date.now()
    const insertStmt = db.prepare(
      'INSERT INTO events (id, title, datetime, notes, remind_min, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    insertStmt.run(id, title, datetime, notes, remindMin, createdAt)
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id)
    return rowToEvent(row)
  })

  core.ipc.handle('calendar:update', async ({ id, title, datetime, notes, remindMin }) => {
    const setClauses = []
    const values = []

    if (title !== undefined) { setClauses.push('title = ?'); values.push(title) }
    if (datetime !== undefined) { setClauses.push('datetime = ?'); values.push(datetime) }
    if (notes !== undefined) { setClauses.push('notes = ?'); values.push(notes) }
    if (remindMin !== undefined) { setClauses.push('remind_min = ?'); values.push(remindMin) }

    if (setClauses.length > 0) {
      values.push(id)
      const updateStmt = db.prepare(
        `UPDATE events SET ${setClauses.join(', ')} WHERE id = ?`
      )
      updateStmt.run(...values)
    }

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id)
    return rowToEvent(row)
  })

  core.ipc.handle('calendar:delete', async ({ id }) => {
    const stmt = db.prepare('DELETE FROM events WHERE id = ?')
    stmt.run(id)
  })
}
