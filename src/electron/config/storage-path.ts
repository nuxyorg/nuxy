import path from 'path'

/** Resolve a file path inside a chroot data directory; throws on traversal. */
export function resolveStoragePath(dataDir: string, file: string): string {
  const resolvedBase = path.resolve(dataDir)
  const resolvedTarget = path.resolve(resolvedBase, file)
  const relative = path.relative(resolvedBase, resolvedTarget)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Access denied: Path traversal detected.')
  }
  return resolvedTarget
}
