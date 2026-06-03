import type { CoreContext } from '@nuxy/extension-sdk'
import type { SearchPayload, CopyMagnetPayload, NyaaResult } from './types.ts'
import { parseNyaaHtml } from './utils/parse.ts'

const BASE_URL = 'https://nyaa.si'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'nyaa' })

  core.ipc.handle('search', async (payload: unknown): Promise<NyaaResult[]> => {
    const { query } = payload as SearchPayload
    if (!query || !query.trim()) return []

    const category = (await core.settings.read<string>('category')) ?? '1_2'
    const filter = (await core.settings.read<string>('filter')) ?? '0'
    const sortBy = (await core.settings.read<string>('sortBy')) ?? 'seeders'

    const sortParam =
      sortBy === 'date'
        ? 's=id&o=desc'
        : sortBy === 'size'
          ? 's=size&o=desc'
          : sortBy === 'completed'
            ? 's=downloads&o=desc'
            : 's=seeders&o=desc'

    const url = `${BASE_URL}/?f=${filter}&c=${category}&q=${encodeURIComponent(query.trim())}&${sortParam}`

    core.logger.info(`Fetching nyaa.si: ${url}`)

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NuxyApp/1.0)' },
    })

    if (!response.ok) {
      core.logger.error(`Nyaa fetch failed: HTTP ${response.status}`)
      throw new Error(`Search failed: HTTP ${response.status}`)
    }

    const html = await response.text()
    const results = parseNyaaHtml(html)
    core.logger.info(`Nyaa search "${query}" returned ${results.length} results`)
    return results
  })

  core.ipc.handle('copyMagnet', async (payload: unknown): Promise<void> => {
    const { magnet } = payload as CopyMagnetPayload
    await core.clipboard.writeText(magnet)
    core.logger.info('Copied magnet link to clipboard')
  })
}
