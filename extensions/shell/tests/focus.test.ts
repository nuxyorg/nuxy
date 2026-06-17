// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  applyShellFocusPolicy,
  isCommandPaletteInput,
  isOmniBarInput,
  isVacantShellFocus,
  queryOmniBarInputFromDom,
  shouldShellOwnKeyboardFocus,
} from '../utils/focus.ts'

describe('shell focus policy', () => {
  let omniInput: HTMLInputElement
  let paletteInput: HTMLInputElement
  let otherInput: HTMLInputElement

  beforeEach(() => {
    omniInput = document.createElement('input')
    omniInput.className = 'nuxy-shell-omni-bar__input'
    paletteInput = document.createElement('input')
    paletteInput.className = 'nuxy-command-palette__input'
    otherInput = document.createElement('input')
    document.body.replaceChildren(omniInput, paletteInput, otherInput)
  })

  afterEach(() => {
    document.body.replaceChildren()
  })

  it('detects vacant focus on body and documentElement', () => {
    document.body.focus()
    expect(isVacantShellFocus(document.body)).toBe(true)
    expect(isVacantShellFocus(document.documentElement)).toBe(true)
    expect(isVacantShellFocus(null)).toBe(true)
  })

  it('detects omnibar and palette inputs', () => {
    expect(isOmniBarInput(omniInput)).toBe(true)
    expect(isCommandPaletteInput(paletteInput)).toBe(true)
  })

  it('focuses omnibar when focus is vacant and palette is closed', () => {
    document.body.focus()
    applyShellFocusPolicy({
      isCommandPaletteOpen: () => false,
      getOmniBarInput: () => omniInput,
      getCommandPaletteInput: () => paletteInput,
      isOmniBarEnabled: () => true,
    })
    expect(document.activeElement).toBe(omniInput)
  })

  it('focuses palette input when palette is open and focus is vacant', () => {
    document.body.focus()
    applyShellFocusPolicy({
      isCommandPaletteOpen: () => true,
      getOmniBarInput: () => omniInput,
      getCommandPaletteInput: () => paletteInput,
      isOmniBarEnabled: () => true,
    })
    expect(document.activeElement).toBe(paletteInput)
  })

  it('does not steal focus from another writing element', () => {
    otherInput.focus()
    applyShellFocusPolicy({
      isCommandPaletteOpen: () => false,
      getOmniBarInput: () => omniInput,
      getCommandPaletteInput: () => paletteInput,
      isOmniBarEnabled: () => true,
    })
    expect(document.activeElement).toBe(otherInput)
  })

  it('treats disconnected elements as vacant focus', () => {
    otherInput.focus()
    otherInput.remove()
    expect(isVacantShellFocus(otherInput)).toBe(true)
  })

  it('reclaims focus from a non-writing surface (e.g. select trigger)', () => {
    const trigger = document.createElement('button')
    trigger.className = 'nuxy-select-box__trigger'
    document.body.appendChild(trigger)
    trigger.focus()
    applyShellFocusPolicy({
      isCommandPaletteOpen: () => false,
      getOmniBarInput: () => omniInput,
      getCommandPaletteInput: () => paletteInput,
      isOmniBarEnabled: () => true,
    })
    expect(document.activeElement).toBe(omniInput)
    trigger.remove()
  })

  it('shouldShellOwnKeyboardFocus leaves connected writing elements alone', () => {
    otherInput.focus()
    expect(shouldShellOwnKeyboardFocus(otherInput)).toBe(false)
    expect(shouldShellOwnKeyboardFocus(document.body)).toBe(true)
  })

  it('queryOmniBarInputFromDom finds input inside shell shadow tree', () => {
    const view = document.createElement('nuxy-shell-view')
    const omniBarEl = document.createElement('nuxy-shell-omni-bar')
    const domInput = document.createElement('input')
    domInput.className = 'nuxy-shell-omni-bar__input'
    omniBarEl.attachShadow({ mode: 'open' }).appendChild(domInput)
    view.attachShadow({ mode: 'open' }).appendChild(omniBarEl)
    document.body.appendChild(view)

    expect(queryOmniBarInputFromDom()).toBe(domInput)
    view.remove()
  })

  it('does not focus omnibar when it is disabled', () => {
    omniInput.disabled = true
    document.body.focus()
    applyShellFocusPolicy({
      isCommandPaletteOpen: () => false,
      getOmniBarInput: () => omniInput,
      getCommandPaletteInput: () => paletteInput,
      isOmniBarEnabled: () => true,
    })
    expect(document.activeElement).toBe(document.body)
  })
})
