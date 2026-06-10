import type MarkdownIt from 'markdown-it'

/** Map legacy docs/ and extensions/ paths to VitePress routes. */
const FILE_TO_ROUTE: Record<string, string> = {
  '00-overview.md': '/design/overview',
  '01-system-analysis.md': '/design/system-analysis',
  '02-architecture.md': '/design/system-architecture',
  '03-data-flow.md': '/design/data-flow',
  '04-modules.md': '/design/modules',
  '05-api-design.md': '/design/api-design',
  '06-state-management.md': '/design/state-management',
  '07-database-design.md': '/design/database-design',
  '08-authentication.md': '/design/authentication',
  '09-error-handling.md': '/design/error-handling',
  '10-security.md': '/design/security',
  '11-performance.md': '/design/performance',
  '12-testing-strategy.md': '/design/testing-strategy',
  '13-deployment.md': '/design/deployment',
  '14-rebuild-roadmap.md': '/design/rebuild-roadmap',
  '15-modular-plugin-system.md': '/design/modular-plugin-system',
  '16-omni-input-system.md': '/design/omni-input-system',
  '17-frontend-extensions.md': '/design/frontend-extensions',
  '18-advanced-capabilities.md': '/design/advanced-capabilities',
  '19-mvp-roadmap.md': '/roadmap',
  '20-logging.md': '/design/logging',
  '21-extension-access.md': '/extensions/extension-access',
  '22-store-extension.md': '/design/store-extension',
  'architecture.md': '/design/architecture-map',
  'DOCUMENTATION.md': '/design/documentation-status',
  'README.md': '/',
  'react-to-lit-migration.md': '/design/react-to-lit-migration',
  'structure.md': '/design/structure',
  'electron-fix-plan.md': '/design/electron-fix-plan',
  'pain-points-plan.md': '/design/pain-points-plan',
  'known-bugs.md': '/design/known-bugs',
  'open-issues.md': '/design/open-issues',
  'comprehensive-overview.md': '/design/comprehensive-overview',
  'architecture/lit-renderer-composition.md': '/design/lit-renderer',
  'architecture/extension-system-v2.md': '/design/extension-system-v2',
  'architecture/refactor-plan.md': '/design/refactor-plan',
  'extension-system-v2.md': '/design/extension-system-v2',
  'lit-renderer-composition.md': '/design/lit-renderer',
  'implementation/01-setup.md': '/design/implementation/setup',
  'implementation/02-core-infrastructure.md': '/design/implementation/core-infrastructure',
  'implementation/03-feature-implementation.md': '/design/implementation/feature-implementation',
  'implementation/04-integration.md': '/design/implementation/integration',
  'implementation/05-final-polish.md': '/design/implementation/final-polish',
  'EXTENSION_GUIDE.md': '/extensions/development-guide',
  'MANIFEST_GUIDE.md': '/extensions/manifest',
  'LIT_MIGRATION_GUIDE.md': '/extensions/lit-migration',
  'FRONTEND_STRUCTURE_GUIDE.md': '/extensions/frontend-structure',
}

function basename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] ?? path
}

function resolveRoute(href: string): string {
  if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:'))
    return href
  if (href.startsWith('/')) return href

  const hashIdx = href.indexOf('#')
  const clean = hashIdx >= 0 ? href.slice(0, hashIdx) : href
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : ''

  const docsMatch = clean.match(/(?:\.\.\/)?docs\/(.+)$/)
  if (docsMatch && FILE_TO_ROUTE[docsMatch[1]]) return FILE_TO_ROUTE[docsMatch[1]] + hash

  const extMatch = clean.match(/(?:\.\.\/)?extensions\/([^/]+\.md)$/)
  if (extMatch && FILE_TO_ROUTE[extMatch[1]]) return FILE_TO_ROUTE[extMatch[1]] + hash

  const archMatch = clean.match(/(?:\.\/)?architecture\/(.+\.md)$/)
  if (archMatch && FILE_TO_ROUTE[`architecture/${archMatch[1]}`]) {
    return FILE_TO_ROUTE[`architecture/${archMatch[1]}`] + hash
  }

  const implMatch = clean.match(/(?:\.\/)?(?:implementation\/)?(\d{2}-.+\.md)$/)
  if (implMatch && FILE_TO_ROUTE[`implementation/${implMatch[1]}`]) {
    return FILE_TO_ROUTE[`implementation/${implMatch[1]}`] + hash
  }
  const implShort = clean.match(/(?:\.\/)?(\d{2}-[\w-]+)$/)
  if (implShort) {
    const key = `implementation/${implShort[1]}.md`
    if (FILE_TO_ROUTE[key]) return FILE_TO_ROUTE[key] + hash
  }

  const base = basename(clean)
  if (FILE_TO_ROUTE[base]) return FILE_TO_ROUTE[base] + hash
  if (FILE_TO_ROUTE[clean.replace(/^\.\//, '')])
    return FILE_TO_ROUTE[clean.replace(/^\.\//, '')] + hash

  if (clean.includes('agents.md')) return '/extensions/development-guide' + hash

  return href
}

/** Rewrite legacy markdown links after include plugin runs. */
export function rewriteLinksPlugin(md: MarkdownIt): void {
  const defaultRender =
    md.renderer.rules.link_open ??
    function linkOpen(tokens, idx, options, _env, self) {
      return self.renderToken(tokens, idx, options)
    }

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const hrefIdx = tokens[idx].attrIndex('href')
    if (hrefIdx >= 0) {
      const href = tokens[idx].attrs![hrefIdx][1]
      const next = resolveRoute(href)
      if (next !== href) tokens[idx].attrs![hrefIdx][1] = next
    }
    return defaultRender(tokens, idx, options, env, self)
  }
}
