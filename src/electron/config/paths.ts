import path from 'path'
import os from 'os'

/** Root Nuxy user directory (~/.nuxy). */
export const NUXY_HOME = path.join(os.homedir(), '.nuxy')

export const CONFIG_DIR = NUXY_HOME
export const CONFIG_PATH = path.join(NUXY_HOME, 'nuxyconfig')
export const EXTENSION_DIR = path.join(NUXY_HOME, 'extensions')
export const THEMES_DIR = path.join(NUXY_HOME, 'themes')
export const DATA_DIR = path.join(NUXY_HOME, 'data')

/** Legacy storage path — migrated on first access. */
export const LEGACY_DATA_DIR = path.join(
  os.homedir(),
  '.config',
  'nuxy',
  'data'
)
