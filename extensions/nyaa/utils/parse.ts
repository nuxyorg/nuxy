import type { NyaaResult } from '../types.ts'

export function parseNyaaHtml(html: string): NyaaResult[] {
  const results: NyaaResult[] = []

  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/)
  if (!tbodyMatch) return results

  const rowRegex = /<tr class="(default|success|danger)">([\s\S]*?)<\/tr>/g
  let rowMatch: RegExpExecArray | null

  while ((rowMatch = rowRegex.exec(tbodyMatch[1])) !== null) {
    const status = rowMatch[1] as 'default' | 'success' | 'danger'
    const row = rowMatch[2]

    const catMatch = row.match(/title="([^"]+)"/)
    const category = catMatch ? catMatch[1] : 'Unknown'

    // First /view/ link that has direct text content (the title link)
    const viewMatch = row.match(/href="\/view\/(\d+)"[^>]*>([^<]+)<\/a>/)
    if (!viewMatch) continue
    const id = viewMatch[1]
    const title = decodeHtmlEntities(viewMatch[2].trim())

    const magnetMatch = row.match(/href="(magnet:[^"]+)"/)
    if (!magnetMatch) continue
    const magnet = magnetMatch[1]

    const sizeMatch = row.match(/<td class="text-center">([\d.]+ (?:B|KiB|MiB|GiB|TiB))<\/td>/)
    const size = sizeMatch ? sizeMatch[1] : '?'

    const dateMatch = row.match(/data-timestamp="(\d+)"/)
    const date = dateMatch ? new Date(parseInt(dateMatch[1], 10) * 1000).toISOString() : ''

    const numberCells = [...row.matchAll(/<td class="text-center">\s*(\d+)\s*<\/td>/g)]
    const seeds = numberCells[0] ? parseInt(numberCells[0][1], 10) : 0
    const leeches = numberCells[1] ? parseInt(numberCells[1][1], 10) : 0

    results.push({ id, title, magnet, size, date, seeds, leeches, category, status })
  }

  return results
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}
