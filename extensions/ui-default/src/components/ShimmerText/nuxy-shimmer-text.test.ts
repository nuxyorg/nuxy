// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import { render, html } from '@nuxyorg/core'
import './nuxy-shimmer-text.ts'
import type { NuxyShimmerTextElement } from './nuxy-shimmer-text.ts'

describe('nuxy-shimmer-text', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  it('renders the text prop with shimmer styling', async () => {
    render(html`<nuxy-shimmer-text text="Starting…"></nuxy-shimmer-text>`, parent)
    const el = parent.querySelector('nuxy-shimmer-text') as NuxyShimmerTextElement
    await el.updateComplete

    const label = el.shadowRoot?.querySelector('.nuxy-shimmer-text')
    expect(label?.textContent).toBe('Starting…')
    expect(label?.classList.contains('nuxy-shimmer-text--xs')).toBe(true)
    expect(el.getAttribute('role')).toBe('status')
    expect(el.getAttribute('aria-label')).toBe('Starting…')
  })

  it('renders slotted content and applies the requested size', async () => {
    render(html`<nuxy-shimmer-text size="sm">Pausing…</nuxy-shimmer-text>`, parent)
    const el = parent.querySelector('nuxy-shimmer-text') as NuxyShimmerTextElement
    await el.updateComplete

    const label = el.shadowRoot?.querySelector('.nuxy-shimmer-text')
    expect(el.textContent?.trim()).toBe('Pausing…')
    expect(label?.classList.contains('nuxy-shimmer-text--sm')).toBe(true)
  })
})
