import * as NuxyCoreRuntime from './renderer.js'

const SKIP_EXPORTS = new Set(['default', 'unsafeHTML', 'unsafeSVG'])

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}

/** Runtime value export names exposed via nuxy-ext://core (excludes unsafe lit directives). */
export function listNuxyCoreRuntimeExportNames(): string[] {
  return Object.keys(NuxyCoreRuntime)
    .filter((name) => !SKIP_EXPORTS.has(name) && isValidIdentifier(name))
    .sort()
}
