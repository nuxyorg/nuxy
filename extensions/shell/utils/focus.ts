import { getDeepActiveElement, isWritingElement } from './keyboard.ts'

/** True when nothing meaningful owns keyboard focus. */
export function isVacantShellFocus(active: Element | null): boolean {
  if (!active) return true
  if (!active.isConnected) return true
  return active === document.body || active === document.documentElement
}

export function isOmniBarInput(el: Element | null): boolean {
  return el?.classList.contains('nuxy-shell-omni-bar__input') ?? false
}

export function isCommandPaletteInput(el: Element | null): boolean {
  return el?.classList.contains('nuxy-command-palette__input') ?? false
}

/**
 * Whether shell should move focus to omnibar (or palette when open).
 * Reclaims focus from detached controls, document root, and non-writing surfaces
 * (e.g. select triggers after overlay close). Leaves connected tool text fields alone.
 */
export function shouldShellOwnKeyboardFocus(active: Element | null): boolean {
  if (isVacantShellFocus(active)) return true
  if (isOmniBarInput(active) || isCommandPaletteInput(active)) return false
  if (active instanceof HTMLElement && active.isConnected && isWritingElement(active)) {
    return false
  }
  return true
}

export interface ShellFocusPolicy {
  isCommandPaletteOpen: () => boolean
  getOmniBarInput: () => HTMLInputElement | null
  getCommandPaletteInput: () => HTMLInputElement | null
  isOmniBarEnabled: () => boolean
}

export function queryOmniBarInputFromDom(): HTMLInputElement | null {
  const view = document.querySelector('nuxy-shell-view')
  const omniBar = view?.shadowRoot?.querySelector('nuxy-shell-omni-bar')
  return omniBar?.shadowRoot?.querySelector<HTMLInputElement>('.nuxy-shell-omni-bar__input') ?? null
}

function queryPaletteInputFromDom(): HTMLInputElement | null {
  const view = document.querySelector('nuxy-shell-view')
  const palette = view?.shadowRoot?.querySelector('nuxy-command-palette')
  return (
    palette?.shadowRoot?.querySelector<HTMLInputElement>('.nuxy-command-palette__input') ?? null
  )
}

function resolveOmniBarInput(
  policy: ShellFocusPolicy,
  active: Element | null
): HTMLInputElement | null {
  const fromRef = policy.getOmniBarInput()
  if (fromRef?.isConnected) return fromRef
  if (active instanceof HTMLInputElement && isOmniBarInput(active)) return active
  return queryOmniBarInputFromDom() ?? fromRef
}

function resolvePaletteInput(policy: ShellFocusPolicy): HTMLInputElement | null {
  const fromRef = policy.getCommandPaletteInput()
  if (fromRef?.isConnected) return fromRef
  return queryPaletteInputFromDom() ?? fromRef
}

/** Focus omnibar when nothing owns focus; focus palette input when the palette is open. */
export function applyShellFocusPolicy(policy: ShellFocusPolicy): void {
  const active = getDeepActiveElement()

  if (policy.isCommandPaletteOpen()) {
    const paletteInput = resolvePaletteInput(policy)
    if (paletteInput && (isVacantShellFocus(active) || !isCommandPaletteInput(active))) {
      paletteInput.focus()
    }
    return
  }

  if (!policy.isOmniBarEnabled()) return

  const omniInput = resolveOmniBarInput(policy, active)
  if (!omniInput || omniInput.disabled) return

  if (shouldShellOwnKeyboardFocus(active)) {
    omniInput.focus()
  }
}
