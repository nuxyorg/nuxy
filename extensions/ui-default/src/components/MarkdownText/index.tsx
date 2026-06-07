import React from 'react'
import './index.css'
import { CodeBlock } from '../Code'
import { Table, TableRow, TableCell } from '../Table'

export interface MarkdownTextProps {
  children: string
  className?: string
}

type Align = 'left' | 'center' | 'right' | undefined

type ListItem = {
  text: string
  children?: { ordered: boolean; items: ListItem[] }
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'hr' }
  | { type: 'ul'; items: ListItem[] }
  | { type: 'ol'; items: ListItem[] }
  | { type: 'table'; headers: string[]; aligns: Align[]; rows: string[][] }
  | { type: 'paragraph'; text: string }
  | { type: 'blockquote'; text: string }

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let remaining = text

  while (remaining.length > 0) {
    // Link: [text](url)
    const linkMatch = remaining.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      if (linkMatch[1]) nodes.push(...parseInline(linkMatch[1]))
      nodes.push(
        <a
          key={nodes.length}
          href={linkMatch[3]}
          className="nuxy-md-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkMatch[2]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Bold + Italic: ***text***
    const boldItalicMatch = remaining.match(/^([\s\S]*?)\*\*\*([\s\S]+?)\*\*\*/)
    if (boldItalicMatch) {
      if (boldItalicMatch[1]) nodes.push(boldItalicMatch[1])
      nodes.push(
        <strong key={nodes.length}>
          <em>{boldItalicMatch[2]}</em>
        </strong>
      )
      remaining = remaining.slice(boldItalicMatch[0].length)
      continue
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^([\s\S]*?)\*\*([\s\S]+?)\*\*/)
    if (boldMatch) {
      if (boldMatch[1]) nodes.push(boldMatch[1])
      nodes.push(<strong key={nodes.length}>{boldMatch[2]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^([\s\S]*?)(?:\*([^*\n]+?)\*|_([^_\n]+?)_)/)
    if (italicMatch) {
      if (italicMatch[1]) nodes.push(italicMatch[1])
      nodes.push(<em key={nodes.length}>{italicMatch[2] ?? italicMatch[3]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`/)
    if (codeMatch) {
      if (codeMatch[1]) nodes.push(codeMatch[1])
      nodes.push(
        <code key={nodes.length} className="nuxy-md-inline-code">
          {codeMatch[2]}
        </code>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    nodes.push(remaining)
    break
  }

  return nodes
}

function parseTableRow(row: string): string[] {
  return row
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim())
}

function parseListBlock(
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

function ListItems({ items }: { items: ListItem[] }): React.ReactElement {
  return (
    <>
      {items.map((item, idx) => (
        // eslint-disable-next-line react-doctor/no-array-index-as-key
        <li key={idx} className="nuxy-md-li">
          {parseInline(item.text)}
          {item.children &&
            (item.children.ordered ? (
              <ol className="nuxy-md-ol">
                <ListItems items={item.children.items} />
              </ol>
            ) : (
              <ul className="nuxy-md-ul">
                <ListItems items={item.children.items} />
              </ul>
            ))}
        </li>
      ))}
    </>
  )
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
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

    // Horizontal rule
    if (line.match(/^[-*_]{3,}$/)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // Heading
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

    // Blockquote
    if (line.startsWith('> ') || line === '>') {
      const quoteLines: string[] = []
      while (i < lines.length && (lines[i].startsWith('> ') || lines[i] === '>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') })
      continue
    }

    // Table: line starting with |, followed by a separator row
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

    // Unordered list
    if (line.match(/^[-*+]\s+/)) {
      const result = parseListBlock(lines, i, 0)
      blocks.push({ type: 'ul', items: result.items })
      i = result.end
      continue
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const result = parseListBlock(lines, i, 0)
      blocks.push({ type: 'ol', items: result.items })
      i = result.end
      continue
    }

    // Blank line
    if (line.trim() === '') {
      i++
      continue
    }

    // Paragraph — merge consecutive non-special lines
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

export function MarkdownText({ children, className }: MarkdownTextProps) {
  const blocks = parseBlocks(children)
  const elements: React.ReactNode[] = []

  for (const block of blocks) {
    if (block.type === 'hr') {
      elements.push(<hr key={elements.length} className="nuxy-md-hr" />)
      continue
    }

    if (block.type === 'code') {
      elements.push(
        <CodeBlock key={elements.length} code={block.code} language={block.lang} showCopy />
      )
      continue
    }

    if (block.type === 'heading') {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      elements.push(
        <Tag key={elements.length} className={`nuxy-md-h${block.level}`}>
          {parseInline(block.text)}
        </Tag>
      )
      continue
    }

    if (block.type === 'blockquote') {
      elements.push(
        <blockquote key={elements.length} className="nuxy-md-blockquote">
          {parseInline(block.text)}
        </blockquote>
      )
      continue
    }

    if (block.type === 'table') {
      elements.push(
        <Table key={elements.length} className="nuxy-md-table">
          <thead>
            <TableRow>
              {block.headers.map((h, idx) => (
                <TableCell key={h || idx} header style={{ textAlign: block.aligns[idx] }}>
                  {parseInline(h)}
                </TableCell>
              ))}
            </TableRow>
          </thead>
          <tbody>
            {block.rows.map((row, ri) => (
              <TableRow key={ri}>
                {row.map((cell, ci) => (
                  <TableCell key={ci} style={{ textAlign: block.aligns[ci] }}>
                    {parseInline(cell)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </tbody>
        </Table>
      )
      continue
    }

    if (block.type === 'ul') {
      elements.push(
        <ul key={elements.length} className="nuxy-md-ul">
          <ListItems items={block.items} />
        </ul>
      )
      continue
    }

    if (block.type === 'ol') {
      elements.push(
        <ol key={elements.length} className="nuxy-md-ol">
          <ListItems items={block.items} />
        </ol>
      )
      continue
    }

    if (block.type === 'paragraph') {
      const lines = block.text.split('\n')
      const inlineNodes: React.ReactNode[] = []
      lines.forEach((line, idx) => {
        inlineNodes.push(...parseInline(line))
        if (idx < lines.length - 1) inlineNodes.push(<br key={`br-${idx}`} />)
      })
      elements.push(
        <p key={elements.length} className="nuxy-md-p">
          {inlineNodes}
        </p>
      )
    }
  }

  return <div className={`nuxy-md ${className || ''}`}>{elements}</div>
}
