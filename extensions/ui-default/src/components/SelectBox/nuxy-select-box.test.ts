// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, html } from 'lit'
import './nuxy-select-box.ts'
import type { NuxySelectBoxElement } from './nuxy-select-box.ts'

describe('nuxy-select-box', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  afterEach(() => {
    document.documentElement.style.zoom = ''
    vi.restoreAllMocks()
  })

  it('accepts attribute updates from parent templates without throwing', async () => {
    const options = JSON.stringify([
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
    ])

    render(
      html`
        <nuxy-select-box
          .options=${options}
          value="dark"
          focused-index="2"
          placeholder="—"
        ></nuxy-select-box>
      `,
      parent
    )

    const select = parent.querySelector('nuxy-select-box') as NuxySelectBoxElement
    await select.updateComplete

    expect(select.options).toBe(options)
    expect(select.value).toBe('dark')
    expect(select.focusedIndex).toBe(2)
    expect(select.placeholder).toBe('—')
    expect(select.shadowRoot?.textContent).toContain('Dark')

    select.open = true
    await select.updateComplete
    select.open = false
    await select.updateComplete
  })

  it('positions dropdown in zoom-space coordinates when zoom is active', async () => {
    document.documentElement.style.zoom = '150%'

    const el = document.createElement('nuxy-select-box') as NuxySelectBoxElement
    el.options = JSON.stringify([{ value: 'a', label: 'Option A' }])
    el.value = 'a'
    parent.appendChild(el)
    await el.updateComplete

    const triggerBtn = el.shadowRoot!.querySelector<HTMLButtonElement>('.nuxy-select-box__trigger')!
    vi.spyOn(triggerBtn, 'getBoundingClientRect').mockReturnValue({
      top: 150,
      bottom: 180,
      right: 300,
      left: 100,
      width: 200,
      height: 30,
      x: 100,
      y: 150,
      toJSON: () => ({}),
    } as DOMRect)

    el.open = true
    await el.updateComplete

    const dropdown = document.body.querySelector<HTMLDivElement>('.nuxy-select-box__dropdown')
    expect(dropdown).toBeTruthy()

    // zoom = 1.5 → rBottom = 180 / 1.5 = 120, top = 120 + 4 (gap) = 124
    expect(dropdown!.style.top).toBe('124px')
    // rRight = 300 / 1.5 = 200, w = offsetWidth || 160 = 160, left = 200 - 160 = 40
    expect(dropdown!.style.left).toBe('40px')

    el.open = false
    await el.updateComplete
  })

  it('scrolls focused option to top of options list on open', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })

    const el = document.createElement('nuxy-select-box') as NuxySelectBoxElement
    el.options = JSON.stringify(
      Array.from({ length: 30 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }))
    )
    el.value = 'v15'
    el.focusedIndex = 15
    parent.appendChild(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete

    const focusedOption = document.body.querySelector<HTMLElement>(
      '.nuxy-select-box__option--focused'
    )
    const optionsEl = document.body.querySelector<HTMLElement>('.nuxy-select-box__options')
    expect(focusedOption).toBeTruthy()
    expect(optionsEl).toBeTruthy()
    expect(focusedOption!.querySelector('.nuxy-select-box__option-label')!.textContent).toBe(
      'Option 15'
    )
    expect(optionsEl!.scrollTop).toBe(focusedOption!.offsetTop)

    el.open = false
    await el.updateComplete
  })

  it('preserves indicator element across focus changes so CSS transitions can run', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })

    const el = document.createElement('nuxy-select-box') as NuxySelectBoxElement
    el.options = JSON.stringify([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
      { value: 'c', label: 'Gamma' },
    ])
    el.value = 'a'
    el.focusedIndex = 0
    parent.appendChild(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete

    const indicator = document.body.querySelector('.nuxy-select-box__indicator')
    expect(indicator).toBeTruthy()

    el.focusedIndex = 1
    await el.updateComplete

    expect(document.body.querySelector('.nuxy-select-box__indicator')).toBe(indicator)

    el.open = false
    await el.updateComplete
  })

  it('matches numeric option values against string value attribute', async () => {
    const el = document.createElement('nuxy-select-box') as NuxySelectBoxElement
    el.options = JSON.stringify([
      { value: 800, label: '800px' },
      { value: 900, label: '900px' },
    ])
    el.value = '800'
    parent.appendChild(el)
    await el.updateComplete

    expect(el.shadowRoot?.textContent).toContain('800px')
  })

  it('matches boolean false option values', async () => {
    const el = document.createElement('nuxy-select-box') as NuxySelectBoxElement
    el.options = JSON.stringify([
      { value: true, label: 'Yes' },
      { value: false, label: 'No' },
    ])
    el.value = 'false'
    parent.appendChild(el)
    await el.updateComplete

    expect(el.shadowRoot?.textContent).toContain('No')
  })

  it('shows label for empty-string option value instead of placeholder', async () => {
    const el = document.createElement('nuxy-select-box') as NuxySelectBoxElement
    el.options = JSON.stringify([
      { value: '', label: 'Default pack' },
      { value: 'custom', label: 'Custom pack' },
    ])
    el.value = ''
    el.placeholder = '—'
    parent.appendChild(el)
    await el.updateComplete

    expect(el.shadowRoot?.textContent).toContain('Default pack')
    expect(el.shadowRoot?.textContent).not.toContain('—')
  })

  it('clears search input when reopened after close', async () => {
    const el = document.createElement('nuxy-select-box') as NuxySelectBoxElement
    el.options = JSON.stringify([
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ])
    el.value = 'a'
    el.searchable = true
    parent.appendChild(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete

    const searchInput = document.body.querySelector<HTMLInputElement>('.nuxy-select-box__search')!
    expect(searchInput).toBeTruthy()
    searchInput.value = 'alp'
    searchInput.dispatchEvent(new Event('input'))
    expect(searchInput.value).toBe('alp')

    el.open = false
    await el.updateComplete

    el.open = true
    await el.updateComplete

    expect(document.body.querySelector<HTMLInputElement>('.nuxy-select-box__search')!.value).toBe(
      ''
    )

    el.open = false
    await el.updateComplete
  })

  it('restores focus to the selected option after a search query is cleared', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })

    const el = document.createElement('nuxy-select-box') as NuxySelectBoxElement
    el.options = JSON.stringify(
      Array.from({ length: 30 }, (_, i) => ({ value: `v${i}`, label: `Option ${i}` }))
    )
    el.value = 'v25'
    el.searchable = true
    parent.appendChild(el)
    await el.updateComplete

    el.open = true
    await el.updateComplete

    const searchInput = document.body.querySelector<HTMLInputElement>('.nuxy-select-box__search')!
    searchInput.value = 'v'
    searchInput.dispatchEvent(new Event('input'))
    await el.updateComplete

    searchInput.value = ''
    searchInput.dispatchEvent(new Event('input'))
    await el.updateComplete

    const focusedOption = document.body.querySelector<HTMLElement>(
      '.nuxy-select-box__option--focused'
    )
    expect(focusedOption!.querySelector('.nuxy-select-box__option-label')!.textContent).toBe(
      'Option 25'
    )

    el.open = false
    await el.updateComplete
  })
})
