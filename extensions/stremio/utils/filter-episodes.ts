import type { EpisodeResult } from '../types.ts'

/** Client-side episode filter for the episodes drill-in view. */
export function filterEpisodes(episodes: EpisodeResult[], query: string): EpisodeResult[] {
  const q = query.trim().toLowerCase()
  if (!q) return episodes

  const compact = q.replace(/\s/g, '')

  return episodes.filter((ep) => {
    if (ep.title.toLowerCase().includes(q)) return true
    if (ep.overview.toLowerCase().includes(q)) return true

    const pad = `s${ep.season}e${String(ep.episode).padStart(2, '0')}`
    const padPadded = `s${String(ep.season).padStart(2, '0')}e${String(ep.episode).padStart(2, '0')}`
    const padShort = `s${ep.season}e${ep.episode}`
    const alt = `${ep.season}x${String(ep.episode).padStart(2, '0')}`

    if (
      pad.includes(compact) ||
      padPadded.includes(compact) ||
      padShort.includes(compact) ||
      alt.includes(compact)
    ) {
      return true
    }
    if (`season ${ep.season}`.includes(q) || `episode ${ep.episode}`.includes(q)) return true
    if (String(ep.season) === q || String(ep.episode) === q) return true

    return false
  })
}
