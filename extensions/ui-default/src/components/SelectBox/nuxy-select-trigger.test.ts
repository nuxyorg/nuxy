// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, html } from 'lit'
import './nuxy-select-trigger.ts'
import type { NuxySelectTriggerElement } from './nuxy-select-trigger.ts'

describe('nuxy-select-trigger', () => {
  let parent: HTMLDivElement

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)
  })

  it('renders in light DOM with the label and trigger classes', async () => {
    const el = document.createElement('nuxy-select-trigger') as NuxySelectTriggerElement
    el.label = 'Dark'
    parent.appendChild(el)
    await el.updateComplete

    expect(el.shadowRoot).toBeNull()
    const button = el.querySelector('.nuxy-select-box__trigger')
    expect(button).toBeTruthy()
    expect(el.querySelector('.nuxy-select-box__value')?.textContent).toBe('Dark')
  })

  it('reflects the open state onto trigger/chevron classes', async () => {
    const el = document.createElement('nuxy-select-trigger') as NuxySelectTriggerElement
    el.label = 'Dark'
    parent.appendChild(el)
    await el.updateComplete

    expect(el.querySelector('.nuxy-select-box__trigger--open')).toBeNull()
    expect(el.querySelector('.nuxy-select-box__chevron--open')).toBeNull()

    el.open = true
    await el.updateComplete

    expect(el.querySelector('.nuxy-select-box__trigger--open')).toBeTruthy()
    expect(el.querySelector('.nuxy-select-box__chevron--open')).toBeTruthy()
  })

  it('forwards click and mousedown events to the provided callbacks', async () => {
    const onTriggerClick = vi.fn()
    const onTriggerMouseDown = vi.fn()

    render(
      html`<nuxy-select-trigger
        label="Dark"
        .onTriggerClick=${onTriggerClick}
        .onTriggerMouseDown=${onTriggerMouseDown}
      ></nuxy-select-trigger>`,
      parent
    )

    const el = parent.querySelector('nuxy-select-trigger') as NuxySelectTriggerElement
    await el.updateComplete

    const button = el.querySelector('.nuxy-select-box__trigger') as HTMLButtonElement
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onTriggerMouseDown).toHaveBeenCalledTimes(1)
    expect(onTriggerClick).toHaveBeenCalledTimes(1)
  })

  it('invokes onTriggerRef with the rendered button element', async () => {
    const onTriggerRef = vi.fn()

    render(
      html`<nuxy-select-trigger label="Dark" .onTriggerRef=${onTriggerRef}></nuxy-select-trigger>`,
      parent
    )

    const el = parent.querySelector('nuxy-select-trigger') as NuxySelectTriggerElement
    await el.updateComplete

    expect(onTriggerRef).toHaveBeenCalled()
    const calledWith = onTriggerRef.mock.calls.at(-1)?.[0]
    expect(calledWith).toBe(el.querySelector('.nuxy-select-box__trigger'))
  })
})
