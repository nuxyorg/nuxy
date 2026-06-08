import { createRequire } from 'node:module'

/** Load Electron main-process modules from ESM e2e specs (compiled output is CJS). */
export const electronRequire = createRequire(import.meta.url)
