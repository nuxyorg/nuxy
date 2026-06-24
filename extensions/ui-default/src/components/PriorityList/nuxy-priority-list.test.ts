// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import { render, html } from 'lit'
import './nuxy-priority-list.ts'
import type { NuxyPriorityListElement } from './nuxy-priority-list.ts'

describe('nuxy-priority-list', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  it('renders ordered items with rank numbers', async () => {
    const host = document.createElement('nuxy-priority-list') as NuxyPriorityListElement
    host.items = JSON.stringify([
      { value: 'a', label: 'First' },
      { value: 'b', label: 'Second' },
    ])
    parent.appendChild(host)
    await host.updateComplete

    const labels = [...host.shadowRoot!.querySelectorAll('.nuxy-priority-list__label')].map(
      (el) => el.textContent
    )
    const ranks = [...host.shadowRoot!.querySelectorAll('.nuxy-priority-list__rank')].map(
      (el) => el.textContent
    )
    expect(labels).toEqual(['First', 'Second'])
    expect(ranks).toEqual(['1.', '2.'])
  })

  it('positions the sliding indicator on the active item when editing', async () => {
    const host = document.createElement('nuxy-priority-list') as NuxyPriorityListElement
    host.items = JSON.stringify([
      { value: 'a', label: 'First' },
      { value: 'b', label: 'Second' },
    ])
    host.editing = true
    host.activeIndex = 1
    parent.appendChild(host)
    await host.updateComplete
    Object.defineProperty(host, 'offsetHeight', { value: 60, configurable: true })
    const items = [
      ...host.shadowRoot!.querySelectorAll('.nuxy-priority-list__item'),
    ] as HTMLElement[]
    items.forEach((item, index) => {
      Object.defineProperty(item, 'offsetTop', { value: index * 28, configurable: true })
      Object.defineProperty(item, 'offsetHeight', { value: 24, configurable: true })
    })
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => requestAnimationFrame(r))

    const indicator = host.shadowRoot!.querySelector('.indicator') as HTMLElement
    expect(indicator.classList.contains('visible')).toBe(true)
    expect(indicator.style.transform).toBe(`translateY(${items[1]!.offsetTop}px)`)
    expect(indicator.style.height).toBe(`${items[1]!.offsetHeight}px`)
  })

  it('animates indicator when active-index changes', async () => {
    const host = document.createElement('nuxy-priority-list') as NuxyPriorityListElement
    host.items = JSON.stringify([
      { value: 'a', label: 'First' },
      { value: 'b', label: 'Second' },
    ])
    host.editing = true
    host.activeIndex = 0
    parent.appendChild(host)
    await host.updateComplete
    Object.defineProperty(host, 'offsetHeight', { value: 60, configurable: true })

    const mockItemLayout = () => {
      const items = [
        ...host.shadowRoot!.querySelectorAll('.nuxy-priority-list__item'),
      ] as HTMLElement[]
      items.forEach((item, index) => {
        Object.defineProperty(item, 'offsetTop', { value: index * 28, configurable: true })
        Object.defineProperty(item, 'offsetHeight', { value: 24, configurable: true })
      })
      return items
    }

    mockItemLayout()
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => requestAnimationFrame(r))

    host.activeIndex = 1
    await host.updateComplete
    const items = mockItemLayout()
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((r) => requestAnimationFrame(r))

    const indicator = host.shadowRoot!.querySelector('.indicator') as HTMLElement
    expect(indicator.style.transform).toBe(`translateY(${items[1]!.offsetTop}px)`)
  })

  it('applies FLIP transforms when item order changes', async () => {
    const host = document.createElement('nuxy-priority-list') as NuxyPriorityListElement
    host.items = JSON.stringify([
      { value: 'a', label: 'First' },
      { value: 'b', label: 'Second' },
    ])
    host.editing = true
    host.activeIndex = 1
    parent.appendChild(host)
    await host.updateComplete
    Object.defineProperty(host, 'offsetHeight', { value: 60, configurable: true })

    const items = [
      ...host.shadowRoot!.querySelectorAll('.nuxy-priority-list__item'),
    ] as HTMLElement[]
    items.forEach((item, index) => {
      Object.defineProperty(item, 'offsetTop', { value: index * 28, configurable: true })
      Object.defineProperty(item, 'offsetHeight', { value: 24, configurable: true })
    })

    host.items = JSON.stringify([
      { value: 'b', label: 'Second' },
      { value: 'a', label: 'First' },
    ])
    host.activeIndex = 0
    await host.updateComplete

    const swapped = [
      ...host.shadowRoot!.querySelectorAll('.nuxy-priority-list__item'),
    ] as HTMLElement[]
    swapped.forEach((item, index) => {
      Object.defineProperty(item, 'offsetTop', { value: index * 28, configurable: true })
      Object.defineProperty(item, 'offsetHeight', { value: 24, configurable: true })
    })

    await new Promise((r) => requestAnimationFrame(r))

    const movedItem = swapped.find((item) => item.dataset.value === 'b')
    expect(movedItem?.style.transition).toContain('transform 180ms')
    expect(movedItem?.style.transform).toBe('')
  })

  it('hides indicator when not editing', async () => {
    const host = document.createElement('nuxy-priority-list') as NuxyPriorityListElement
    host.items = JSON.stringify([{ value: 'a', label: 'First' }])
    host.editing = false
    host.activeIndex = 0
    parent.appendChild(host)
    Object.defineProperty(host, 'offsetHeight', { value: 30, configurable: true })
    await host.updateComplete
    await new Promise((r) => requestAnimationFrame(r))

    const indicator = host.shadowRoot!.querySelector('.indicator') as HTMLElement
    expect(indicator.classList.contains('visible')).toBe(false)
  })

  it('updates when items property changes via template rebind', async () => {
    const renderList = (items: Array<{ value: string; label: string }>) => {
      render(
        html`<nuxy-priority-list
          .items=${JSON.stringify(items)}
          active-index="-1"
        ></nuxy-priority-list>`,
        parent
      )
    }

    renderList([{ value: 'a', label: 'Alpha' }])
    const host = parent.querySelector('nuxy-priority-list') as NuxyPriorityListElement
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('.nuxy-priority-list__label')?.textContent).toBe('Alpha')

    renderList([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ])
    await host.updateComplete
    const labels = [...host.shadowRoot!.querySelectorAll('.nuxy-priority-list__label')].map(
      (el) => el.textContent
    )
    expect(labels).toEqual(['Alpha', 'Beta'])
  })
})
