import * as NuxySdkRuntime from './index.js'

const SKIP_EXPORTS = new Set(['default'])

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}

/** Runtime value export names exposed via nuxy-ext://sdk. */
export function listNuxySdkRuntimeExportNames(): string[] {
  return Object.keys(NuxySdkRuntime)
    .filter((name) => !SKIP_EXPORTS.has(name) && isValidIdentifier(name))
    .sort()
}
