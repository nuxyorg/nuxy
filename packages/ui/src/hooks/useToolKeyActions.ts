
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

export function useToolKeyActions(...args: unknown[]): void {
  ;(window.UI as { useToolKeyActions?: (...a: unknown[]) => void })?.useToolKeyActions?.(...args)
}
