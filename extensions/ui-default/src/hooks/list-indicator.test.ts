// @vitest-environment happy-dom

import { describe, it, expect, afterEach } from 'vitest'
import {
  computeListIndicatorPosition,
  computeGridIndicatorPosition,
  createListIndicatorState,
  listIndicatorStyleForTarget,
  resolveActiveItem,
  resolveGridIndicatorTarget,
  resetListIndicatorElement,
  resetGridIndicatorElement,
  updateListIndicatorElement,
  updateGridIndicatorElement,
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

describe('grid indicator', () => {
  it('computes transform, width and height from offsetLeft/offsetTop/offsetWidth/offsetHeight', () => {
    const target = document.createElement('div')
    Object.defineProperty(target, 'offsetLeft', { value: 80 })
    Object.defineProperty(target, 'offsetTop', { value: 24 })
    Object.defineProperty(target, 'offsetWidth', { value: 40 })
    Object.defineProperty(target, 'offsetHeight', { value: 38 })

    expect(computeGridIndicatorPosition(target)).toEqual({
      transform: 'translate(80px, 24px)',
      width: '40px',
      height: '38px',
    })
  })

  it('shows and positions the indicator element on both axes', () => {
    const indicator = document.createElement('div')
    const target = document.createElement('div')
    Object.defineProperty(target, 'offsetLeft', { value: 40 })
    Object.defineProperty(target, 'offsetTop', { value: 12 })
    Object.defineProperty(target, 'offsetWidth', { value: 40 })
    Object.defineProperty(target, 'offsetHeight', { value: 20 })

    const next = updateGridIndicatorElement(indicator, target, createListIndicatorState())

    expect(indicator.classList.contains('visible')).toBe(true)
    expect(indicator.style.transform).toBe('translate(40px, 12px)')
    expect(indicator.style.width).toBe('40px')
    expect(indicator.style.height).toBe('20px')
    expect(next.wasHidden).toBe(false)
  })

  it('hides and resets the indicator when target is null', () => {
    const indicator = document.createElement('div')
    indicator.classList.add('visible')
    indicator.style.transform = 'translate(8px, 8px)'
    indicator.style.width = '16px'
    indicator.style.height = '16px'

    const next = updateGridIndicatorElement(indicator, null, { wasHidden: false })

    expect(indicator.classList.contains('visible')).toBe(false)
    expect(indicator.style.transform).toBe('translate(0px, 0px)')
    expect(indicator.style.width).toBe('0px')
    expect(indicator.style.height).toBe('0px')
    expect(next.wasHidden).toBe(true)
  })

  it('resetGridIndicatorElement clears inline position styles', () => {
    const indicator = document.createElement('div')
    indicator.style.transform = 'translate(40px, 40px)'
    indicator.style.width = '32px'
    indicator.style.height = '32px'

    resetGridIndicatorElement(indicator)

    expect(indicator.style.transform).toBe('translate(0px, 0px)')
    expect(indicator.style.width).toBe('0px')
    expect(indicator.style.height).toBe('0px')
  })

  it('resolveGridIndicatorTarget returns the inner button for nuxy-grid-item hosts', () => {
    const host = document.createElement('nuxy-grid-item')
    const shadow = host.attachShadow({ mode: 'open' })
    const btn = document.createElement('button')
    btn.className = 'nuxy-grid-item'
    Object.defineProperty(btn, 'offsetWidth', { value: 72 })
    shadow.appendChild(btn)

    expect(resolveGridIndicatorTarget(host)).toBe(btn)
  })
})
