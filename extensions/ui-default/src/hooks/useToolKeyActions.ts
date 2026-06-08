export interface KeyAction {
  key: string
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  label: string
  hint?: string | string[]
  activeOn?: () => boolean
  handler: () => void
  allowRepeat?: boolean
  trigger?: 'press' | 'hold'
  holdMs?: number
}

const actionsRef: { current: KeyAction[] } = { current: [] }

export function useToolKeyActions(actions: KeyAction[]): void {
  actionsRef.current = actions
  window.core?.shell?.registerKeyActions(() => actionsRef.current)
  window.core?.shell?.refreshKeyHints()
}

export function unregisterToolKeyActions(): void {
  actionsRef.current = []
  window.core?.shell?.registerKeyActions(null)
}
