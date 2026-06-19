// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import './nuxy-two-panel.ts'

afterEach(() => {
  document.body.replaceChildren()
})

async function mount(
  attrs: Record<string, string> = {}
): Promise<HTMLElement & { updateComplete: Promise<boolean> }> {
  const wrapper = document.createElement('div')
  wrapper.style.width = '800px'
  wrapper.style.height = '400px'
  document.body.appendChild(wrapper)

  const el = document.createElement('nuxy-two-panel') as HTMLElement & {
    updateComplete: Promise<boolean>
  }
  el.style.width = '800px'
  el.style.height = '400px'
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value)
  }

  const left = document.createElement('div')
  left.id = 'left'
  const right = document.createElement('div')
  right.id = 'right'
  el.append(left, right)
  wrapper.appendChild(el)
  await el.updateComplete
  return el
}

function leftStyleWidth(el: HTMLElement): string {
  const left = el.querySelector('#left') as HTMLElement
  return left.style.width
}

describe('nuxy-two-panel', () => {
  it('applies defaultPosition as initial left width ratio', async () => {
    const el = await mount({ 'default-position': '1/4' })
    expect(leftStyleWidth(el)).toBe('25%')
  })

  it('defaults minScale to 1/4 and defaultPosition to 1/2', async () => {
    const el = await mount()
    expect(leftStyleWidth(el)).toBe('50%')
  })

  it('hides resize handle when minScale is 1/2', async () => {
    const el = await mount({ 'min-scale': '1/2' })
    const handle = el.shadowRoot?.querySelector('.handle') as HTMLElement
    expect(handle.hidden).toBe(true)
    expect(leftStyleWidth(el)).toBe('50%')
  })

  it('shows resize handle when minScale is below 1/2', async () => {
    const el = await mount({ 'min-scale': '1/4' })
    const handle = el.shadowRoot?.querySelector('.handle') as HTMLElement
    expect(handle.hidden).toBe(false)
  })

  it('clamps defaultPosition to minScale lower bound', async () => {
    const el = await mount({ 'default-position': '1/10', 'min-scale': '1/4' })
    expect(leftStyleWidth(el)).toBe('25%')
  })

  it('does not start drag when minScale locks the split', async () => {
    const el = await mount({ 'min-scale': '1/2', 'default-position': '1/3' })
    let fired = false
    el.addEventListener('split-change', () => {
      fired = true
    })

    const handle = el.shadowRoot?.querySelector('.handle') as HTMLElement
    handle.dispatchEvent(
      new PointerEvent('pointerdown', { clientX: 100, bubbles: true, cancelable: true })
    )
    handle.dispatchEvent(
      new PointerEvent('pointermove', { clientX: 300, bubbles: true, cancelable: true })
    )
    handle.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }))

    expect(fired).toBe(false)
    expect(leftStyleWidth(el)).toBe('50%')
  })
})
