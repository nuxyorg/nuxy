// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import './nuxy-modal.ts'
import '../Icon/nuxy-icon.ts'
import type { NuxyModalElement } from './nuxy-modal.ts'

async function mountModal(bodyHtml: string): Promise<NuxyModalElement> {
  const modal = document.createElement('nuxy-modal') as NuxyModalElement
  modal.innerHTML = bodyHtml
  document.body.appendChild(modal)
  modal.setAttribute('open', '')
  await modal.updateComplete
  await new Promise((r) => requestAnimationFrame(r))
  return modal
}

function getDialog(): HTMLElement | null {
  return document.body.querySelector('.nuxy-modal-backdrop .nuxy-modal')
}

afterEach(() => {
  document.body.querySelectorAll('nuxy-modal').forEach((el) => el.remove())
  document.body.querySelectorAll('.nuxy-modal-backdrop').forEach((el) => el.remove())
})

describe('nuxy-modal', () => {
  it('renders dialog role and aria-modal', async () => {
    await mountModal('<button>one</button><button>two</button>')
    const dialog = getDialog()
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
  })

  it('closes on Escape', async () => {
    const modal = await mountModal('<button>one</button>')
    let closed = false
    modal.addEventListener('nuxy-modal-close', () => {
      closed = true
    })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(closed).toBe(true)
  })

  it('traps Tab focus within the dialog', async () => {
    await mountModal('<button id="a">one</button><button id="b">two</button>')
    const dialog = getDialog()
    const body = dialog?.querySelector('.nuxy-modal__body')
    expect(body).toBeTruthy()
    body!.innerHTML = '<button id="a">one</button><button id="b">two</button>'
    const last = body!.querySelector('#b') as HTMLElement
    last.focus()
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
