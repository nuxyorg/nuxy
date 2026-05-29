import fs from 'node:fs'
import path from 'node:path'

const projectRoot = '/home/xava/Documents/nuxy'

function getAllFiles(dir, files = []) {
  const list = fs.readdirSync(dir)
  for (const file of list) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        getAllFiles(fullPath, files)
      }
    } else if (file.endsWith('.spec.ts')) {
      files.push(fullPath)
    }
  }
  return files
}

const robustResetShellCode = `async function resetShell(page: any) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
  })
  await page.waitForFunction(
    () => {
      const toolName = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      const palette = document.querySelector('.nuxy-command-palette')
      const input = document.querySelector('input') as HTMLInputElement | null
      return toolName === null && palette === null && (input?.value ?? '') === ''
    },
    { timeout: 100 }
  )
  await page.locator('input').focus()
}`

const filesToProcess = getAllFiles(projectRoot)

console.log(`Found ${filesToProcess.length} spec files. Checking for resetShell function...`)
for (const file of filesToProcess) {
  let content = fs.readFileSync(file, 'utf8')

  const resetShellRegex = /async function resetShell\([^{]*\{[\s\S]*?\n\}/

  if (resetShellRegex.test(content)) {
    console.log(`- Updating resetShell in ${path.relative(projectRoot, file)}`)
    content = content.replace(resetShellRegex, robustResetShellCode)
    fs.writeFileSync(file, content, 'utf8')
  }
}
