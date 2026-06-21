import type { ShellAction } from '@nuxyorg/core'

const MODIFIER_SYMBOLS: Record<string, string> = {
  ctrl: '⌃',
  shift: '⇧',
  alt: '⌥',
  meta: '⌘',
}

const KEY_SYMBOLS: Record<string, string> = {
  Enter: '↵',
  Escape: 'Esc',
  Delete: 'Del',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ' ': 'Space',
}

function formatKey(key: string): string {
  return KEY_SYMBOLS[key] ?? (key.length === 1 ? key.toUpperCase() : key)
}

/**
 * Display chips for a Ctrl+K palette row. Menu-only actions (no footer
 * `hint`) still carry a real `key`/`modifiers` binding — this derives the
 * same kind of chip the footer would show, so every palette item displays
 * its actual shortcut instead of a generic one.
 */
export function formatShortcut(action: ShellAction): string[] | null {
  if (action.hint) return Array.isArray(action.hint) ? action.hint : [action.hint]
  if (!action.key) return null
  const mods = (action.modifiers ?? []).map((m) => MODIFIER_SYMBOLS[m] ?? m)
  return [...mods, formatKey(action.key)]
}
