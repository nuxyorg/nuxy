// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { getFocusableElements, trapTabKey } from './focus-trap.ts'

function setup() {
  const container = document.createElement('div')
  const first = document.createElement('button')
  first.textContent = 'first'
  const middle = document.createElement('input')
  const last = document.createElement('button')
  last.textContent = 'last'
  container.append(first, middle, last)
  document.body.appendChild(container)
  return { container, first, middle, last }
}

describe('getFocusableElements', () => {
  it('returns focusable elements in DOM order', () => {
    const { container, first, middle, last } = setup()
    expect(getFocusableElements(container)).toEqual([first, middle, last])
  })

  it('skips disabled elements', () => {
    const container = document.createElement('div')
    const enabled = document.createElement('button')
    const disabled = document.createElement('button')
    disabled.disabled = true
    container.append(enabled, disabled)
    document.body.appendChild(container)
    expect(getFocusableElements(container)).toEqual([enabled])
  })
})

describe('trapTabKey', () => {
  it('wraps Tab from the last element to the first', () => {
    const { container, first, last } = setup()
    last.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    trapTabKey(container, event)
    expect(document.activeElement).toBe(first)
    expect(event.defaultPrevented).toBe(true)
  })

  it('wraps Shift+Tab from the first element to the last', () => {
    const { container, first, last } = setup()
    first.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true })
    trapTabKey(container, event)
    expect(document.activeElement).toBe(last)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does nothing for non-Tab keys', () => {
    const { container, last } = setup()
    last.focus()
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true })
    trapTabKey(container, event)
    expect(document.activeElement).toBe(last)
    expect(event.defaultPrevented).toBe(false)
  })
})
