import path from 'path'
import os from 'os'

/** Root Nuxy user directory (~/.nuxy). */
const NUXY_HOME = path.join(os.homedir(), '.nuxy')

export const CONFIG_DIR = NUXY_HOME
export const SECURITY_DIR = path.join(NUXY_HOME, 'security')
export const EXTENSION_DIR = path.join(NUXY_HOME, 'extensions')
export const EXTRACTED_DIR = path.join(NUXY_HOME, 'extracted')
/** Override with NUXY_DATA_DIR env var to isolate settings in tests without affecting extensions. */
export const DATA_DIR = process.env.NUXY_DATA_DIR ?? path.join(NUXY_HOME, 'data')

/** Legacy storage path — migrated on first access. */
export const LEGACY_DATA_DIR = path.join(os.homedir(), '.config', 'nuxy', 'data')
