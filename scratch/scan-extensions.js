import path from 'path'
import { fileURLToPath } from 'node:url'
import { scanExtensions } from '../scripts/lib/extension-lint/scan.mjs'
import { printTerminalReport } from '../scripts/lib/extension-lint/format-terminal.mjs'
import { writeReports } from '../scripts/lib/extension-lint/write-report.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '..')
const EXTENSIONS_DIR = path.join(PROJECT_ROOT, 'extensions')

const { report, domAntipatternSummary } = scanExtensions({ extensionsDir: EXTENSIONS_DIR })
writeReports(report, domAntipatternSummary, __dirname)

const { total } = printTerminalReport(report, EXTENSIONS_DIR)
console.log('Report saved to scratch/scan-report.json and scratch/scan-report.md')
process.exit(total > 0 ? 1 : 0)
