import type { CoreContext } from '@nuxyorg/extension-sdk'
import type { AngrysearchItem, SearchPayload, SearchResult, DbStatus, DbRow } from './types.ts'
import { parseIgnoredRoots } from './utils.ts'

type Db = ReturnType<CoreContext['db']['open']>

let activeDb: Db | null = null
let isUpdating = false
let lastUpdate: Date | null = null

const DEFAULT_IGNORED_ROOTS = [
  '/proc',
  '/dev',
  '/sys',
  '/snap',
  '/run',
  '/tmp',
  '/var/run',
  '/var/lock',
]

function registerRegexFunction(db: Db): void {
  db.function('REGEXP', (...args: unknown[]): unknown => {
    const pattern = args[0] as string
    const text = args[1] as string
    try {
      return new RegExp(pattern, 'i').test(text) ? 1 : 0
    } catch {
      return 0
    }
  })
}

/**
 * Walks the filesystem from `scanRoot`, skipping any directory in
 * `ignoredRoots` that sits directly under the scan root. This mirrors the
 * legacy safety behavior of never descending into volatile/virtual
 * filesystems (e.g. /proc, /sys) when the scan root is "/".
 */
async function updateDatabase(core: CoreContext): Promise<void> {
  if (isUpdating) return
  isUpdating = true

  try {
    const scanRoot = (await core.settings.read<string>('scanRoot')) ?? '/'
    const ignoredRootsRaw = await core.settings.read<string | string[]>('ignoredRoots')
    const ignoredList =
      ignoredRootsRaw === null ? DEFAULT_IGNORED_ROOTS : parseIgnoredRoots(ignoredRootsRaw)
    const ignoredSet = new Set(ignoredList)

    const tempDb = core.db.open('temp_angry_database')
    tempDb.exec('PRAGMA synchronous = OFF;')
    tempDb.exec('PRAGMA journal_mode = MEMORY;')
    tempDb.exec('DROP TABLE IF EXISTS angry_table;')
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

    const queue: string[] = [scanRoot]

    while (queue.length > 0) {
      const currentDir = queue.shift()!

      try {
        const entries = await core.fs.readDir(currentDir)
        for (const entry of entries) {
          const fullPath = currentDir === '/' ? `/${entry.name}` : `${currentDir}/${entry.name}`

          if (entry.isDir) {
            if (currentDir === scanRoot && ignoredSet.has(fullPath)) {
              continue
            }
            queue.push(fullPath)
            batch.push(['1', fullPath])
          } else {
            batch.push(['0', fullPath])
          }

          if (batch.length >= 5000) {
            flush()
            await new Promise((r) => setTimeout(r, 0))
          }
        }
      } catch {
        // Ignore permission denied and other errors during traversal
      }
    }

    flush()
    tempDb.close()

    if (activeDb) {
      activeDb.close()
      activeDb = null
    }

    const homedir = core.fs.homedir()
    const dataDir = `${homedir}/.nuxy/data/com.nuxy.angrysearch`
    const tempDbPath = `${dataDir}/temp_angry_database.db`
    const mainDbPath = `${dataDir}/angry_database.db`

    try {
      if (await core.fs.fileExists(tempDbPath)) {
        await core.fs.rename(tempDbPath, mainDbPath)
      }
    } catch (renameError) {
      core.logger.error('Failed to rename temp database:', renameError)
    }

    activeDb = core.db.open('angry_database')
    registerRegexFunction(activeDb)
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

  function getDb(): Db | null {
    if (activeDb) return activeDb
    try {
      activeDb = core.db.open('angry_database')
      registerRegexFunction(activeDb)
    } catch {
      // db not yet created
    }
    return activeDb
  }

  // Start initial background update if db not populated
  void updateDatabase(core)

  // Periodic check tick for automatic re-indexing
  setInterval(
    () => {
      void (async () => {
        try {
          const updateIntervalHours = (await core.settings.read<number>('updateIntervalHours')) ?? 6
          const intervalMs = updateIntervalHours * 60 * 60 * 1000
          if (lastUpdate && Date.now() - lastUpdate.getTime() >= intervalMs) {
            void updateDatabase(core)
          }
        } catch {
          // ignore
        }
      })()
    },
    5 * 60 * 1000
  )

  core.ipc.handle('updateDatabase', async (): Promise<boolean> => {
    if (!isUpdating) void updateDatabase(core)
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

      const searchLimit = (await core.settings.read<number>('searchLimit')) ?? 500
      const limitVal = Number(searchLimit)

      let stmt: ReturnType<Db['prepare']>
      let results: DbRow[]

      if (isRegex) {
        stmt = database.prepare(
          `SELECT path, directory FROM angry_table WHERE path REGEXP ? LIMIT ${limitVal}`
        )
        results = stmt.all(query) as unknown as DbRow[]
      } else {
        stmt = database.prepare(
          `SELECT path, directory FROM angry_table WHERE path LIKE ? LIMIT ${limitVal}`
        )
        results = stmt.all(`%${query}%`) as unknown as DbRow[]
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
    } catch {
      // silently fail if DB not found or invalid regex syntax
      return { items: [] }
    }
  })
}
