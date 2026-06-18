// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import { render, html } from '@nuxyorg/core'
import './nuxy-grid.ts'
import type { NuxyGridElement, NuxyGridItemElement } from './nuxy-grid.ts'

async function mockGridItemOffsets(
  items: NuxyGridItemElement[],
  layout: (index: number) => { left: number; top: number; width: number; height: number }
): Promise<void> {
  for (const [index, item] of items.entries()) {
    await item.updateComplete
    const btn = item.shadowRoot!.querySelector('.nuxy-grid-item') as HTMLElement
    const { left, top, width, height } = layout(index)
    Object.defineProperty(btn, 'offsetLeft', { value: left, configurable: true })
    Object.defineProperty(btn, 'offsetTop', { value: top, configurable: true })
    Object.defineProperty(btn, 'offsetWidth', { value: width, configurable: true })
    Object.defineProperty(btn, 'offsetHeight', { value: height, configurable: true })
  }
}

afterEach(() => {
  document.body.replaceChildren()
})

describe('nuxy-grid indicator', () => {
  it('positions the indicator on the active grid item using both axes', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(
      html`
        <nuxy-grid cols="3" gap="8" active-index="1">
          <nuxy-grid-item>A</nuxy-grid-item>
          <nuxy-grid-item>B</nuxy-grid-item>
          <nuxy-grid-item>C</nuxy-grid-item>
        </nuxy-grid>
      `,
      container
    )

    const grid = container.querySelector('nuxy-grid') as NuxyGridElement
    Object.defineProperty(grid, 'offsetHeight', { value: 90, configurable: true })
    const items = Array.from(grid.querySelectorAll('nuxy-grid-item')) as NuxyGridItemElement[]
    await mockGridItemOffsets(items, (index) => ({
      left: index * 40,
      top: 0,
      width: 40,
      height: 40,
    }))
    await grid.updateComplete
    await new Promise((r) => requestAnimationFrame(r))

    const indicator = grid.shadowRoot?.querySelector('.indicator') as HTMLElement | null
    const activeItem = items[1]
    const activeBtn = activeItem.shadowRoot!.querySelector('.nuxy-grid-item') as HTMLElement

    expect(indicator).toBeTruthy()
    expect(indicator!.classList.contains('visible')).toBe(true)
    expect(indicator!.style.transform).toBe(
      `translate(${activeBtn.offsetLeft}px, ${activeBtn.offsetTop}px)`
    )
    expect(indicator!.style.width).toBe(`${activeBtn.offsetWidth}px`)
    expect(indicator!.style.height).toBe(`${activeBtn.offsetHeight}px`)
  })

  it('updates indicator when active-index changes to a new row', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(
      html`
        <nuxy-grid cols="2" gap="8" active-index="0">
          <nuxy-grid-item>A</nuxy-grid-item>
          <nuxy-grid-item>B</nuxy-grid-item>
          <nuxy-grid-item>C</nuxy-grid-item>
          <nuxy-grid-item>D</nuxy-grid-item>
        </nuxy-grid>
      `,
      container
    )

    const grid = container.querySelector('nuxy-grid') as NuxyGridElement
    Object.defineProperty(grid, 'offsetHeight', { value: 90, configurable: true })
    const items = Array.from(grid.querySelectorAll('nuxy-grid-item')) as NuxyGridItemElement[]
    await mockGridItemOffsets(items, (index) => ({
      left: (index % 2) * 40,
      top: Math.floor(index / 2) * 40,
      width: 40,
      height: 40,
    }))
    await grid.updateComplete
    await new Promise((r) => requestAnimationFrame(r))

    grid.activeIndex = 3
    await grid.updateComplete
    await new Promise((r) => requestAnimationFrame(r))

    const indicator = grid.shadowRoot?.querySelector('.indicator') as HTMLElement | null

    const activeBtn = items[3].shadowRoot!.querySelector('.nuxy-grid-item') as HTMLElement

    expect(indicator!.classList.contains('visible')).toBe(true)
    expect(indicator!.style.transform).toBe(
      `translate(${activeBtn.offsetLeft}px, ${activeBtn.offsetTop}px)`
    )
  })

  it('hides the indicator when active-index is -1', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)

    render(
      html`
        <nuxy-grid cols="2" gap="8" active-index="-1">
          <nuxy-grid-item>A</nuxy-grid-item>
          <nuxy-grid-item>B</nuxy-grid-item>
        </nuxy-grid>
      `,
      container
    )

    const grid = container.querySelector('nuxy-grid') as NuxyGridElement
    Object.defineProperty(grid, 'offsetHeight', { value: 90, configurable: true })
    await grid.updateComplete
    await new Promise((r) => requestAnimationFrame(r))

    const indicator = grid.shadowRoot?.querySelector('.indicator') as HTMLElement | null
    expect(indicator!.classList.contains('visible')).toBe(false)
  })
})
