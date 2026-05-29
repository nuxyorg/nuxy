import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  CalendarEvent,
  CalendarEventRow,
  CalendarListPayload,
  CalendarCreatePayload,
  CalendarUpdatePayload,
  CalendarDeletePayload,
} from './types.ts'

function rowToEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    datetime: row.datetime,
    notes: row.notes,
    remindMin: row.remind_min,
    createdAt: row.created_at,
  }
}

export function checkReminders(core: CoreContext, getDb: () => ReturnType<CoreContext['db']['open']> | null): Promise<void> {
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
  const allRows = stmt.all(windowStart, windowEnd) as CalendarEventRow[]
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

export function register(core: CoreContext): void {
  const db = core.db.open('calendar')
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

  setInterval(() => checkReminders(core, () => db), 60_000)

  core.ipc.handle('calendar:list', async (payload) => {
    const { from, to } = (payload as CalendarListPayload) ?? {}
    let rows: CalendarEventRow[]
    if (from !== undefined && to !== undefined) {
      const stmt = db.prepare(
        'SELECT * FROM events WHERE datetime BETWEEN ? AND ? ORDER BY datetime ASC'
      )
      rows = stmt.all(from, to) as CalendarEventRow[]
    } else {
      const stmt = db.prepare('SELECT * FROM events ORDER BY datetime ASC')
      rows = stmt.all() as CalendarEventRow[]
    }
    return rows.map(rowToEvent)
  })

  core.ipc.handle('calendar:create', async (payload) => {
    const { title, datetime, notes = '', remindMin = 0 } = payload as CalendarCreatePayload
    const id = crypto.randomUUID()
    const createdAt = Date.now()
    const insertStmt = db.prepare(
      'INSERT INTO events (id, title, datetime, notes, remind_min, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    insertStmt.run(id, title, datetime, notes, remindMin, createdAt)
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as CalendarEventRow
    return rowToEvent(row)
  })

  core.ipc.handle('calendar:update', async (payload) => {
    const { id, title, datetime, notes, remindMin } = payload as CalendarUpdatePayload
    const setClauses: string[] = []
    const values: unknown[] = []

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

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as CalendarEventRow
    return rowToEvent(row)
  })

  core.ipc.handle('calendar:delete', async (payload) => {
    const { id } = payload as CalendarDeletePayload
    const stmt = db.prepare('DELETE FROM events WHERE id = ?')
    stmt.run(id)
  })
}
