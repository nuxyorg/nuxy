import type { CoreContext } from '@nuxy/extension-sdk'
import type { AngrysearchItem, SearchPayload, SearchResult, DbStatus, DbRow } from './types.ts'

let activeDb: ReturnType<CoreContext['db']['open']> | null = null
let isUpdating = false
let lastUpdate: Date | null = null

const IGNORED_ROOTS = new Set([
  '/proc',
  '/dev',
  '/sys',
  '/snap',
  '/run',
  '/tmp',
  '/var/run',
  '/var/lock',
])

async function updateDatabase(core: CoreContext): Promise<void> {
  if (isUpdating) return
  isUpdating = true

  try {
    const tempDb = core.db.open('temp_angry_database')
    tempDb.exec('PRAGMA synchronous = OFF;')
    tempDb.exec('PRAGMA journal_mode = MEMORY;')
    tempDb.exec('CREATE VIRTUAL TABLE angry_table USING fts4(directory, path)')
    const insertStmt = tempDb.prepare('INSERT INTO angry_table VALUES (?, ?)')

    let batch: [string, string][] = []
    const flush = (): void => {
      if (batch.length === 0) return
      tempDb.exec('BEGIN TRANSACTION')
      for (const [isDir, p] of batch) {
        insertStmt.run(isDir, p)
      }
      tempDb.exec('COMMIT')
      batch = []
    }

    const queue: string[] = ['/']

    while (queue.length > 0) {
      const currentDir = queue.shift()!

      try {
        const entries = await core.fs.readDir(currentDir)
        for (const entry of entries) {
          const fullPath = currentDir === '/' ? `/${entry.name}` : `${currentDir}/${entry.name}`

          if (entry.isDir) {
            if (currentDir === '/' && IGNORED_ROOTS.has(fullPath)) {
              continue
            }
            queue.push(fullPath)
            batch.push(['1', fullPath])
          } else {
            batch.push(['0', fullPath])
          }

          if (batch.length >= 5000) {
            flush()
            await new Promise((r) => setImmediate(r))
          }
        }
      } catch (_e) {
        // Ignore permission denied and other errors during traversal
      }
    }

    flush()
    tempDb.close()

    if (activeDb) {
      activeDb.close()
      activeDb = null
    }

    // Replace main db with temp db
    const mainDb = core.db.open('angry_database')
    mainDb.close()
    // Re-open as active
    activeDb = core.db.open('angry_database')
    lastUpdate = new Date()
  } catch (error) {
    core.logger.error('Database update failed:', error)
  } finally {
    isUpdating = false
  }
}

export function register(core: CoreContext): void {
  core.registry.registerTool({
    name: 'angrysearch',
  })

  function getDb(): ReturnType<CoreContext['db']['open']> | null {
    if (activeDb) return activeDb
    try {
      activeDb = core.db.open('angry_database')
      activeDb.function('REGEXP', (pattern: string, text: string): number => {
        try {
          return new RegExp(pattern, 'i').test(text) ? 1 : 0
        } catch (_e) {
          return 0
        }
      })
    } catch {
      // db not yet created
    }
    return activeDb
  }

  // Start initial background update if db not populated
  updateDatabase(core)

  // Update every 6 hours
  setInterval(() => updateDatabase(core), 6 * 60 * 60 * 1000)

  core.ipc.handle('updateDatabase', async (): Promise<boolean> => {
    if (!isUpdating) updateDatabase(core)
    return true
  })

  core.ipc.handle('getStatus', async (): Promise<DbStatus> => {
    return {
      isUpdating,
      lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
      exists: !!activeDb,
    }
  })

  core.ipc.handle('openFile', async (payload: unknown): Promise<boolean> => {
    await core.shell.open(payload as string)
    return true
  })

  core.ipc.handle('openLocation', async (payload: unknown): Promise<boolean> => {
    const filePath = payload as string
    const dir = filePath.replace(/\/[^/]*$/, '') || '/'
    await core.shell.open(dir)
    return true
  })

  core.ipc.handle('search', async (payload: unknown): Promise<SearchResult> => {
    const p = payload as SearchPayload | null | undefined
    const text = p?.query ?? ''
    const isRegex = p?.regex === true
    const query = text.trim()

    if (query.length < 3) {
      return { items: [] }
    }

    try {
      const database = getDb()

      if (!database) {
        return { items: [] }
      }

      let stmt: ReturnType<typeof database.prepare>
      let results: DbRow[]

      if (isRegex) {
        stmt = database.prepare(
          'SELECT path, directory FROM angry_table WHERE path REGEXP ? LIMIT 500'
        )
        results = stmt.all(query) as DbRow[]
      } else {
        stmt = database.prepare(
          'SELECT path, directory FROM angry_table WHERE path LIKE ? LIMIT 500'
        )
        results = stmt.all(`%${query}%`) as DbRow[]
      }

      const items: AngrysearchItem[] = results.map((row) => {
        const filePath = row.path
        const name = filePath.split('/').pop() || filePath
        const isDir = String(row.directory) === '1'

        return {
          id: `angry-${filePath}`,
          title: name,
          subtitle: filePath,
          value: filePath,
          isDir,
        }
      })

      return { items }
    } catch (_e) {
      // silently fail if DB not found or invalid regex syntax
      return { items: [] }
    }
  })
}
