// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, html } from 'lit'
import './nuxy-select-option.ts'
import type { NuxySelectOptionElement } from './nuxy-select-option.ts'

describe('nuxy-select-option', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  it('renders in light DOM with role=option and the label', async () => {
    const el = document.createElement('nuxy-select-option') as NuxySelectOptionElement
    el.optionValue = 'a'
    el.label = 'Alpha'
    el.index = 0
    parent.appendChild(el)
    await el.updateComplete

    expect(el.shadowRoot).toBeNull()
    const row = el.querySelector('[role="option"]')
    expect(row).toBeTruthy()
    expect(row?.getAttribute('data-option-index')).toBe('0')
    expect(el.querySelector('.nuxy-select-box__option-label')?.textContent).toBe('Alpha')
  })

  it('shows the check mark and aria-selected only when selected', async () => {
    const el = document.createElement('nuxy-select-option') as NuxySelectOptionElement
    el.optionValue = 'a'
    el.label = 'Alpha'
    el.index = 0
    el.selected = false
    parent.appendChild(el)
    await el.updateComplete

    expect(el.querySelector('[role="option"]')?.getAttribute('aria-selected')).toBe('false')
    expect(el.querySelector('.nuxy-select-box__option-check')).toBeNull()

    el.selected = true
    await el.updateComplete

    expect(el.querySelector('[role="option"]')?.getAttribute('aria-selected')).toBe('true')
    expect(el.querySelector('.nuxy-select-box__option-check')).toBeTruthy()
  })

  it('applies the focused class when focused is true', async () => {
    const el = document.createElement('nuxy-select-option') as NuxySelectOptionElement
    el.optionValue = 'a'
    el.label = 'Alpha'
    el.index = 0
    el.focused = true
    parent.appendChild(el)
    await el.updateComplete

    expect(el.querySelector('.nuxy-select-box__option--focused')).toBeTruthy()
  })

  it('calls onSelect with the option value on click and stops propagation', async () => {
    const onSelect = vi.fn()
    const parentClick = vi.fn()
    parent.addEventListener('click', parentClick)

    render(
      html`<nuxy-select-option
        .optionValue=${'a'}
        .label=${'Alpha'}
        .index=${0}
        .onSelect=${onSelect}
      ></nuxy-select-option>`,
      parent
    )

    const el = parent.querySelector('nuxy-select-option') as NuxySelectOptionElement
    await el.updateComplete

    const row = el.querySelector('[role="option"]') as HTMLElement
    row.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onSelect).toHaveBeenCalledWith('a')
    expect(parentClick).not.toHaveBeenCalled()
  })

  it('calls onHoverEnter with the option index on mouseenter', async () => {
    const onHoverEnter = vi.fn()

    render(
      html`<nuxy-select-option
        .optionValue=${'a'}
        .label=${'Alpha'}
        .index=${3}
        .onHoverEnter=${onHoverEnter}
      ></nuxy-select-option>`,
      parent
    )

    const el = parent.querySelector('nuxy-select-option') as NuxySelectOptionElement
    await el.updateComplete

    const row = el.querySelector('[role="option"]') as HTMLElement
    row.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    expect(onHoverEnter).toHaveBeenCalledWith(3)
  })
})
