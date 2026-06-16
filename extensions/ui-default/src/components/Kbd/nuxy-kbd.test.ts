// @vitest-environment happy-dom

import { describe, it, expect, beforeEach } from 'vitest'
import { render, html } from 'lit'
import './nuxy-kbd.ts'
import type { NuxyKbdElement } from './nuxy-kbd.ts'

describe('nuxy-kbd', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  it('updates rendered content when keys property changes', async () => {
    const host = document.createElement('nuxy-kbd') as NuxyKbdElement
    parent.appendChild(host)

    host.keys = '↵'
    await host.updateComplete
    expect(
      host.shadowRoot?.querySelector('.nuxy-kbd-icon nuxy-icon')?.getAttribute('name')
    ).toBe('kbd-enter')

    host.keys = 'Del'
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('.nuxy-kbd-icon')).toBeNull()
    expect(host.shadowRoot?.textContent).toBe('Del')
  })

  it('updates child kbd when parent template rebinds keys at the same list index', async () => {
    const hints = ['↵']
    const renderFooter = (items: string[]) => {
      render(html`${items.map((k) => html`<nuxy-kbd .keys=${k}></nuxy-kbd>`)}`, parent)
    }

    renderFooter(hints)
    const kbd = parent.querySelector('nuxy-kbd') as NuxyKbdElement
    await kbd.updateComplete
    expect(kbd.shadowRoot?.querySelector('.nuxy-kbd-icon')).not.toBeNull()

    renderFooter(['Del'])
    await kbd.updateComplete
    expect(kbd.shadowRoot?.textContent).toBe('Del')
    expect(kbd.shadowRoot?.querySelector('.nuxy-kbd-icon')).toBeNull()
  })
})
