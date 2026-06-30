const SKIP_EXPORTS = new Set(['default'])

function isValidIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)
}

export function buildRuntimeVirtualModule(
  globalBinding: 'NuxyCore' | 'NuxySdk',
  exportNames: readonly string[]
): string {
  const names = exportNames
    .filter((name) => !SKIP_EXPORTS.has(name) && isValidIdentifier(name))
    .sort()

  if (names.length === 0) {
    return `const ${globalBinding} = window.${globalBinding} || {};\nexport {};\n`
  }

  const exportList = names.join(',\n          ')
  return `
        const ${globalBinding} = window.${globalBinding} || {};
        export const {
          ${exportList}
        } = ${globalBinding};
      `
}
