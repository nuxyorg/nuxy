// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import {
  computeListIndicatorPosition,
  createListIndicatorState,
  listIndicatorStyleForTarget,
  resolveActiveItem,
  resetListIndicatorElement,
  updateListIndicatorElement,
} from './list-indicator.ts'

afterEach(() => {
  document.body.replaceChildren()
})

describe('list-indicator', () => {
  it('computes transform and height from offsetTop/offsetHeight', () => {
    const target = document.createElement('div')
    Object.defineProperty(target, 'offsetTop', { value: 24 })
    Object.defineProperty(target, 'offsetHeight', { value: 38 })

    expect(computeListIndicatorPosition(target)).toEqual({
      transform: 'translateY(24px)',
      height: '38px',
    })
  })

  it('returns hidden style when target is null', () => {
    expect(listIndicatorStyleForTarget(null)).toEqual({
      transform: '',
      height: '',
      visible: false,
    })
  })

  it('resolves the active item by selector and index', () => {
    const container = document.createElement('div')
    const first = document.createElement('nuxy-list-item')
    const second = document.createElement('nuxy-list-item')
    container.append(first, second)

    expect(resolveActiveItem(container, 1, 'nuxy-list-item')).toBe(second)
    expect(resolveActiveItem(container, -1, 'nuxy-list-item')).toBeNull()
    expect(resolveActiveItem(container, 5, 'nuxy-list-item')).toBeNull()
  })

  it('shows and positions the indicator element', () => {
    const indicator = document.createElement('div')
    const target = document.createElement('div')
    Object.defineProperty(target, 'offsetTop', { value: 12 })
    Object.defineProperty(target, 'offsetHeight', { value: 20 })

    const next = updateListIndicatorElement(indicator, target, createListIndicatorState())

    expect(indicator.classList.contains('visible')).toBe(true)
    expect(indicator.style.transform).toBe('translateY(12px)')
    expect(indicator.style.height).toBe('20px')
    expect(next.wasHidden).toBe(false)
  })

  it('hides and resets the indicator when target is null', () => {
    const indicator = document.createElement('div')
    indicator.classList.add('visible')
    indicator.style.transform = 'translateY(8px)'
    indicator.style.height = '16px'

    const next = updateListIndicatorElement(indicator, null, { wasHidden: false })

    expect(indicator.classList.contains('visible')).toBe(false)
    expect(indicator.style.transform).toBe('translateY(0px)')
    expect(indicator.style.height).toBe('0px')
    expect(next.wasHidden).toBe(true)
  })

  it('resetListIndicatorElement clears inline position styles', () => {
    const indicator = document.createElement('div')
    indicator.style.transform = 'translateY(40px)'
    indicator.style.height = '32px'

    resetListIndicatorElement(indicator)

    expect(indicator.style.transform).toBe('translateY(0px)')
    expect(indicator.style.height).toBe('0px')
  })
})
