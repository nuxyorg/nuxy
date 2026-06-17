import fs from 'fs'
import path from 'path'

export function writeMarkdownReport(report, domAntipatternSummary, outPath) {
  let md = `# Extension Scan Report\n\nGenerated on: ${new Date().toISOString()}\n\n`

  md += `## DOM Anti-pattern Baseline\n\n`
  md += `- **Total hits**: ${domAntipatternSummary.total}\n`
  md += `- **By rule**:\n`
  for (const [rule, count] of Object.entries(domAntipatternSummary.byRule).sort(
    (a, b) => b[1] - a[1]
  )) {
    md += `  - \`${rule}\`: ${count}\n`
  }
  md += `- **Top files**:\n`
  for (const [file, count] of Object.entries(domAntipatternSummary.files)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)) {
    md += `  - \`${file}\`: ${count}\n`
  }
  md += `\n---\n\n`

  for (const [ext, data] of Object.entries(report)) {
    const violations = data.violations
    if (violations.length === 0) continue

    md += `## Extension: \`${ext}\` (Type: ${data.manifest?.type || 'unknown'})\n`
    md += `- **Backend**: ${data.hasBackend ? 'Yes' : 'No'}\n`
    md += `- **Frontend**: ${data.hasFrontend ? 'Yes' : 'No'}\n`
    md += `- **Backend Test**: ${data.hasBackendTest ? 'Yes' : 'No'}\n\n`

    md += `| File | Rule | Message | Severity |\n`
    md += `| --- | --- | --- | --- |\n`
    for (const v of violations) {
      md += `| \`${v.file}\` | **${v.rule}** | ${v.message.replace(/\|/g, '\\|')} | \`${v.severity}\` |\n`
    }
    md += `\n---\n\n`
  }

  fs.writeFileSync(outPath, md)
}

export function writeJsonReport(report, outPath) {
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
}

export function writeReports(report, domAntipatternSummary, scratchDir) {
  writeJsonReport(report, path.join(scratchDir, 'scan-report.json'))
  writeMarkdownReport(report, domAntipatternSummary, path.join(scratchDir, 'scan-report.md'))
}
