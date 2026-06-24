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
    expect(host.shadowRoot?.querySelector('.nuxy-kbd-icon nuxy-icon')?.getAttribute('name')).toBe(
      'kbd-enter'
    )

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

  it('renders a linear hold progress stroke when hold-ms is set', async () => {
    const host = document.createElement('nuxy-kbd') as NuxyKbdElement
    host.keys = 'hold Esc'
    host.holdMs = 800
    parent.appendChild(host)
    await host.updateComplete

    const progress = host.shadowRoot?.querySelector(
      '.nuxy-kbd__hold-progress'
    ) as HTMLElement | null
    const track = host.shadowRoot?.querySelector('.nuxy-kbd__hold-progress-track')
    expect(progress).not.toBeNull()
    expect(track).not.toBeNull()
    expect(progress?.style.getPropertyValue('--nuxy-hold-ms')).toBe('1600ms')
  })

  it('adapts shortcut modifier icons based on data-kbd-scheme', async () => {
    const host = document.createElement('nuxy-kbd') as NuxyKbdElement
    parent.appendChild(host)

    // Default or PC: '⌃' -> 'kbd-ctrl'
    host.keys = '⌃'
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('nuxy-icon')?.getAttribute('name')).toBe('kbd-ctrl')

    // Default or PC: 'Ctrl' -> plain text
    host.keys = 'Ctrl'
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('nuxy-icon')).toBeNull()
    expect(host.shadowRoot?.textContent?.trim()).toBe('Ctrl')

    // Switch to Mac scheme
    document.documentElement.setAttribute('data-kbd-scheme', 'mac')
    document.dispatchEvent(new CustomEvent('nuxy-kbd-scheme-updated'))
    await host.updateComplete

    // Now 'Ctrl' -> 'kbd-cmd' icon
    expect(host.shadowRoot?.querySelector('nuxy-icon')?.getAttribute('name')).toBe('kbd-cmd')

    // '⌃' -> 'kbd-cmd' icon
    host.keys = '⌃'
    await host.updateComplete
    expect(host.shadowRoot?.querySelector('nuxy-icon')?.getAttribute('name')).toBe('kbd-cmd')

    // Cleanup
    document.documentElement.removeAttribute('data-kbd-scheme')
  })
})
