const React = window.React
const { useEffect } = React

import type { KeyAction } from '../types.ts'

function matchesAction(action: KeyAction, e: KeyboardEvent): boolean {
  if (action.key.toLowerCase() !== e.key.toLowerCase()) return false
  const mods = action.modifiers || []
  if (mods.includes('ctrl') !== e.ctrlKey) return false
  if (mods.includes('shift') !== e.shiftKey) return false
  if (mods.includes('alt') !== e.altKey) return false
  if (mods.includes('meta') !== e.metaKey) return false
  return true
}

export function useKeyboard({
  activeTool,
  showCommandPalette,
  setShowCommandPalette,
  inputRef,
  setActiveTool,
  setToolComponent,
  setQuery,
  setSavedQuery,
  setSelectedIndex,
  setShowOmniBar,
  keyActionsGetterRef,
  toolActionsRef,
}: {
  activeTool: string | null
  showCommandPalette: boolean
  setShowCommandPalette: React.Dispatch<React.SetStateAction<boolean>>
  inputRef: React.RefObject<HTMLInputElement | null>
  setActiveTool: (tool: string | null) => void
  setToolComponent: (
    component: React.ComponentType<{ query: string; extensionId?: string }> | null
  ) => void
  setQuery: (query: string) => void
  setSavedQuery: (query: string) => void
  setSelectedIndex: (index: number) => void
  setShowOmniBar: (show: boolean) => void
  keyActionsGetterRef: React.MutableRefObject<(() => KeyAction[]) | null>
  toolActionsRef: React.MutableRefObject<KeyAction[]>
}): void {
  useEffect(() => {
    let holdTimer: ReturnType<typeof setTimeout> | null = null
    let holdOverlay: HTMLElement | null = null

    const clearHold = () => {
      if (holdTimer !== null) {
        clearTimeout(holdTimer)
        holdTimer = null
      }
      if (holdOverlay) {
        holdOverlay.remove()
        holdOverlay = null
      }
    }

    const startHold = (action: KeyAction, e: KeyboardEvent) => {
      if (holdTimer !== null) return
      const ms = action.holdMs ?? 600
      const omniBar = document.querySelector('.nuxy-shell-omni-bar')
      if (omniBar) {
        holdOverlay = document.createElement('div')
        holdOverlay.className = 'nuxy-hold-progress'
        const bar = document.createElement('div')
        bar.className = 'nuxy-hold-progress__bar'
        bar.style.setProperty('--nuxy-hold-ms', `${ms}ms`)
        holdOverlay.appendChild(bar)
        omniBar.appendChild(holdOverlay)
      }
      holdTimer = setTimeout(() => {
        holdTimer = null
        clearHold()
        action.handler()
        e.preventDefault()
      }, ms)
    }

    const deactivateTool = () => {
      clearHold()
      setActiveTool(null)
      setToolComponent(null)
      setQuery('')
      setSavedQuery('')
      setSelectedIndex(0)
      setShowOmniBar(true)
      setTimeout(() => inputRef.current?.focus(), 50)
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (toolActionsRef?.current?.length > 0) {
          setShowCommandPalette((prev) => !prev)
        }
        return
      }

      if (e.key === 'Escape') {
        if (showCommandPalette) {
          setShowCommandPalette(false)
          setTimeout(() => inputRef.current?.focus(), 50)
          return
        }
        if (activeTool) {
          const actions = keyActionsGetterRef?.current?.()
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
          deactivateTool()
        } else {
          clearHold()
          setQuery('')
          setSavedQuery('')
          setSelectedIndex(-1)
          window.core?.window?.esc?.()
        }
        return
      }

      if (showCommandPalette) return

      if (activeTool) {
        const target = e.target as HTMLElement
        const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
        const isOmniBar = target?.classList?.contains('nuxy-shell-omni-bar__input')
        const actions = keyActionsGetterRef?.current?.()
        if (actions && actions.length > 0) {
          const matched = actions.find((a) => {
            if (!matchesAction(a, e)) return false
            if (e.repeat && !a.allowRepeat) return false
            if (isInput) {
              if (isOmniBar) {
                if (!a.modifiers?.length && a.key.length === 1) return false
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
        if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
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
        const actions = keyActionsGetterRef?.current?.()
        const held = actions?.find((a) => a.trigger === 'hold' && matchesAction(a, e))
        if (held) clearHold()
      }
    }

    window.addEventListener('keydown', handleGlobalKeyDown)
    window.addEventListener('keyup', handleGlobalKeyUp)
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown)
      window.removeEventListener('keyup', handleGlobalKeyUp)
      clearHold()
    }
  }, [activeTool, showCommandPalette])
}
