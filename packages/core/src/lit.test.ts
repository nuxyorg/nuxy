// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { safeSVG, safeHTML } from './lit'
import { nothing } from 'lit'

describe('safeSVG', () => {
  it('returns nothing for empty or nullish values', () => {
    expect(safeSVG(null)).toBe(nothing)
    expect(safeSVG(undefined)).toBe(nothing)
    expect(safeSVG('')).toBe(nothing)
  })

  it('renders a valid simple SVG', () => {
    const raw = '<svg><path d="M0 0h10v10H0z"/></svg>'
    const res = safeSVG(raw)
    expect(res).not.toBe(nothing)
    expect(res).toBeInstanceOf(SVGElement)
    const svg = res as SVGElement
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg.children.length).toBe(1)
    expect(svg.children[0].tagName.toLowerCase()).toBe('path')
  })

  it('removes unauthorized tags like script or foreignObject', () => {
    const raw =
      '<svg><path d="M0 0h10"/><script>alert(1)</script><foreignObject><div>Test</div></foreignObject></svg>'
    const res = safeSVG(raw) as SVGElement
    expect(res.querySelector('script')).toBeNull()
    expect(res.querySelector('foreignobject')).toBeNull()
    expect(res.querySelectorAll('path').length).toBe(1)
  })

  it('removes inline event handlers', () => {
    const raw =
      '<svg><circle cx="5" cy="5" r="4" onload="alert(1)" onclick="javascript:alert(2)" class="circle-cls"/></svg>'
    const res = safeSVG(raw) as SVGElement
    const circle = res.querySelector('circle')!
    expect(circle.getAttribute('onload')).toBeNull()
    expect(circle.getAttribute('onclick')).toBeNull()
    expect(circle.getAttribute('class')).toBe('circle-cls')
  })

  it('allows safe local href values and blocks external or javascript protocols', () => {
    const raw = `
      <svg>
        <defs>
          <linearGradient id="g" />
        </defs>
        <rect href="#g" width="10" height="10" />
        <circle href="javascript:alert(1)" r="5" />
        <path xlink:href="https://evil.com" />
      </svg>
    `
    const res = safeSVG(raw) as SVGElement
    const rect = res.querySelector('rect')!
    expect(rect.getAttribute('href')).toBe('#g')

    const circle = res.querySelector('circle')!
    expect(circle.getAttribute('href')).toBeNull()

    const path = res.querySelector('path')!
    expect(path.getAttribute('xlink:href')).toBeNull()
  })

  it('successfully parses and auto-closes malformed/unclosed SVG markup', () => {
    const raw = '<svg><path d="M0 0h10' // unclosed tags
    const res = safeSVG(raw)
    expect(res).not.toBe(nothing)
    expect(res).toBeInstanceOf(SVGElement)
  })

  it('returns nothing if the root is not an svg tag', () => {
    const raw = '<div><svg></svg></div>'
    expect(safeSVG(raw)).toBe(nothing)
  })
})

describe('safeHTML', () => {
  it('returns nothing for empty or nullish values', () => {
    expect(safeHTML(null)).toBe(nothing)
    expect(safeHTML(undefined)).toBe(nothing)
    expect(safeHTML('')).toBe(nothing)
  })

  it('renders safe HTML tags', () => {
    const raw = '<div><p>Hello <strong>World</strong></p></div>'
    const res = safeHTML(raw)
    expect(res).not.toBe(nothing)
    expect(res).toBeInstanceOf(DocumentFragment)
    const frag = res as DocumentFragment
    expect(frag.children.length).toBe(1)
    expect(frag.children[0].tagName.toLowerCase()).toBe('div')
    expect(frag.children[0].children[0].tagName.toLowerCase()).toBe('p')
    expect(frag.children[0].textContent?.trim()).toBe('Hello World')
  })

  it('strips unsafe script elements', () => {
    const raw = '<div><script>alert(1)</script><span>Safe</span></div>'
    const res = safeHTML(raw) as DocumentFragment
    const div = res.children[0]
    expect(div.querySelector('script')).toBeNull()
    expect(div.querySelector('span')).not.toBeNull()
  })

  it('strips onload or onerror event attributes and unsafe javascript URIs', () => {
    const raw = `
      <div>
        <img src="foo.jpg" onerror="alert(1)" />
        <a href="javascript:alert(2)">Link</a>
        <a href="https://example.com">Safe Link</a>
      </div>
    `
    const res = safeHTML(raw) as DocumentFragment
    const img = res.querySelector('img')!
    expect(img.getAttribute('onerror')).toBeNull()
    expect(img.getAttribute('src')).toBe('foo.jpg')

    const links = res.querySelectorAll('a')
    expect(links[0].getAttribute('href')).toBeNull()
    expect(links[1].getAttribute('href')).toBe('https://example.com')
  })
})
