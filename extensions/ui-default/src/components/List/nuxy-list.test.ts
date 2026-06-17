// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import { render, html } from '@nuxyorg/core'
import './nuxy-list.ts'
import '../ListItem/nuxy-list-item.ts'
import type { NuxyListElement } from './nuxy-list.ts'

afterEach(() => {
  document.body.replaceChildren()
})

describe('nuxy-list indicator', () => {
  it('positions the indicator on the active list item', async () => {
    render(
      html`
        <nuxy-list active-index="1">
          <nuxy-list-item>One</nuxy-list-item>
          <nuxy-list-item>Two</nuxy-list-item>
          <nuxy-list-item>Three</nuxy-list-item>
        </nuxy-list>
      `,
      document.body
    )

    const list = document.querySelector('nuxy-list') as NuxyListElement
    Object.defineProperty(list, 'offsetHeight', { value: 90, configurable: true })
    const items = Array.from(list.querySelectorAll('nuxy-list-item')) as HTMLElement[]
    items.forEach((item, index) => {
      Object.defineProperty(item, 'offsetTop', { value: index * 30, configurable: true })
      Object.defineProperty(item, 'offsetHeight', { value: 30, configurable: true })
    })
    await list.updateComplete
    await new Promise((r) => requestAnimationFrame(r))

    const indicator = list.shadowRoot?.querySelector('.indicator') as HTMLElement | null
    const activeItem = items[1]

    expect(indicator).toBeTruthy()
    expect(indicator!.classList.contains('visible')).toBe(true)
    expect(indicator!.style.transform).toBe(`translateY(${activeItem.offsetTop}px)`)
    expect(indicator!.style.height).toBe(`${activeItem.offsetHeight}px`)
  })

  it('updates indicator when active-index changes', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(
      html`
        <nuxy-list active-index="0">
          <nuxy-list-item>One</nuxy-list-item>
          <nuxy-list-item>Two</nuxy-list-item>
        </nuxy-list>
      `,
      container
    )

    const list = container.querySelector('nuxy-list') as NuxyListElement
    Object.defineProperty(list, 'offsetHeight', { value: 60, configurable: true })
    const items = Array.from(list.querySelectorAll('nuxy-list-item')) as HTMLElement[]
    items.forEach((item, index) => {
      Object.defineProperty(item, 'offsetTop', { value: index * 30, configurable: true })
      Object.defineProperty(item, 'offsetHeight', { value: 30, configurable: true })
    })
    await list.updateComplete
    await new Promise((r) => requestAnimationFrame(r))

    list.activeIndex = 1
    await list.updateComplete
    await new Promise((r) => requestAnimationFrame(r))

    const indicator = list.shadowRoot?.querySelector('.indicator') as HTMLElement | null

    expect(indicator!.classList.contains('visible')).toBe(true)
    expect(indicator!.style.transform).toBe(`translateY(${items[1].offsetTop}px)`)
  })
})
