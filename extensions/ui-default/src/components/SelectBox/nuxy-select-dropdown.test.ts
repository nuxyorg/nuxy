// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import './nuxy-select-dropdown.ts'
import type { NuxySelectDropdownElement } from './nuxy-select-dropdown.ts'

describe('nuxy-select-dropdown', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function flushOptions(el: NuxySelectDropdownElement): Promise<void> {
    await el.updateComplete
    const optionEls = Array.from(document.body.querySelectorAll('nuxy-select-option'))
    await Promise.all(
      optionEls.map((o) => (o as unknown as { updateComplete: Promise<unknown> }).updateComplete)
    )
  }

  it('portals its content to document.body via nuxy-portal', async () => {
    const el = document.createElement('nuxy-select-dropdown') as NuxySelectDropdownElement
    el.options = [{ value: 'a', label: 'Alpha' }]
    el.value = 'a'
    parent.appendChild(el)
    await flushOptions(el)

    expect(el.querySelector('.nuxy-select-box__dropdown')).toBeNull()
    expect(document.body.querySelector('.nuxy-select-box__dropdown')).toBeTruthy()
  })

  it('renders one nuxy-select-option per entry with focused/selected state', async () => {
    const el = document.createElement('nuxy-select-dropdown') as NuxySelectDropdownElement
    el.options = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ]
    el.value = 'b'
    el.focusedIndex = 1
    parent.appendChild(el)
    await flushOptions(el)

    const optionRows = document.body.querySelectorAll('[role="option"]')
    expect(optionRows.length).toBe(2)
    expect(optionRows[1].getAttribute('aria-selected')).toBe('true')
    expect(document.body.querySelector('.nuxy-select-box__option--focused')?.textContent).toContain(
      'Beta'
    )
  })

  it('shows "No results" when options is empty', async () => {
    const el = document.createElement('nuxy-select-dropdown') as NuxySelectDropdownElement
    el.options = []
    el.value = ''
    parent.appendChild(el)
    await flushOptions(el)

    expect(document.body.querySelector('.nuxy-select-box__no-results')).toBeTruthy()
  })

  it('renders the search input only when searchable is true', async () => {
    const el = document.createElement('nuxy-select-dropdown') as NuxySelectDropdownElement
    el.options = [{ value: 'a', label: 'Alpha' }]
    el.value = 'a'
    parent.appendChild(el)
    await flushOptions(el)

    expect(document.body.querySelector('.nuxy-select-box__search')).toBeNull()

    el.searchable = true
    await flushOptions(el)

    expect(document.body.querySelector('.nuxy-select-box__search')).toBeTruthy()
  })

  it('forwards option select/hover callbacks from nested nuxy-select-option rows', async () => {
    const onOptionSelect = vi.fn()
    const onOptionHoverEnter = vi.fn()

    const el = document.createElement('nuxy-select-dropdown') as NuxySelectDropdownElement
    el.options = [{ value: 'a', label: 'Alpha' }]
    el.value = 'a'
    el.onOptionSelect = onOptionSelect
    el.onOptionHoverEnter = onOptionHoverEnter
    parent.appendChild(el)
    await flushOptions(el)

    const row = document.body.querySelector('[role="option"]') as HTMLElement
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    expect(onOptionSelect).toHaveBeenCalledWith('a')
    expect(onOptionHoverEnter).toHaveBeenCalledWith(0)
  })

  it('applies the indicator transform/height/visibility styles', async () => {
    const el = document.createElement('nuxy-select-dropdown') as NuxySelectDropdownElement
    el.options = [{ value: 'a', label: 'Alpha' }]
    el.value = 'a'
    el.indicatorTransform = 'translateY(12px)'
    el.indicatorHeight = '24px'
    el.indicatorVisible = true
    parent.appendChild(el)
    await flushOptions(el)

    const indicator = document.body.querySelector<HTMLElement>('.nuxy-select-box__indicator')
    expect(indicator).toBeTruthy()
    expect(indicator!.classList.contains('visible')).toBe(true)
    expect(indicator!.style.transform).toBe('translateY(12px)')
    expect(indicator!.style.height).toBe('24px')
  })
})
