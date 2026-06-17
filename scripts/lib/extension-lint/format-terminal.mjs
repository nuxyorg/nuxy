import path from 'path'

const SEVERITY_LABEL = {
  high: 'error',
  medium: 'warning',
  low: 'warning',
}

function parseViolationLocation(fileField) {
  const match = fileField.match(/^(.*):(\d+)$/)
  if (match) {
    return { filePath: match[1], line: Number(match[2]), column: 1 }
  }
  return { filePath: fileField, line: 1, column: 1 }
}

function severityToLevel(severity) {
  return SEVERITY_LABEL[severity] ?? 'warning'
}

/**
 * Flatten scan report into ESLint-style diagnostic entries.
 * @param {Record<string, { violations: Array<{ file: string, rule: string, message: string, severity: string }> }>} report
 * @param {string} extensionsDir
 */
export function flattenViolations(report, extensionsDir) {
  const entries = []

  for (const [extName, data] of Object.entries(report)) {
    for (const violation of data.violations) {
      const { filePath, line, column } = parseViolationLocation(violation.file)
      entries.push({
        extName,
        absPath: path.join(extensionsDir, extName, filePath),
        line,
        column,
        level: severityToLevel(violation.severity),
        message: violation.message,
        ruleId: violation.rule,
      })
    }
  }

  entries.sort((a, b) => {
    if (a.absPath !== b.absPath) return a.absPath.localeCompare(b.absPath)
    if (a.line !== b.line) return a.line - b.line
    return a.column - b.column
  })

  return entries
}

function colorize(text, code, enabled) {
  if (!enabled) return text
  return `\u001b[${code}m${text}\u001b[0m`
}

/**
 * Print violations in ESLint "stylish" format.
 * @returns {{ errors: number, warnings: number, total: number }}
 */
export function printTerminalReport(report, extensionsDir, { color = process.stdout.isTTY } = {}) {
  const entries = flattenViolations(report, extensionsDir)
  let errors = 0
  let warnings = 0
  let currentPath = ''

  for (const entry of entries) {
    if (entry.absPath !== currentPath) {
      if (currentPath) process.stdout.write('\n')
      currentPath = entry.absPath
      process.stdout.write(`\n${currentPath}\n`)
    }

    if (entry.level === 'error') errors++
    else warnings++

    const levelText = colorize(entry.level, entry.level === 'error' ? 31 : 33, color)
    const location = `${String(entry.line).padStart(3)}:${String(entry.column).padEnd(3)}`
    process.stdout.write(`  ${location}  ${levelText}  ${entry.message}  ${entry.ruleId}\n`)
  }

  const total = errors + warnings
  if (total === 0) return { errors, warnings, total }

  process.stdout.write('\n')
  const summaryParts = []
  if (errors) summaryParts.push(`${errors} error${errors === 1 ? '' : 's'}`)
  if (warnings) summaryParts.push(`${warnings} warning${warnings === 1 ? '' : 's'}`)
  const summary = colorize(
    `✖ ${total} problem${total === 1 ? '' : 's'} (${summaryParts.join(', ')})`,
    31,
    color
  )
  process.stdout.write(`${summary}\n\n`)

  return { errors, warnings, total }
}
