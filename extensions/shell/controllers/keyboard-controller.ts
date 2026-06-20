import type { ShellAction } from '@nuxyorg/core'
import type { HoldProgress } from '../types.ts'
import { isWritingElement } from '../utils/keyboard.ts'

export interface KeyboardControllerCallbacks {
  /** True when the command palette is currently open */
  isCommandPaletteOpen: () => boolean
  /** True when a tool is currently active */
  isToolActive: () => boolean
  toggleCommandPalette: () => void
  closeCommandPalette: () => void
  returnToShell: () => void
  clearQueryAndEsc: () => void
  setHoldProgress: (progress: HoldProgress | null) => void
  getHoldMs: () => number
  hasCommandPaletteActions: () => boolean
  /** True when the active tool declares settings (`entry.settings`). */
  hasActiveToolSettings: () => boolean
  /** Opens the active tool's settings panel (Ctrl+.). */
  openActiveToolSettings: () => void
}

export class KeyboardController {
  private cleanups: Array<() => void> = []

  constructor(private readonly callbacks: KeyboardControllerCallbacks) {}

  bind(): void {
    let holdTimer: ReturnType<typeof setTimeout> | null = null
    let holdCancelToastId: string | null = null

    const clearHold = () => {
      if (holdTimer !== null) {
        clearTimeout(holdTimer)
        holdTimer = null
      }
      this.callbacks.setHoldProgress(null)
    }

    const matchesAction = (action: ShellAction, e: KeyboardEvent): boolean => {
      if (!action.key) return false
      if (action.key.toLowerCase() !== e.key.toLowerCase()) return false
      const mods = action.modifiers || []
      if (mods.includes('ctrl') !== e.ctrlKey) return false
      if (mods.includes('shift') !== e.shiftKey) return false
      if (mods.includes('alt') !== e.altKey) return false
      if (mods.includes('meta') !== e.metaKey) return false
      return true
    }

    const startHold = (action: ShellAction, e: KeyboardEvent) => {
      if (holdTimer !== null) return
      if (holdCancelToastId !== null) {
        window.UI?.toastStore?.remove?.(holdCancelToastId)
        holdCancelToastId = null
      }
      const ms = this.callbacks.getHoldMs()
      this.callbacks.setHoldProgress({ ms, hint: action.hint ?? action.key ?? '' })
      holdTimer = setTimeout(() => {
        holdTimer = null
        clearHold()
        action.handler()
        e.preventDefault()
      }, ms)
    }

    const deactivateTool = () => {
      clearHold()
      this.callbacks.returnToShell()
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isToolActive = this.callbacks.isToolActive()
      const showCommandPalette = this.callbacks.isCommandPaletteOpen()

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
        e.preventDefault()
        window.core?.window?.quit()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (this.callbacks.hasCommandPaletteActions()) {
          this.callbacks.toggleCommandPalette()
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        if (this.callbacks.hasActiveToolSettings()) {
          e.preventDefault()
          this.callbacks.openActiveToolSettings()
        }
        return
      }

      if (e.key === 'Escape') {
        if (showCommandPalette) {
          this.callbacks.closeCommandPalette()
          return
        }
        if (isToolActive) {
          const actions = window.core?.shell?.getShellActionsGetter()?.()
          if (actions && actions.length > 0) {
            const matched = actions.find((a) => {
              if (!matchesAction(a, e)) return false
              if (typeof a.activeOn === 'function' && !a.activeOn()) return false
              return true
            })
            if (matched) {
              if (matched.trigger === 'hold') {
                if (!e.repeat) startHold(matched, e)
                e.preventDefault()
              } else {
                matched.handler()
                e.preventDefault()
              }
              return
            }
          }
          if (!e.repeat) deactivateTool()
        } else {
          clearHold()
          this.callbacks.clearQueryAndEsc()
        }
        return
      }

      if (showCommandPalette) return

      if (isToolActive) {
        const target = (e.composedPath?.()[0] || e.target) as HTMLElement
        const isInput = isWritingElement(target)
        const isOmniBar = target?.classList?.contains('nuxy-shell-omni-bar__input')
        const actions = window.core?.shell?.getShellActionsGetter()?.()
        if (actions && actions.length > 0) {
          const matched = actions.find((a) => {
            if (!matchesAction(a, e)) return false
            if (e.repeat && !a.allowRepeat) return false
            if (isInput) {
              if (isOmniBar) {
                const key = a.key!
                const isSpace = key === ' ' || key.toLowerCase() === 'space'
                if (!a.modifiers?.length && key.length === 1 && !isSpace) return false
              } else {
                if (!a.modifiers?.length) return false
              }
            }
            if (typeof a.activeOn === 'function' && !a.activeOn()) return false
            return true
          })
          if (matched) {
            if (matched.trigger === 'hold') {
              if (!e.repeat) startHold(matched, e)
              e.preventDefault()
              return
            }
            matched.handler()
            e.preventDefault()
            return
          }
        }
        if (!isInput) {
          window.dispatchEvent(
            new CustomEvent('nuxy-shell-omni-bar-keydown', {
              detail: {
                key: e.key,
                code: e.code,
                shiftKey: e.shiftKey,
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey,
              },
            })
          )
          if (
            ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Space'].includes(e.key)
          ) {
            e.preventDefault()
          }
        }
      }
    }

    const handleGlobalKeyUp = (e: KeyboardEvent) => {
      if (holdTimer !== null) {
        const actions = window.core?.shell?.getShellActionsGetter()?.()
        const held = actions?.find((a) => a.trigger === 'hold' && matchesAction(a, e))
        if (held) {
          if (held.holdCancelToast) {
            holdCancelToastId =
              window.UI?.toast?.(held.holdCancelToast, { type: 'warning' }) ?? null
          }
          clearHold()
        }
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    window.addEventListener('keyup', handleGlobalKeyUp)
    this.cleanups.push(() => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      window.removeEventListener('keyup', handleGlobalKeyUp)
      clearHold()
    })
  }

  destroy(): void {
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
  }
}
