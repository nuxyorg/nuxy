// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, html } from '@nuxyorg/core'
import '../nuxy-command-palette.ts'
import type { NuxyCommandPaletteElement } from '../nuxy-command-palette.ts'
import type { ShellAction } from '@nuxyorg/core'

function press(el: HTMLElement, key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
}

describe('nuxy-command-palette submenu navigation', () => {
  let parent: HTMLDivElement
  let palette: NuxyCommandPaletteElement
  let actions: ShellAction[]

  beforeEach(async () => {
    parent = document.createElement('div')
    document.body.replaceChildren(parent)

    actions = [
      { id: 'a', label: 'Alpha', handler: vi.fn() },
      {
        id: 'b',
        label: 'Beta',
        handler: vi.fn(),
        children: [
          { id: 'b1', label: 'Beta One', handler: vi.fn() },
          { id: 'b2', label: 'Beta Two', handler: vi.fn() },
        ],
      },
      { id: 'c', label: 'Gamma', handler: vi.fn() },
    ]

    render(html`<nuxy-command-palette></nuxy-command-palette>`, parent)
    palette = parent.querySelector('nuxy-command-palette') as NuxyCommandPaletteElement
    await palette.updateComplete
    palette.translateFn = (k: string) => k
    palette.actions = actions
    await palette.updateComplete
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Escape inside a submenu returns to the parent menu without closing the palette', async () => {
    const onClose = vi.fn()
    palette.onClose = onClose

    press(palette, 'ArrowDown') // select "Beta"
    press(palette, 'ArrowRight') // open submenu
    await palette.updateComplete

    expect(palette.shadowRoot?.textContent).toContain('Beta One')

    press(palette, 'Escape')
    await palette.updateComplete

    expect(onClose).not.toHaveBeenCalled()
    expect(palette.shadowRoot?.textContent).toContain('Beta')
    expect(palette.shadowRoot?.textContent).toContain('Gamma')
  })

  it('Escape at the root menu closes the palette', async () => {
    const onClose = vi.fn()
    palette.onClose = onClose

    press(palette, 'Escape')

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('restores the same selected index when returning from a submenu via Escape', async () => {
    press(palette, 'ArrowDown') // index 1 ("Beta")
    await palette.updateComplete
    press(palette, 'ArrowRight') // open submenu, child index resets to 0
    await palette.updateComplete

    press(palette, 'ArrowDown') // move within submenu to index 1 ("Beta Two")
    await palette.updateComplete
    press(palette, 'Escape') // go back up
    await palette.updateComplete

    press(palette, 'Enter')
    await palette.updateComplete
    // "Beta" is a submenu parent with no handler — executing Enter at the
    // restored index should re-open its submenu rather than landing on "Alpha" or "Gamma".
    expect(palette.shadowRoot?.textContent).toContain('Beta One')
  })

  it('restores the same selected index when returning from a submenu via the back button', async () => {
    press(palette, 'ArrowDown') // index 1 ("Beta")
    press(palette, 'ArrowRight') // open submenu
    await palette.updateComplete

    const backButton = palette.shadowRoot?.querySelector(
      '.nuxy-command-palette__back'
    ) as HTMLButtonElement
    backButton.click()
    await palette.updateComplete

    press(palette, 'Enter')
    await palette.updateComplete

    // Selection should still be on "Beta" (index 1), so Enter re-opens its submenu.
    expect(palette.shadowRoot?.textContent).toContain('Beta One')
  })
})
