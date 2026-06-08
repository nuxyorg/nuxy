import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Paths relative to this script
const srcE2eDir = __dirname
const srcDir = path.resolve(srcE2eDir, '..')
const rootDir = path.resolve(srcDir, '..')
const packagesDir = path.resolve(rootDir, 'packages')
const extensionsDir = path.resolve(rootDir, 'extensions')

const cacheDir = path.resolve(srcE2eDir, '.cache')
const cacheFile = path.resolve(cacheDir, 'e2e-cache.json')
const tempReportFile = path.resolve(cacheDir, 'temp-report.json')

/** Copy loose shared modules (ce-utils.ts, etc.) into ~/.nuxy for e2e. */
function syncSharedExtensionFiles() {
  const nuxyHome = path.join(process.env.HOME ?? '', '.nuxy')
  const targets = [
    path.join(nuxyHome, 'extensions'),
    path.join(nuxyHome, 'extracted'),
  ]
  if (!fs.existsSync(extensionsDir)) return
  for (const name of fs.readdirSync(extensionsDir)) {
    const src = path.join(extensionsDir, name)
    if (!fs.statSync(src).isFile() || !/\.(ts|tsx|js|jsx)$/.test(name)) continue
    for (const dir of targets) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.copyFileSync(src, path.join(dir, name))
    }
  }
}

// Helper to recursively get files excluding ignored folders/files
function getFiles(dir, allFiles = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'dist-electron' ||
        entry.name === 'release' ||
        entry.name === 'out' ||
        entry.name === 'playwright-report' ||
        entry.name === 'test-results' ||
        entry.name === '.cache' ||
        entry.name === '.git' ||
        entry.name === '.vite' ||
        entry.name === '.pnpm-store' ||
        entry.name === '.turbo'
      ) {
        continue
      }
      getFiles(res, allFiles)
    } else {
      if (
        entry.name.endsWith('.tsbuildinfo') ||
        entry.name.endsWith('.log') ||
        entry.name === '.DS_Store'
      ) {
        continue
      }
      allFiles.push(res)
    }
  }
  return allFiles
}

// Helper to compute combined hash for a list of files
function computeHashForFiles(files) {
  const hash = crypto.createHash('sha256')
  for (const file of files) {
    const relPath = path.relative(rootDir, file)
    hash.update(relPath)
    try {
      const content = fs.readFileSync(file)
      hash.update(content)
    } catch (e) {
      // Ignore read errors
    }
  }
  return hash.digest('hex')
}

// Helper to recursively gather test spec results from Playwright JSON report
function getSpecResults(suite, results = {}) {
  const file = suite.file
  if (file) {
    if (!results[file]) {
      results[file] = { passed: true, specsCount: 0 }
    }
  }
  if (suite.specs) {
    for (const spec of suite.specs) {
      const specFile = spec.file || file
      if (specFile) {
        if (!results[specFile]) {
          results[specFile] = { passed: true, specsCount: 0 }
        }
        results[specFile].specsCount++
        if (!spec.ok) {
          results[specFile].passed = false
        }
      }
    }
  }
  if (suite.suites) {
    for (const subSuite of suite.suites) {
      getSpecResults(subSuite, results)
    }
  }
  return results
}

