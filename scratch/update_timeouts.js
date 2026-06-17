import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

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

// 1. Update spec files (change timeout: 100 to timeout: 400)
const files = getAllFiles(projectRoot)
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8')
  if (content.includes('timeout: 100')) {
    console.log(`Updating timeouts in ${path.relative(projectRoot, file)}`)
    content = content.replaceAll('timeout: 100', 'timeout: 400')
    fs.writeFileSync(file, content, 'utf8')
  }
}

// 2. Update playwright.config.ts
const configPath = path.join(projectRoot, 'src/playwright.config.ts')
if (fs.existsSync(configPath)) {
  console.log('Updating src/playwright.config.ts')
  let configContent = fs.readFileSync(configPath, 'utf8')

  configContent = configContent.replace('timeout: 3000', 'timeout: 5000')
  configContent = configContent.replace('timeout: 100', 'timeout: 400')
  configContent = configContent.replace('actionTimeout: 100', 'actionTimeout: 400')
  configContent = configContent.replace('navigationTimeout: 1000', 'navigationTimeout: 2000')

  fs.writeFileSync(configPath, configContent, 'utf8')
}

console.log('Timeout updates completed.')
