import type { CoreContext } from '@nuxyorg/extension-sdk'
import type {
  SearchMetaPayload,
  GetSeriesEpisodesPayload,
  GetStreamsPayload,
  CopyTextPayload,
  OpenExternalPayload,
  ToggleFavoritePayload,
  ToggleFavoriteResult,
  MetaResult,
  EpisodeResult,
  StreamResult,
} from './types.ts'
import {
  buildSearchUrl,
  buildSeriesMetaUrl,
  buildStreamUrl,
  mergeByRank,
  normalizeAddonBase,
  parseMetaSearch,
  parseSeriesEpisodes,
  parseStreams,
} from './utils/stremio-api.ts'
import { normalizeEnterActionPriority } from './utils/enter-action-priority.ts'
import type { EnterAction } from './utils/enter-action-options.ts'
import { parseFavorites, toggleFavorite } from './utils/favorites.ts'

const FAVORITES_FILE = 'favorites.json'

const DEFAULT_CINEMETA = 'https://v3-cinemeta.strem.io'
/** Public Torrentio manifest — returns torrent/magnet results with no account. Replace with a debrid-configured Comet URL for debrid streams. */
const DEFAULT_ADDON = 'https://torrentio.strem.io/manifest.json'
const USER_AGENT = 'Mozilla/5.0 (compatible; NuxyApp/1.0)'

export interface ActionSettings {
  enterActionPriority: EnterAction[]
}

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'stremio' })

  let searchController: AbortController | null = null

  const readAddonBase = async (): Promise<string> =>
    normalizeAddonBase((await core.settings.read<string>('addonUrl')) ?? DEFAULT_ADDON)
  const readCinemeta = async (): Promise<string> =>
    (await core.settings.read<string>('cinemetaUrl')) ?? DEFAULT_CINEMETA

  async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
    const response = await fetch(url, { signal, headers: { 'User-Agent': USER_AGENT } })
    if (!response.ok) return null
    return response.json()
  }

  core.ipc.handle('searchMeta', async (payload: unknown): Promise<MetaResult[]> => {
    const { query } = payload as SearchMetaPayload
    if (!query || !query.trim()) return []

    searchController?.abort()
    searchController = new AbortController()
    const { signal } = searchController
    const cinemeta = await readCinemeta()

    const [movieJson, seriesJson] = await Promise.all([
      fetchJson(buildSearchUrl(cinemeta, 'movie', query), signal).catch(() => null),
      fetchJson(buildSearchUrl(cinemeta, 'series', query), signal).catch(() => null),
    ])

    const results = mergeByRank(
      parseMetaSearch(movieJson, 'movie'),
      parseMetaSearch(seriesJson, 'series')
    )
    core.logger.info(`Stremio meta search "${query}" returned ${results.length} results`)
    return results
  })

  core.ipc.handle('getSeriesEpisodes', async (payload: unknown): Promise<EpisodeResult[]> => {
    const { id } = payload as GetSeriesEpisodesPayload
    if (!id) return []
    const cinemeta = await readCinemeta()
    const json = await fetchJson(buildSeriesMetaUrl(cinemeta, id))
    return parseSeriesEpisodes(json)
  })

  core.ipc.handle('getStreams', async (payload: unknown): Promise<StreamResult[]> => {
    const { type, id } = payload as GetStreamsPayload
    if (!id) return []
    const base = await readAddonBase()
    const json = await fetchJson(buildStreamUrl(base, type, id))
    const results = parseStreams(json)
    core.logger.info(`Stremio streams ${type}/${id} returned ${results.length} results`)
    return results
  })

  core.ipc.handle('copyText', async (payload: unknown): Promise<void> => {
    const { text } = payload as CopyTextPayload
    await core.clipboard.writeText(text)
    core.logger.info('Copied stream link to clipboard')
  })

  core.ipc.handle('openExternal', async (payload: unknown): Promise<void> => {
    const { url } = payload as OpenExternalPayload
    await core.shell.open(url)
    core.logger.info('Opened stream link externally')
  })

  core.ipc.handle('getActionSettings', async (): Promise<ActionSettings> => {
    const saved = await core.settings.read<unknown>('enterActionPriority')
    return { enterActionPriority: normalizeEnterActionPriority(saved) }
  })

  core.ipc.handle('getFavorites', async (): Promise<MetaResult[]> => {
    return parseFavorites(await core.storage.read(FAVORITES_FILE))
  })

  core.ipc.handle('toggleFavorite', async (payload: unknown): Promise<ToggleFavoriteResult> => {
    const { meta } = payload as ToggleFavoritePayload
    const current = parseFavorites(await core.storage.read(FAVORITES_FILE))
    const { favorites, isFavorite } = toggleFavorite(current, meta)
    await core.storage.write(FAVORITES_FILE, favorites)
    core.logger.info(`${isFavorite ? 'Added' : 'Removed'} favorite ${meta.id}`)
    return { favorites, isFavorite }
  })
}
