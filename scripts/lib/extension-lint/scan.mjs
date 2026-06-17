import fs from 'fs'
import path from 'path'

const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.git']

const EMOJI_REGEX =
  /(?:\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83D[\uDE80-\uDEFC]|\uD83E[\uDD00-\uDDFF]|[\u2600-\u27BF])/g

const HARDCODED_STYLE_REGEX =
  /style=\{\{\s*[^}]*(?:color|background|padding|margin|border|boxShadow)\s*:\s*['"`](?!var\()[^'"`]+['"`]/i

const DOM_ANTIPATTERN_RULES = [
  {
    id: 'innerHTML-assignment',
    regex: /\.innerHTML\s*=/,
    message: 'Use Lit templates and <slot> instead of .innerHTML assignment',
    severity: 'medium',
  },
  {
    id: 'outerHTML-assignment',
    regex: /\.outerHTML\s*=/,
    message: 'Use Lit html`` templates instead of .outerHTML assignment',
    severity: 'medium',
  },
  {
    id: 'insertAdjacentHTML',
    regex: /\.insertAdjacentHTML\s*\(/,
    message: 'Use Lit html`` templates instead of insertAdjacentHTML',
    severity: 'medium',
  },
  {
    id: 'replaceChildren',
    regex: /\.replaceChildren\s*\(/,
    message: 'Use Lit render() instead of replaceChildren in components',
    severity: 'medium',
  },
  {
    id: 'document-createElement',
    regex: /document\.createElement\s*\(/,
    message: 'Prefer Lit html`` templates over document.createElement in components',
    severity: 'medium',
  },
  {
    id: 'body-appendChild',
    regex: /document\.body\.appendChild\s*\(/,
    message: 'Prefer <nuxy-portal> for body-mounted overlays',
    severity: 'medium',
  },
  {
    id: 'querySelector',
    regex: /\.querySelector(All)?(?:<[^>]*>)?\s*\(/,
    message: 'Prefer @query / ref() in Lit components; querySelector is OK in tests and utilities',
    severity: 'low',
  },
]

const DOM_SCAN_SKIP_FILES = new Set([
  'render-markdown.ts',
  'nuxy-tool-host.ts',
  'nuxy-portal.ts',
  'scroll-into-view.ts',
])

const DOM_SCAN_SKIP_SUFFIXES = ['.test.ts', '.spec.ts', 'e2e.spec.ts']

function walkDir(dir) {
  let results = []
  for (const file of fs.readdirSync(dir)) {
    if (EXCLUDE_DIRS.includes(file)) continue
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(walkDir(fullPath))
    } else {
      results.push(fullPath)
    }
  }
  return results
}

function listExtensionNames(extensionsDir) {
  return fs.readdirSync(extensionsDir).filter((file) => {
    const fullPath = path.join(extensionsDir, file)
    return fs.statSync(fullPath).isDirectory() && !EXCLUDE_DIRS.includes(file) && file !== 'tests'
  })
}

function isDomScanSkipFile(relativePath) {
  const base = path.basename(relativePath)
  if (DOM_SCAN_SKIP_FILES.has(base)) return true
  if (relativePath.includes('gradient/') && base === 'gradient.ts') return true
  return false
}

function shouldScanDomPatterns(relativePath) {
  if (!relativePath.endsWith('.ts')) return false
  if (DOM_SCAN_SKIP_SUFFIXES.some((s) => relativePath.endsWith(s))) return false
  if (isDomScanSkipFile(relativePath)) return false
  return true
}

function shouldScanDomInExtension(extName, relativePath) {
  if (!shouldScanDomPatterns(relativePath)) return false
  if (extName === 'ui-default') return relativePath.startsWith('src/')
  if (extName === 'shell') return true
  return relativePath.endsWith('frontend.ts') || relativePath.endsWith('controller.ts')
}

function scanDomAntipatterns(relativePath, content) {
  const hits = []
  const lines = content.split('\n')
  for (const rule of DOM_ANTIPATTERN_RULES) {
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return
      if (rule.regex.test(line)) {
        hits.push({
          file: `${relativePath}:${index + 1}`,
          rule: `DOM: ${rule.id}`,
          message: rule.message,
          severity: rule.severity,
        })
      }
    })
  }
  return hits
}

function scanExtension(extName, extensionsDir) {
  const extPath = path.join(extensionsDir, extName)
  const files = walkDir(extPath)

  const extReport = {
    manifest: null,
    violations: [],
    filesCount: files.length,
    hasBackend: false,
    hasBackendTest: false,
    hasFrontend: false,
  }

  const manifestFile = files.find((f) => path.basename(f) === 'manifest.json')
  if (manifestFile) {
    try {
      extReport.manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
    } catch (e) {
      extReport.violations.push({
        file: 'manifest.json',
        rule: 'Valid JSON manifest',
        message: `Failed to parse manifest.json: ${e.message}`,
        severity: 'high',
      })
    }
  } else {
    extReport.violations.push({
      file: 'manifest.json',
      rule: 'Manifest existence',
      message: 'manifest.json does not exist',
      severity: 'high',
    })
  }

  for (const file of files) {
    const relative = path.relative(extPath, file)
    const extname = path.extname(file)
    const basename = path.basename(file)

    const isUikitBuildArtifact =
      extname === '.js' && extReport.manifest?.type === 'uikit' && path.dirname(file) === extPath
    if (
      extname === '.js' &&
      !isUikitBuildArtifact &&
      basename !== 'manifest.json' &&
      basename !== 'package.json' &&
      !file.includes('node_modules')
    ) {
      extReport.violations.push({
        file: relative,
        rule: 'TypeScript only (No .js)',
        message: 'JavaScript source files are banned. All source files must be TypeScript.',
        severity: 'high',
      })
    }

    if (basename === 'backend.ts') extReport.hasBackend = true
    if (basename === 'backend.test.ts') extReport.hasBackendTest = true
    if (basename === 'frontend.tsx') extReport.hasFrontend = true
  }

  if (extReport.hasBackend && !extReport.hasBackendTest) {
    extReport.violations.push({
      file: 'backend.ts',
      rule: 'Backend Unit Tests',
      message: 'backend.ts exists but no backend.test.ts was found in the extension directory.',
      severity: 'medium',
    })
  }

  for (const file of files) {
    const relative = path.relative(extPath, file)
    const content = fs.readFileSync(file, 'utf8')
    const lines = content.split('\n')
    const isBackend = file.endsWith('backend.ts')
    const isFrontend = file.endsWith('frontend.tsx')

    if (isBackend) {
      const nodeImports = [
        /import\s+.*\s+from\s+['"]fs['"]/g,
        /import\s+.*\s+from\s+['"]os['"]/g,
        /import\s+.*\s+from\s+['"]path['"]/g,
        /import\s+.*\s+from\s+['"]child_process['"]/g,
        /import\s+.*\s+from\s+['"]node:sqlite['"]/g,
        /import\s+.*\s+from\s+['"]node:.*['"]/g,
        /require\(['"](?:fs|os|path|child_process|node:.*)['"]\)/g,
      ]

      for (const regex of nodeImports) {
        if (regex.test(content)) {
          extReport.violations.push({
            file: relative,
            rule: 'No Direct Node.js Imports',
            message: `Backend contains direct Node.js imports (matched regex: ${regex.toString()}). Use core.fs, core.db, or core.shell instead.`,
            severity: 'high',
          })
        }
      }

      lines.forEach((line, index) => {
        if (
          line.includes('console.log') ||
          line.includes('console.error') ||
          line.includes('console.warn')
        ) {
          extReport.violations.push({
            file: `${relative}:${index + 1}`,
            rule: 'No Console Logs in Backend',
            message: `Found console statement in backend: "${line.trim()}"`,
            severity: 'medium',
          })
        }
      })
    }

    if (isFrontend) {
      if (/import\s+React\s+from\s+['"]react['"]/g.test(content)) {
        extReport.violations.push({
          file: relative,
          rule: 'No ESM React Import in Frontend',
          message:
            'Frontend contains "import React from \'react\'". Use "const React = window.React" instead.',
          severity: 'high',
        })
      }

      lines.forEach((line, index) => {
        if (/<input\b/i.test(line)) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No HTML Input Elements',
              message: `Frontend contains raw <input> element: "${line.trim()}". All text input must come through the shell's omnibar query.`,
              severity: 'high',
            })
          }
        }
        if (/<textarea\b/i.test(line)) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No HTML Textarea Elements',
              message: `Frontend contains raw <textarea> element: "${line.trim()}".`,
              severity: 'high',
            })
          }
        }
        if (/<button\b/i.test(line)) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No HTML Button Elements',
              message: `Frontend contains raw <button> element: "${line.trim()}". Use window.UI.Button instead.`,
              severity: 'high',
            })
          }
        }
        if (EMOJI_REGEX.test(line)) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No Emojis in UI',
              message: `Found emoji character: "${line.trim()}". Use icon components from window.UI instead.`,
              severity: 'medium',
            })
          }
        }
        if (HARDCODED_STYLE_REGEX.test(line)) {
          if (!line.trim().startsWith('//') && !line.trim().startsWith('*')) {
            extReport.violations.push({
              file: `${relative}:${index + 1}`,
              rule: 'No Hardcoded Styles',
              message: `Found hardcoded style/color: "${line.trim()}". Use CSS variables/theme tokens instead.`,
              severity: 'medium',
            })
          }
        }
      })
    }

    if (shouldScanDomInExtension(extName, relative)) {
      extReport.violations.push(...scanDomAntipatterns(relative, content))
    }

    if (extReport.manifest?.permissions) {
      const perms = extReport.manifest.permissions
      if (content.includes('core.storage') && !perms.includes('storage')) {
        extReport.violations.push({
          file: relative,
          rule: 'Undeclared Permission (storage)',
          message: 'Uses core.storage but "storage" permission is not declared in manifest.json',
          severity: 'high',
        })
      }
      if (content.includes('core.clipboard') && !perms.includes('clipboard')) {
        extReport.violations.push({
          file: relative,
          rule: 'Undeclared Permission (clipboard)',
          message:
            'Uses core.clipboard but "clipboard" permission is not declared in manifest.json',
          severity: 'high',
        })
      }
      if (content.includes('core.media') && !perms.includes('media')) {
        extReport.violations.push({
          file: relative,
          rule: 'Undeclared Permission (media)',
          message: 'Uses core.media but "media" permission is not declared in manifest.json',
          severity: 'high',
        })
      }
      if (content.includes('fetch(') && !perms.includes('network')) {
        extReport.violations.push({
          file: relative,
          rule: 'Undeclared Permission (network)',
          message: 'Uses fetch() but "network" permission is not declared in manifest.json',
          severity: 'high',
        })
      }
    }
  }

  return extReport
}

/**
 * @param {{ extensionsDir: string, filter?: string | string[] }} options
 */
export function scanExtensions({ extensionsDir, filter }) {
  let names = listExtensionNames(extensionsDir)
  if (filter) {
    const wanted = new Set(Array.isArray(filter) ? filter : [filter])
    names = names.filter((name) => wanted.has(name))
  }

  const report = {}
  const domAntipatternSummary = { total: 0, byRule: {}, files: {} }

  for (const ext of names) {
    const extReport = scanExtension(ext, extensionsDir)
    report[ext] = extReport

    for (const hit of extReport.violations) {
      if (!hit.rule.startsWith('DOM:')) continue
      domAntipatternSummary.total++
      domAntipatternSummary.byRule[hit.rule] = (domAntipatternSummary.byRule[hit.rule] ?? 0) + 1
      const fileKey = hit.file.split(':')[0]
      domAntipatternSummary.files[fileKey] = (domAntipatternSummary.files[fileKey] ?? 0) + 1
    }
  }

  return { report, domAntipatternSummary, extensionNames: names }
}

export { listExtensionNames }
