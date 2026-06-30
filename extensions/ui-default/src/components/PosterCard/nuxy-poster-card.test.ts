// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import { render, html } from '@nuxyorg/core'
import './nuxy-poster-card.ts'
import type { NuxyPosterCardElement } from './nuxy-poster-card.ts'

afterEach(() => {
  document.body.replaceChildren()
})

async function mount(template: ReturnType<typeof html>): Promise<NuxyPosterCardElement> {
  const container = document.createElement('div')
  document.body.appendChild(container)
  render(template, container)
  const el = container.querySelector('nuxy-poster-card') as NuxyPosterCardElement
  await el.updateComplete
  return el
}

describe('nuxy-poster-card', () => {
  it('renders the title and a cover image when a poster is provided', async () => {
    const el = await mount(
      html`<nuxy-poster-card
        poster="https://img/p.jpg"
        title="Inception"
        subtitle="Movie · 2010"
      ></nuxy-poster-card>`
    )
    const root = el.shadowRoot!
    expect(root.querySelector('.title')?.textContent?.trim()).toBe('Inception')
    expect(root.querySelector('.subtitle')?.textContent?.trim()).toBe('Movie · 2010')
    const img = root.querySelector('img') as HTMLImageElement | null
    expect(img?.getAttribute('src')).toBe('https://img/p.jpg')
  })

  it('falls back to a text placeholder when no poster is set', async () => {
    const el = await mount(html`<nuxy-poster-card title="No Art"></nuxy-poster-card>`)
    const root = el.shadowRoot!
    expect(root.querySelector('img')).toBeNull()
    expect(root.querySelector('.placeholder')?.textContent?.trim()).toBe('No Art')
  })

  it('shows the favorite star only when favorite is set', async () => {
    const plain = await mount(html`<nuxy-poster-card title="A"></nuxy-poster-card>`)
    expect(plain.shadowRoot!.querySelector('.star')).toBeNull()

    const fav = await mount(html`<nuxy-poster-card title="B" favorite></nuxy-poster-card>`)
    expect(fav.shadowRoot!.querySelector('.star')).not.toBeNull()
  })

  it('reflects the active attribute for styling', async () => {
    const el = await mount(html`<nuxy-poster-card title="C" active></nuxy-poster-card>`)
    expect(el.hasAttribute('active')).toBe(true)
  })
})
