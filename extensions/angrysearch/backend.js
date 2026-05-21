/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
import { DatabaseSync } from 'node:sqlite'
import os from 'os'
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'

let activeDb = null
let isUpdating = false
let lastUpdate = null

const EXT_DATA_DIR = path.join(os.homedir(), '.nuxy', 'data', 'com.nuxy.angrysearch')
const DB_PATH = path.join(EXT_DATA_DIR, 'angry_database.db')
const TEMP_DB_PATH = path.join(EXT_DATA_DIR, 'temp_angry_database.db')

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

function ensureDataDir() {
  if (!fs.existsSync(EXT_DATA_DIR)) {
    fs.mkdirSync(EXT_DATA_DIR, { recursive: true })
  }
}

function getDb() {
  if (activeDb) return activeDb

  if (fs.existsSync(DB_PATH)) {
    activeDb = new DatabaseSync(DB_PATH)
    // Add regex support
    activeDb.function('REGEXP', (pattern, text) => {
      try {
        return new RegExp(pattern, 'i').test(text) ? 1 : 0
      } catch (e) {
        return 0
      }
    })
  }
  return activeDb
}

async function updateDatabase() {
  if (isUpdating) return
  isUpdating = true

  try {
    ensureDataDir()

    // Remove old temp db if it exists
    if (fs.existsSync(TEMP_DB_PATH)) {
      fs.rmSync(TEMP_DB_PATH)
    }

    const db = new DatabaseSync(TEMP_DB_PATH)
    db.exec('PRAGMA synchronous = OFF;')
    db.exec('PRAGMA journal_mode = MEMORY;')
    db.exec('CREATE VIRTUAL TABLE angry_table USING fts4(directory, path)')
    const insertStmt = db.prepare('INSERT INTO angry_table VALUES (?, ?)')

    let batch = []
    const flush = () => {
      if (batch.length === 0) return
      db.exec('BEGIN TRANSACTION')
      for (const [isDir, p] of batch) {
        insertStmt.run(isDir, p)
      }
      db.exec('COMMIT')
      batch = []
    }

    const queue = ['/']

    while (queue.length > 0) {
      const currentDir = queue.shift()

      try {
        const dir = await fs.promises.opendir(currentDir)
        for await (const dirent of dir) {
          const fullPath = path.join(currentDir, dirent.name)

          if (dirent.isDirectory()) {
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
      } catch (e) {
        // Ignore permission denied and other errors during traversal
      }
    }

    flush()
    db.close()

    // Swap databases
    if (activeDb) {
      activeDb.close()
      activeDb = null
    }

    fs.renameSync(TEMP_DB_PATH, DB_PATH)
    lastUpdate = new Date()
  } catch (error) {
    console.error('Database update failed:', error)
  } finally {
    isUpdating = false
  }
}

/** @param {CoreContext} core */
export function register(core) {
  core.registry.registerTool({
    name: 'angrysearch',
  })

  // Start initial background update if db doesn't exist
  if (!fs.existsSync(DB_PATH)) {
    updateDatabase()
  }

  // Set up cron-like interval to update every 6 hours
  setInterval(updateDatabase, 6 * 60 * 60 * 1000)

  // Explicitly trigger update from UI
  core.ipc.handle('updateDatabase', async () => {
    if (!isUpdating) updateDatabase()
    return true
  })

  // Get status
  core.ipc.handle('getStatus', async () => {
    return {
      isUpdating,
      lastUpdate: lastUpdate ? lastUpdate.toISOString() : null,
      exists: fs.existsSync(DB_PATH),
    }
  })

  // Handle opening files and folders
  core.ipc.handle('openFile', async (filePath) => {
    return new Promise((resolve) => {
      execFile('xdg-open', [filePath], (err) => resolve(!err))
    })
  })

  core.ipc.handle('openLocation', async (filePath) => {
    const dir = path.dirname(filePath)
    return new Promise((resolve) => {
      execFile('xdg-open', [dir], (err) => resolve(!err))
    })
  })

  core.ipc.handle('search', async (payload) => {
    const text = payload?.query ?? ''
    const isRegex = payload?.regex === true
    const query = text.trim()

    if (query.length < 3) {
      return { items: [] }
    }

    try {
      const database = getDb()

      if (!database) {
        return { items: [] }
      }

      let stmt
      let results

      if (isRegex) {
        stmt = database.prepare(
          'SELECT path, directory FROM angry_table WHERE path REGEXP ? LIMIT 500'
        )
        results = stmt.all(query)
      } else {
        stmt = database.prepare(
          'SELECT path, directory FROM angry_table WHERE path LIKE ? LIMIT 500'
        )
        results = stmt.all(`%${query}%`)
      }

      const items = results.map((row) => {
        const filePath = row.path
        const name = path.basename(filePath)
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
    } catch (e) {
      // silently fail if DB not found or invalid regex syntax
      return { items: [] }
    }
  })
}
