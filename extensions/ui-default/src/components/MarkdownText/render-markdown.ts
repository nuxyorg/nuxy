import '../Code/index.css'
import '../Table/index.css'
import '../CopyButton/nuxy-copy-button.ts'
import { highlight } from '../../utils/highlight'
import {
  parseBlocks,
  parseInline,
  type Align,
  type Block,
  type InlineNode,
  type ListItem,
} from './markdown'

function appendInlineNodes(parent: HTMLElement | DocumentFragment, nodes: InlineNode[]): void {
  for (const node of nodes) {
    if (node.type === 'text') {
      parent.appendChild(document.createTextNode(node.text))
      continue
    }
    if (node.type === 'br') {
      parent.appendChild(document.createElement('br'))
      continue
    }
    if (node.type === 'link') {
      const a = document.createElement('a')
      a.href = node.href
      a.className = 'nuxy-md-link'
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.textContent = node.text
      parent.appendChild(a)
      continue
    }
    if (node.type === 'code') {
      const code = document.createElement('code')
      code.className = 'nuxy-md-inline-code'
      code.textContent = node.text
      parent.appendChild(code)
      continue
    }
    if (node.type === 'bold') {
      const strong = document.createElement('strong')
      appendInlineNodes(strong, node.children)
      parent.appendChild(strong)
      continue
    }
    if (node.type === 'italic') {
      const em = document.createElement('em')
      appendInlineNodes(em, node.children)
      parent.appendChild(em)
      continue
    }
  }
}

function renderListItems(items: ListItem[]): DocumentFragment {
  const frag = document.createDocumentFragment()
  for (const item of items) {
    const li = document.createElement('li')
    li.className = 'nuxy-md-li'
    appendInlineNodes(li, parseInline(item.text))
    if (item.children) {
      const nested = item.children.ordered
        ? document.createElement('ol')
        : document.createElement('ul')
      nested.className = item.children.ordered ? 'nuxy-md-ol' : 'nuxy-md-ul'
      nested.appendChild(renderListItems(item.children.items))
      li.appendChild(nested)
    }
    frag.appendChild(li)
  }
  return frag
}

function renderCodeBlock(code: string, lang: string): HTMLElement {
  const block = document.createElement('div')
  block.className = 'nuxy-code-block'

  const header = document.createElement('div')
  header.className = 'nuxy-code-block__header'

  const langSpan = document.createElement('span')
  langSpan.className = 'nuxy-code-block__lang'
  langSpan.textContent = lang
  header.appendChild(langSpan)

  const copyBtn = document.createElement('nuxy-copy-button')
  copyBtn.setAttribute('value', code)
  copyBtn.setAttribute('label', 'Copy code')
  copyBtn.setAttribute('class', 'nuxy-code-block__copy')
  header.appendChild(copyBtn)

  block.appendChild(header)

  const pre = document.createElement('pre')
  pre.className = 'nuxy-code-block__pre'
  const codeEl = document.createElement('code')

  const langKey = lang.toLowerCase()
  const shouldHighlight = langKey !== 'text' && langKey !== 'plain' && langKey !== ''
  if (shouldHighlight) {
    for (const tok of highlight(code, langKey)) {
      if (tok.type === 'plain') {
        codeEl.appendChild(document.createTextNode(tok.text))
      } else {
        const span = document.createElement('span')
        span.className = `nuxy-hl-${tok.type}`
        span.textContent = tok.text
        codeEl.appendChild(span)
      }
    }
  } else {
    codeEl.textContent = code
  }

  pre.appendChild(codeEl)
  block.appendChild(pre)
  return block
}

function cellAlignStyle(align: Align): string | undefined {
  return align ?? undefined
}

function renderTable(headers: string[], aligns: Align[], rows: string[][]): HTMLElement {
  const container = document.createElement('div')
  container.className = 'nuxy-table-container'

  const table = document.createElement('table')
  table.className = 'nuxy-table nuxy-md-table'

  const thead = document.createElement('thead')
  const headerRow = document.createElement('tr')
  headerRow.className = 'nuxy-table__tr'

  headers.forEach((h, idx) => {
    const th = document.createElement('th')
    th.className = 'nuxy-table__th'
    const align = cellAlignStyle(aligns[idx])
    if (align) th.style.textAlign = align
    appendInlineNodes(th, parseInline(h))
    headerRow.appendChild(th)
  })
  thead.appendChild(headerRow)
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  for (const row of rows) {
    const tr = document.createElement('tr')
    tr.className = 'nuxy-table__tr'
    row.forEach((cell, ci) => {
      const td = document.createElement('td')
      td.className = 'nuxy-table__td'
      const align = cellAlignStyle(aligns[ci])
      if (align) td.style.textAlign = align
      appendInlineNodes(td, parseInline(cell))
      tr.appendChild(td)
    })
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  container.appendChild(table)
  return container
}

function renderBlock(block: Block): HTMLElement | null {
  if (block.type === 'hr') {
    const hr = document.createElement('hr')
    hr.className = 'nuxy-md-hr'
    return hr
  }

  if (block.type === 'code') {
    return renderCodeBlock(block.code, block.lang)
  }

  if (block.type === 'heading') {
    const el = document.createElement(`h${block.level}`)
    el.className = `nuxy-md-h${block.level}`
    appendInlineNodes(el, parseInline(block.text))
    return el
  }

  if (block.type === 'blockquote') {
    const el = document.createElement('blockquote')
    el.className = 'nuxy-md-blockquote'
    appendInlineNodes(el, parseInline(block.text))
    return el
  }

  if (block.type === 'table') {
    return renderTable(block.headers, block.aligns, block.rows)
  }

  if (block.type === 'ul') {
    const ul = document.createElement('ul')
    ul.className = 'nuxy-md-ul'
    ul.appendChild(renderListItems(block.items))
    return ul
  }

  if (block.type === 'ol') {
    const ol = document.createElement('ol')
    ol.className = 'nuxy-md-ol'
    ol.appendChild(renderListItems(block.items))
    return ol
  }

  if (block.type === 'paragraph') {
    const p = document.createElement('p')
    p.className = 'nuxy-md-p'
    const lines = block.text.split('\n')
    lines.forEach((line, idx) => {
      appendInlineNodes(p, parseInline(line))
      if (idx < lines.length - 1) p.appendChild(document.createElement('br'))
    })
    return p
  }

  return null
}

export function renderMarkdownTo(container: HTMLElement, text: string): void {
  const blocks = parseBlocks(text)
  const frag = document.createDocumentFragment()
  for (const block of blocks) {
    const el = renderBlock(block)
    if (el) frag.appendChild(el)
  }
  container.replaceChildren(frag)
}
