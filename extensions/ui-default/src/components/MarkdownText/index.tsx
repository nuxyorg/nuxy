import React from 'react'
import './index.css'
import { CodeBlock } from '../Code'
import { Table, TableRow, TableCell } from '../Table'

export interface MarkdownTextProps {
  children: string
  className?: string
}

type Align = 'left' | 'center' | 'right' | undefined

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'code'; lang: string; code: string }
  | { type: 'hr' }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'table'; headers: string[]; aligns: Align[]; rows: string[][] }
  | { type: 'paragraph'; text: string }

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    // Link: [text](url)
    const linkMatch = remaining.match(/^([\s\S]*?)\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      if (linkMatch[1]) nodes.push(...parseInline(linkMatch[1]))
      nodes.push(
        <a
          key={key++}
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
        <strong key={key++}>
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
      nodes.push(<strong key={key++}>{boldMatch[2]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Italic: *text* or _text_
    const italicMatch = remaining.match(/^([\s\S]*?)(?:\*([^*\n]+?)\*|_([^_\n]+?)_)/)
    if (italicMatch) {
      if (italicMatch[1]) nodes.push(italicMatch[1])
      nodes.push(<em key={key++}>{italicMatch[2] ?? italicMatch[3]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Inline code: `code`
    const codeMatch = remaining.match(/^([\s\S]*?)`([^`]+)`/)
    if (codeMatch) {
      if (codeMatch[1]) nodes.push(codeMatch[1])
      nodes.push(
        <code key={key++} className="nuxy-md-inline-code">
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
  return row.split('|').slice(1, -1).map((c) => c.trim())
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
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''))
        i++
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({ type: 'ol', items })
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
      !lines[i].match(/^[-*_]{3,}$/)
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n') })
    } else {
      // Safety: if nothing was consumed (should not happen), advance to prevent infinite loop
      i++
    }
  }

  return blocks
}

export function MarkdownText({ children, className }: MarkdownTextProps) {
  const blocks = parseBlocks(children)
  const elements: React.ReactNode[] = []
  let key = 0

  for (const block of blocks) {
    if (block.type === 'hr') {
      elements.push(<hr key={key++} className="nuxy-md-hr" />)
      continue
    }

    if (block.type === 'code') {
      elements.push(
        <CodeBlock key={key++} code={block.code} language={block.lang} showCopy />,
      )
      continue
    }

    if (block.type === 'heading') {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      elements.push(
        <Tag key={key++} className={`nuxy-md-h${block.level}`}>
          {parseInline(block.text)}
        </Tag>,
      )
      continue
    }

    if (block.type === 'table') {
      elements.push(
        <Table key={key++} className="nuxy-md-table">
          <thead>
            <TableRow>
              {block.headers.map((h, idx) => (
                <TableCell key={idx} header style={{ textAlign: block.aligns[idx] }}>
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
        </Table>,
      )
      continue
    }

    if (block.type === 'ul') {
      elements.push(
        <ul key={key++} className="nuxy-md-ul">
          {block.items.map((item, idx) => (
            <li key={idx} className="nuxy-md-li">
              {parseInline(item)}
            </li>
          ))}
        </ul>,
      )
      continue
    }

    if (block.type === 'ol') {
      elements.push(
        <ol key={key++} className="nuxy-md-ol">
          {block.items.map((item, idx) => (
            <li key={idx} className="nuxy-md-li">
              {parseInline(item)}
            </li>
          ))}
        </ol>,
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
        <p key={key++} className="nuxy-md-p">
          {inlineNodes}
        </p>,
      )
    }
  }

  return <div className={`nuxy-md ${className || ''}`}>{elements}</div>
}
