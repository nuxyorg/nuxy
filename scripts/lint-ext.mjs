#!/usr/bin/env node
import path from 'path'
import { fileURLToPath } from 'node:url'
import { listExtensionNames, scanExtensions } from './lib/extension-lint/scan.mjs'
import { printTerminalReport } from './lib/extension-lint/format-terminal.mjs'
import { writeReports } from './lib/extension-lint/write-report.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const EXTENSIONS_DIR = path.join(ROOT, 'extensions')
const SCRATCH_DIR = path.join(ROOT, 'scratch')

function printUsage() {
  console.log(`
  Nuxy extension linter

  Usage:
    pnpm lint-ext [--all] [extension-name]
    pnpm lint-ext --json [--all] [extension-name]
    pnpm lint-ext --write-report [--all] [extension-name]

  Options:
    --all           Lint all bundled extensions (default when no name is given)
    --json          Print machine-readable JSON to stdout
    --write-report  Also write scratch/scan-report.{json,md}
    --help          Show this help

  Examples:
    pnpm lint-ext
    pnpm lint-ext shell
    pnpm lint-ext --all --write-report
`)
}

function parseArgs(argv) {
  const positional = []
  let all = false
  let json = false
  let writeReport = false

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') return { help: true }
    if (arg === '--all') {
      all = true
      continue
    }
    if (arg === '--json') {
      json = true
      continue
    }
    if (arg === '--write-report') {
      writeReport = true
      continue
    }
    if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`)
      process.exit(2)
    }
    positional.push(arg)
  }

  if (positional.length > 1) {
    console.error('Expected at most one extension name.')
    process.exit(2)
  }

  const extensionName = positional[0]
  if (extensionName && all) {
    console.error('Use either --all or a single extension name, not both.')
    process.exit(2)
  }

  return { all: all || !extensionName, extensionName, json, writeReport }
}

const args = parseArgs(process.argv.slice(2))
if (args.help) {
  printUsage()
  process.exit(0)
}

const available = listExtensionNames(EXTENSIONS_DIR)
if (args.extensionName && !available.includes(args.extensionName)) {
  console.error(`\nUnknown extension: "${args.extensionName}"\n`)
  console.error('Available extensions:')
  for (const ext of available) console.error(`  ${ext}`)
  console.error()
  process.exit(2)
}

const filter = args.all ? undefined : args.extensionName
const { report, domAntipatternSummary } = scanExtensions({ extensionsDir: EXTENSIONS_DIR, filter })

if (args.writeReport) {
  writeReports(report, domAntipatternSummary, SCRATCH_DIR)
}

if (args.json) {
  const payload = {
    extensions: Object.keys(report),
    violations: Object.fromEntries(
      Object.entries(report).map(([name, data]) => [
        name,
        data.violations.map((v) => ({
          file: v.file,
          line: v.file.match(/:(\d+)$/)?.[1] ?? null,
          rule: v.rule,
          message: v.message,
          severity: v.severity,
        })),
      ])
    ),
    summary: domAntipatternSummary,
  }
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
} else {
  const { total } = printTerminalReport(report, EXTENSIONS_DIR)
  if (args.writeReport) {
    console.log('Report also saved to scratch/scan-report.json and scratch/scan-report.md')
  }
  process.exit(total > 0 ? 1 : 0)
}
