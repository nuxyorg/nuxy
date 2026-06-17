// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import { render, html } from '@nuxyorg/core'
import './nuxy-button.ts'

afterEach(() => {
  document.body.replaceChildren()
})

describe('nuxy-button', () => {
  it('retains slotted label content and exposes a default slot', async () => {
    render(html`<nuxy-button variant="primary">Save changes</nuxy-button>`, document.body)
    const el = document.querySelector('nuxy-button')!
    await el.updateComplete

    expect(el.textContent?.trim()).toBe('Save changes')
    expect(el.shadowRoot?.querySelector('slot')).toBeTruthy()
  })

  it('mirrors aria-label onto the button', async () => {
    const el = document.createElement('nuxy-button')
    el.setAttribute('aria-label', 'Dismiss')
    document.body.appendChild(el)
    await el.updateComplete

    const btn = el.shadowRoot?.querySelector('button')
    expect(btn?.getAttribute('aria-label')).toBe('Dismiss')
  })
})
