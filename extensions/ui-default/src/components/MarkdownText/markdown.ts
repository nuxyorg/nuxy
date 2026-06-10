export type Align = 'left' | 'center' | 'right' | undefined

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; href: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'code'; text: string }
  | { type: 'br' }

export type ListItem = {
  text: string
  children?: { ordered: boolean; items: ListItem[] }
}

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'hr' }
  | { type: 'ul'; items: ListItem[] }
  | { type: 'ol'; items: ListItem[] }
  | { type: 'table'; headers: string[]; aligns: Align[]; rows: string[][] }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }

export function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let remaining = text

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      if (linkMatch[1]) nodes.push(...parseInline(linkMatch[1]))
      nodes.push({ type: 'link', text: linkMatch[2], href: linkMatch[3] })
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    const boldItalicMatch = remaining.match(/^([\s\S]*?)\*\*\*([\s\S]+?)\*\*\*/)
    if (boldItalicMatch) {
      if (boldItalicMatch[1]) nodes.push({ type: 'text', text: boldItalicMatch[1] })
      nodes.push({
        type: 'bold',
        children: [{ type: 'italic', children: [{ type: 'text', text: boldItalicMatch[2] }] }],
      })
      remaining = remaining.slice(boldItalicMatch[0].length)
      continue
    }

    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*/)
    if (boldMatch) {
      if (boldMatch[1]) nodes.push({ type: 'text', text: boldMatch[1] })
      nodes.push({ type: 'bold', children: [{ type: 'text', text: boldMatch[2] }] })
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    const italicMatch = remaining.match(/^([\s\S]*?)(?:\*([^*\n]+?)\*|_([^_\n]+?)_)/)
    if (italicMatch) {
      if (italicMatch[1]) nodes.push({ type: 'text', text: italicMatch[1] })
      const inner = italicMatch[2] ?? italicMatch[3]!
      nodes.push({ type: 'italic', children: [{ type: 'text', text: inner }] })
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`/)
    if (codeMatch) {
      if (codeMatch[1]) nodes.push({ type: 'text', text: codeMatch[1] })
      nodes.push({ type: 'code', text: codeMatch[2] })
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    nodes.push({ type: 'text', text: remaining })
    break
  }

  return nodes
}

export function parseTableRow(row: string): string[] {
  return row
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim())
}

export function parseListBlock(
  lines: string[],
  start: number,
  baseIndent: number
): { items: ListItem[]; end: number } {
  const items: ListItem[] = []
  let i = start

  while (i < lines.length) {
    const line = lines[i]
    const m = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)/)
    if (!m) break

    const indent = m[1].length
    if (indent < baseIndent) break
    if (indent > baseIndent) {
      i++
      continue
    }

    const text = m[3]
    i++

    let children: { ordered: boolean; items: ListItem[] } | undefined
    if (i < lines.length) {
      const nextM = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+/)
      if (nextM && nextM[1].length > baseIndent) {
        const childIndent = nextM[1].length
        const childOrdered = /^\d+\./.test(lines[i].slice(childIndent))
        const result = parseListBlock(lines, i, childIndent)
        children = { ordered: childOrdered, items: result.items }
        i = result.end
      }
    }

    items.push(children ? { text, children } : { text })
  }

  return { items, end: i }
}

export function parseBlocks(text: string | null | undefined): Block[] {
  const lines = (text ?? '').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    const fenceMatch = line.match(/^```(\w*)$/)
    if (fenceMatch) {
      const lang = fenceMatch[1] || 'text'
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^```$/)) {
        codeLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') })
      i++
      continue
    }

    if (line.match(/^[-*_]{3,}$/)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: headingMatch[2],
      })
      i++
      continue
    }

    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') })
      continue
    }

    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[\s\-:|]+/)) {
      const headers = parseTableRow(line)
      const sepCells = parseTableRow(lines[i + 1])
      const aligns: Align[] = sepCells.map((c) => {
        const t = c.trim()
        if (t.startsWith(':') && t.endsWith(':')) return 'center'
        if (t.endsWith(':')) return 'right'
        if (t.startsWith(':')) return 'left'
        return undefined
      })
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(parseTableRow(lines[i]))
        i++
      }
      blocks.push({ type: 'table', headers, aligns, rows })
      continue
    }

    if (line.match(/^[-*+]\s+/)) {
      const result = parseListBlock(lines, i, 0)
      blocks.push({ type: 'ul', items: result.items })
      i = result.end
      continue
    }

    if (line.match(/^\d+\.\s+/)) {
      const result = parseListBlock(lines, i, 0)
      blocks.push({ type: 'ol', items: result.items })
      i = result.end
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].match(/^[-*+]\s+/) &&
      !lines[i].match(/^\d+\.\s+/) &&
      !lines[i].match(/^```/) &&
      !lines[i].match(/^[-*_]{3,}$/) &&
      !lines[i].startsWith('> ')
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n') })
    } else {
      i++
    }
  }

  return blocks
}
