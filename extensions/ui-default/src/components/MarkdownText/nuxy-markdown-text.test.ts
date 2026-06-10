// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import './nuxy-markdown-text.ts'
import type { NuxyMarkdownTextElement } from './nuxy-markdown-text.ts'

describe('nuxy-markdown-text', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  it('renders without throwing when content is unset', async () => {
    const el = document.createElement('nuxy-markdown-text') as NuxyMarkdownTextElement
    parent.appendChild(el)
    await el.updateComplete
    expect(el.shadowRoot?.querySelector('div')?.childNodes.length).toBe(0)
  })
})
