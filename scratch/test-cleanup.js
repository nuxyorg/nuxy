import fs from 'fs'
import path from 'path'
import os from 'os'

const NUXY_HOME = path.join(os.homedir(), '.nuxy')
const EXTRACTED_DIR = path.join(NUXY_HOME, 'extracted')

function restoreWritable(p) {
  try {
    fs.chmodSync(p, 0o755)
    if (fs.statSync(p).isDirectory()) {
      for (const item of fs.readdirSync(p)) {
        restoreWritable(path.join(p, item))
      }
    }
  } catch (err) {
    console.error(`chmod failed for ${p}:`, err.message)
  }
}

const activeFolders = new Set([
  'com.nuxy.calculator',
  'com.nuxy.gradient',
  'com.nuxy.icons-default',
  'com.nuxy.notes',
  'com.nuxy.nyaa',
  'com.nuxy.settings',
  'com.nuxy.shell',
  'com.nuxy.theme-sakura',
  'com.nuxy.ui-default',
])

try {
  const extractedDirs = fs.readdirSync(EXTRACTED_DIR)
  console.log('Found extracted dirs:', extractedDirs)
  for (const extDir of extractedDirs) {
    if (activeFolders.has(extDir)) {
      console.log(`Skipping active extension: ${extDir}`)
      continue
    }
    const fullPath = path.join(EXTRACTED_DIR, extDir)
    console.log(`Attempting to clean stale folder: ${extDir}`)
    try {
      if (fs.statSync(fullPath).isDirectory()) {
        restoreWritable(fullPath)
        fs.rmSync(fullPath, { recursive: true, force: true })
        console.log(`Cleaned stale extracted folder: ${extDir}`)
      }
    } catch (err) {
      console.error(`Failed to clean stale folder: ${extDir}`, err)
    }
  }
} catch (err) {
  console.error('Error reading EXTRACTED_DIR:', err)
}
