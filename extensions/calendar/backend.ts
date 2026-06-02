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

export function checkReminders(
  core: CoreContext,
  getDb: () => ReturnType<CoreContext['db']['open']> | null
): Promise<void> {
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
  const allRows = stmt.all(windowStart, windowEnd) as unknown as CalendarEventRow[]
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

  // ─── In-memory last result (for orchestrator → frontend display) ──────────
  let lastResult: unknown = null

  core.ipc.handle('getLastResult', async (_payload: unknown) => {
    const res = lastResult
    lastResult = null // Clear on read so it doesn't open the create screen repeatedly
    return res
  })

  core.ipc.handle('setLastResult', async (data: unknown) => {
    lastResult = data
    core.logger.info(`[Calendar] Last result updated: ${JSON.stringify(data)}`)
    return { ok: true }
  })

  core.ipc.handle('calendar:prepare', async (payload: unknown) => {
    const args = payload as { title: string; date: string; time?: string }
    const title = args.title || ''
    const dateStr = args.date
    if (!dateStr) {
      return { success: false, error: 'Missing date parameter' }
    }

    const parts = dateStr.split('-')
    if (parts.length !== 3) {
      return { success: false, error: `Invalid date format: ${dateStr}` }
    }
    const year = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1
    const day = parseInt(parts[2], 10)

    const timeStr = args.time || '10:00'
    const timeParts = timeStr.split(':')
    const hours = timeParts.length >= 1 ? parseInt(timeParts[0], 10) : 10
    const minutes = timeParts.length >= 2 ? parseInt(timeParts[1], 10) : 0

    const parsedDate = new Date(year, month, day, hours, minutes, 0, 0)
    const datetime = parsedDate.getTime()

    return {
      success: true,
      data: {
        title,
        datetime,
      },
    }
  })

  setInterval(() => checkReminders(core, () => db), 60_000)

  core.ipc.handle('calendar:list', async (payload: unknown) => {
    const { from, to } = (payload as CalendarListPayload) ?? {}
    let rows: CalendarEventRow[]
    if (from !== undefined && to !== undefined) {
      const stmt = db.prepare(
        'SELECT * FROM events WHERE datetime BETWEEN ? AND ? ORDER BY datetime ASC'
      )
      rows = stmt.all(from, to) as unknown as CalendarEventRow[]
    } else {
      const stmt = db.prepare('SELECT * FROM events ORDER BY datetime ASC')
      rows = stmt.all() as unknown as CalendarEventRow[]
    }
    return rows.map(rowToEvent)
  })

  core.ipc.handle('calendar:getConfig', async () => {
    const defaultReminderMin = (await core.settings.read<number>('defaultReminderMin')) ?? 0
    const weekStart = (await core.settings.read<number>('weekStart')) ?? 1
    return { defaultReminderMin, weekStart }
  })

  core.ipc.handle('calendar:create', async (payload: unknown) => {
    const { title, datetime, notes = '', remindMin } = payload as CalendarCreatePayload
    const defaultReminderMin = (await core.settings.read<number>('defaultReminderMin')) ?? 0
    const actualRemindMin = remindMin !== undefined ? remindMin : defaultReminderMin
    const id = crypto.randomUUID()
    const createdAt = Date.now()
    const insertStmt = db.prepare(
      'INSERT INTO events (id, title, datetime, notes, remind_min, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    insertStmt.run(id, title, datetime, notes, actualRemindMin, createdAt)
    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as unknown as CalendarEventRow
    return rowToEvent(row)
  })

  core.ipc.handle('calendar:update', async (payload: unknown) => {
    const { id, title, datetime, notes, remindMin } = payload as CalendarUpdatePayload
    const setClauses: string[] = []
    const values: unknown[] = []

    if (title !== undefined) {
      setClauses.push('title = ?')
      values.push(title)
    }
    if (datetime !== undefined) {
      setClauses.push('datetime = ?')
      values.push(datetime)
    }
    if (notes !== undefined) {
      setClauses.push('notes = ?')
      values.push(notes)
    }
    if (remindMin !== undefined) {
      setClauses.push('remind_min = ?')
      values.push(remindMin)
    }

    if (setClauses.length > 0) {
      values.push(id)
      const updateStmt = db.prepare(`UPDATE events SET ${setClauses.join(', ')} WHERE id = ?`)
      updateStmt.run(...values)
    }

    const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as unknown as CalendarEventRow
    return rowToEvent(row)
  })

  core.ipc.handle('calendar:delete', async (payload: unknown) => {
    const { id } = payload as CalendarDeletePayload
    const stmt = db.prepare('DELETE FROM events WHERE id = ?')
    stmt.run(id)
  })
}
