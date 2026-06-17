import { nothing } from 'lit'

export type {
  ReactiveController,
  ReactiveControllerHost,
  PropertyValues,
} from '@lit/reactive-element'
export type { TemplateResult } from 'lit-html'

export * from 'lit'
export * from 'lit/decorators.js'
export * from 'lit/directives/ref.js'

const SAFE_SVG_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'defs',
  'mask',
  'clipPath',
  'linearGradient',
  'radialGradient',
  'stop',
  'style',
  'use',
])

const SAFE_HTML_TAGS = new Set([
  'a',
  'b',
  'br',
  'code',
  'em',
  'i',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'ul',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'div',
  'hr',
  'blockquote',
  'pre',
  'img',
])

function sanitizeSVGNode(node: Element): void {
  const children = Array.from(node.children)
  for (const child of children) {
    const tagName = child.tagName.toLowerCase()
    if (!SAFE_SVG_TAGS.has(tagName)) {
      child.remove()
    } else {
      sanitizeSVGNode(child)
    }
  }

  const attrs = Array.from(node.attributes)
  for (const attr of attrs) {
    const name = attr.name.toLowerCase()
    if (name.startsWith('on')) {
      node.removeAttribute(attr.name)
      continue
    }
    if (name === 'href' || name === 'xlink:href' || name.endsWith(':href')) {
      const val = attr.value.trim()
      if (!val.startsWith('#')) {
        node.removeAttribute(attr.name)
      }
    }
  }
}

function sanitizeHTMLNode(node: Element): void {
  const children = Array.from(node.children)
  for (const child of children) {
    const tagName = child.tagName.toLowerCase()
    if (!SAFE_HTML_TAGS.has(tagName)) {
      child.remove()
    } else {
      sanitizeHTMLNode(child)
    }
  }

  const attrs = Array.from(node.attributes)
  for (const attr of attrs) {
    const name = attr.name.toLowerCase()
    if (name.startsWith('on')) {
      node.removeAttribute(attr.name)
      continue
    }
    if (name === 'href' || name === 'src') {
      const val = attr.value.trim().toLowerCase()
      if (val.startsWith('javascript:') || val.startsWith('data:')) {
        node.removeAttribute(attr.name)
      }
    }
  }
}

export function safeSVG(svgString: string | null | undefined): SVGElement | typeof nothing {
  if (!svgString) return nothing

  if (typeof DOMParser === 'undefined') {
    return nothing
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgString, 'text/html')
    const svgElement = doc.body.firstElementChild
    if (!svgElement) {
      return nothing
    }

    const isSvg =
      svgElement.tagName.toLowerCase() === 'svg' &&
      svgElement.namespaceURI === 'http://www.w3.org/2000/svg'
    if (!isSvg) {
      return nothing
    }

    sanitizeSVGNode(svgElement)
    return svgElement as SVGElement
  } catch {
    return nothing
  }
}

export function safeHTML(htmlString: string | null | undefined): DocumentFragment | typeof nothing {
  if (!htmlString) return nothing

  if (typeof DOMParser === 'undefined') {
    return nothing
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlString, 'text/html')
    sanitizeHTMLNode(doc.body)

    const fragment = doc.createDocumentFragment()
    while (doc.body.firstChild) {
      fragment.appendChild(doc.body.firstChild)
    }
    return fragment
  } catch {
    return nothing
  }
}
