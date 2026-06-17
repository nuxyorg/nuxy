// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FocusController } from '../controllers/focus-controller.ts'

describe('FocusController', () => {
  let omniInput: HTMLInputElement
  let paletteInput: HTMLInputElement
  let otherInput: HTMLInputElement

  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    omniInput = document.createElement('input')
    omniInput.className = 'nuxy-shell-omni-bar__input'
    paletteInput = document.createElement('input')
    paletteInput.className = 'nuxy-command-palette__input'
    otherInput = document.createElement('input')
    document.body.replaceChildren(omniInput, paletteInput, otherInput)
  })

  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
  })

  it('regains omnibar focus after blur when nothing else is focused', () => {
    const controller = new FocusController({
      isCommandPaletteOpen: () => false,
      getOmniBarInput: () => omniInput,
      getCommandPaletteInput: () => paletteInput,
      isOmniBarEnabled: () => true,
    })
    controller.bind()
    controller.bindOmniInput(omniInput)

    omniInput.focus()
    omniInput.blur()
    document.body.focus()

    expect(document.activeElement).toBe(omniInput)
  })

  it('does not reclaim omnibar focus when blur moves to another writing element', () => {
    const controller = new FocusController({
      isCommandPaletteOpen: () => false,
      getOmniBarInput: () => omniInput,
      getCommandPaletteInput: () => paletteInput,
      isOmniBarEnabled: () => true,
    })
    controller.bind()
    controller.bindOmniInput(omniInput)

    omniInput.focus()
    omniInput.blur()
    otherInput.focus()

    expect(document.activeElement).toBe(otherInput)
  })
})