// Main logic
async function run() {
  console.log('Calculating files and hashes...')

  // 1. Gather all core files (src/ except specs, packages/, root configs)
  const coreFiles = getFiles(srcDir).filter((f) => {
    // Exclude spec files under src/e2e/ so a spec change doesn't invalidate other specs
    if (f.startsWith(srcE2eDir) && f.endsWith('.spec.ts')) {
      return false
    }
    return true
  })

  const packagesFiles = fs.existsSync(packagesDir) ? getFiles(packagesDir) : []
  const rootConfigFiles = [
    path.resolve(rootDir, 'package.json'),
    path.resolve(rootDir, 'pnpm-lock.yaml'),
    path.resolve(rootDir, 'pnpm-workspace.yaml'),
    path.resolve(rootDir, 'tsconfig.json'),
    path.resolve(srcDir, 'package.json'),
    path.resolve(srcDir, 'playwright.config.ts'),
    path.resolve(srcDir, 'tsconfig.json'),
  ].filter((f) => fs.existsSync(f))

  const allCoreFiles = [...coreFiles, ...packagesFiles, ...rootConfigFiles].sort()
  const currentCoreHash = computeHashForFiles(allCoreFiles)

  // 2. Gather all spec targets
  const specFiles = []

  // Extension specs
  if (fs.existsSync(extensionsDir)) {
    const extDirs = fs.readdirSync(extensionsDir, { withFileTypes: true })
    for (const dir of extDirs) {
      if (dir.isDirectory()) {
        const specPath = path.resolve(extensionsDir, dir.name, 'e2e.spec.ts')
        if (fs.existsSync(specPath)) {
          specFiles.push({
            absolutePath: specPath,
            relativePath: path.relative(rootDir, specPath),
            type: 'extension',
            name: dir.name,
            dirPath: path.resolve(extensionsDir, dir.name),
          })
        }
      }
    }
  }

  // Core specs under src/e2e
  if (fs.existsSync(srcE2eDir)) {
    const files = getFiles(srcE2eDir)
    for (const file of files) {
      if (file.endsWith('.spec.ts')) {
        specFiles.push({
          absolutePath: file,
          relativePath: path.relative(rootDir, file),
          type: 'core',
          name: path.basename(file, '.spec.ts'),
          dirPath: null,
        })
      }
    }
  }

  // 3. Parse CLI args: separating filters from playwright forwarded options
  const cliArgs = process.argv.slice(2)
  const filters = []
  const forwardedArgs = []

  for (const arg of cliArgs) {
    if (arg === '--') continue
    if (arg.startsWith('-')) {
      forwardedArgs.push(arg)
    } else {
      filters.push(arg)
    }
  }

  // Filter the spec targets if any filters were provided
  let filteredSpecs = specFiles
  if (filters.length > 0) {
    filteredSpecs = specFiles.filter((spec) => {
      return filters.some((filter) => {
        return (
          spec.name.includes(filter) ||
          spec.relativePath.includes(filter) ||
          spec.type === filter
        )
      })
    })
  }

  // 4. Load Cache
  let cache = { lastCoreHash: '', testCache: {} }
  if (fs.existsSync(cacheFile)) {
    try {
      cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'))
    } catch (e) {
      // Invalid cache JSON, proceed with default
    }
  }

  const noCache = process.env.NO_CACHE === '1' || process.env.NO_CACHE === 'true'
  const coreHashChanged = cache.lastCoreHash !== currentCoreHash

  if (noCache) {
    console.log('NO_CACHE env is set. Bypassing cache.')
  } else if (coreHashChanged) {
    console.log('Core files changed. Cache invalidated.')
  }

  // 5. Evaluate Cache Status for each filtered spec
  for (const spec of filteredSpecs) {
    // Individual spec hash consists of the spec file itself, and if it's an extension,
    // all files inside that extension's directory.
    let specHash = ''
    if (spec.type === 'extension') {
      const extFiles = getFiles(spec.dirPath).sort()
      specHash = computeHashForFiles([spec.absolutePath, ...extFiles])
    } else {
      specHash = computeHashForFiles([spec.absolutePath])
    }

    spec.currentHash = specHash

    const cachedEntry = cache.testCache?.[spec.relativePath]
    if (!noCache && !coreHashChanged && cachedEntry?.passed && cachedEntry?.hash === specHash) {
      spec.cached = true
    } else {
      spec.cached = false
    }
  }

  // 6. Partition and print summary
  const cachedSpecs = filteredSpecs.filter((s) => s.cached)
  const toRunSpecs = filteredSpecs.filter((s) => !s.cached)

  if (cachedSpecs.length > 0) {
    console.log(`\n\x1b[32m[CACHE OK] ${cachedSpecs.length} spec(s) unchanged:\x1b[0m`)
    for (const spec of cachedSpecs) {
      console.log(`  - ${spec.relativePath}`)
    }
  }

  if (toRunSpecs.length === 0) {
    console.log('\n\x1b[32mAll matching tests are cached. Skipping Playwright run.\x1b[0m\n')
    process.exit(0)
  }

  console.log(`\n\x1b[33mRunning ${toRunSpecs.length} uncached spec(s):\x1b[0m`)
  for (const spec of toRunSpecs) {
    console.log(`  - ${spec.relativePath}`)
  }

  // 7. Spawn Playwright CLI
  syncSharedExtensionFiles()
  const runFiles = toRunSpecs.map((s) => s.absolutePath)
  fs.mkdirSync(cacheDir, { recursive: true })

  if (fs.existsSync(tempReportFile)) {
    try {
      fs.unlinkSync(tempReportFile)
    } catch (e) {}
  }

  const playwrightArgs = [
    'exec',
    'playwright',
    'test',
    ...runFiles,
    ...forwardedArgs,
    '--reporter=list,json',
  ]
  console.log(`\nSpawning: pnpm ${playwrightArgs.join(' ')}\n`)

  const child = spawn('pnpm', playwrightArgs, {
    cwd: srcDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYWRIGHT_JSON_OUTPUT_NAME: tempReportFile,
    },
  })

  child.on('close', (code) => {
    if (fs.existsSync(tempReportFile)) {
      try {
        const report = JSON.parse(fs.readFileSync(tempReportFile, 'utf8'))
        const results = {}

        if (report.suites) {
          for (const suite of report.suites) {
            getSpecResults(suite, results)
          }
        }

        let cacheUpdated = false

        if (!report.errors || report.errors.length === 0) {
          if (!cache.testCache) {
            cache.testCache = {}
          }

          for (const [absOrRelPath, result] of Object.entries(results)) {
            const relPath = path.isAbsolute(absOrRelPath)
              ? path.relative(rootDir, absOrRelPath)
              : absOrRelPath

            const spec = toRunSpecs.find((s) => s.relativePath === relPath)
            if (spec) {
              if (result.passed) {
                cache.testCache[relPath] = {
                  passed: true,
                  hash: spec.currentHash,
                  timestamp: Date.now(),
                }
                cacheUpdated = true
              } else {
                delete cache.testCache[relPath]
                cacheUpdated = true
              }
            }
          }
        }

        if (cacheUpdated || coreHashChanged) {
          cache.lastCoreHash = currentCoreHash
          fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf8')
          console.log(`\x1b[32mCache updated successfully in ${cacheFile}\x1b[0m`)
        }
      } catch (e) {
        console.error('Failed to parse temp-report.json:', e)
      } finally {
        try {
          fs.unlinkSync(tempReportFile)
        } catch (e) {}
      }
    } else {
      console.log('No Playwright JSON report found. Cache not updated.')
    }

    process.exit(code === null ? 1 : code)
  })
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
