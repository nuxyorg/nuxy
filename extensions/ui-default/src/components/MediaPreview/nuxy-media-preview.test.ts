// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import { render, html } from '@nuxyorg/core'
import './nuxy-media-preview.ts'
import type { NuxyMediaPreviewElement } from './nuxy-media-preview.ts'

afterEach(() => {
  document.body.replaceChildren()
})

describe('nuxy-media-preview', () => {
  it('re-renders when the title attribute changes', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(
      html`<nuxy-media-preview title="First" layout="vertical" size="lg"></nuxy-media-preview>`,
      container
    )

    const el = container.querySelector('nuxy-media-preview') as NuxyMediaPreviewElement
    await el.updateComplete
    expect(el.shadowRoot?.querySelector('.nuxy-media-preview__title')?.textContent).toBe('First')

    el.title = 'Second'
    await el.updateComplete
    expect(el.shadowRoot?.querySelector('.nuxy-media-preview__title')?.textContent).toBe('Second')
  })

  it('renders img src when thumbnail is set via attribute binding', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(
      html`<nuxy-media-preview
        thumbnail="https://example.com/thumb.jpg"
        title="Video"
        size="sm"
      ></nuxy-media-preview>`,
      container
    )

    const el = container.querySelector('nuxy-media-preview') as NuxyMediaPreviewElement
    await el.updateComplete

    const img = el.shadowRoot?.querySelector('img')
    expect(img?.getAttribute('src')).toBe('https://example.com/thumb.jpg')
    expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer')
  })
})
