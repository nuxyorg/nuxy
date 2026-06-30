import type { ShellAction } from '@nuxyorg/core'

const MODIFIER_SYMBOLS: Record<string, string> = {
  ctrl: '⌃',
  shift: '⇧',
  alt: '⌥',
  meta: '⌘',
}

type Modifier = NonNullable<ShellAction['modifiers']>[number]

export type PairedKeyAxis = 'vertical' | 'horizontal'

const AXIS_HINTS: Record<PairedKeyAxis, string> = {
  vertical: '↑↓',
  horizontal: '←→',
}

const AXIS_KEYS: Record<PairedKeyAxis, [string, string]> = {
  vertical: ['ArrowUp', 'ArrowDown'],
  horizontal: ['ArrowLeft', 'ArrowRight'],
}

export interface PairedKeyActionOptions {
  label: string
  hint?: string | string[]
  axis?: PairedKeyAxis
  modifiers?: Modifier[]
  activeOn?: () => boolean
  allowRepeat?: boolean
  id?: string
  negative: () => void
  positive: () => void
}

function defaultHint(axis: PairedKeyAxis, modifiers: Modifier[]): string | string[] {
  const modHints = modifiers.map((m) => MODIFIER_SYMBOLS[m] ?? m)
  const arrowHint = AXIS_HINTS[axis]
  return modHints.length ? [...modHints, arrowHint] : arrowHint
}

const DUAL_AXIS_HINT = '↑↓←→'

export interface DualAxisKeyActionOptions {
  label: string
  hint?: string | string[]
  activeOn?: () => boolean
  allowRepeat?: boolean
  id?: string
  up: () => void
  down: () => void
  left: () => void
  right: () => void
}

/**
 * Footer display group for 2D arrow navigation — a single entry showing all four
 * arrows (↑↓←→) rather than separate vertical/horizontal entries.
 */
export function dualAxisKeyAction(options: DualAxisKeyActionOptions): ShellAction {
  const id = options.id
  const child = (suffix: string, key: string, handler: () => void) => ({
    id: id ? `${id}-${suffix}` : undefined,
    key,
    label: '',
    allowRepeat: options.allowRepeat,
    handler,
  })

  return {
    id,
    label: options.label,
    hint: options.hint ?? DUAL_AXIS_HINT,
    activeOn: options.activeOn,
    children: [
      child('up', 'ArrowUp', options.up),
      child('down', 'ArrowDown', options.down),
      child('left', 'ArrowLeft', options.left),
      child('right', 'ArrowRight', options.right),
    ],
  }
}

/** Footer display group for paired arrow keys (non-clickable, keyboard via children). */
export function pairedKeyAction(options: PairedKeyActionOptions): ShellAction {
  const axis = options.axis ?? 'vertical'
  const modifiers = options.modifiers ?? []
  const [negKey, posKey] = AXIS_KEYS[axis]
  const id = options.id

  return {
    id,
    label: options.label,
    hint: options.hint ?? defaultHint(axis, modifiers),
    activeOn: options.activeOn,
    children: [
      {
        id: id ? `${id}-neg` : undefined,
        key: negKey,
        label: '',
        modifiers: modifiers.length ? modifiers : undefined,
        allowRepeat: options.allowRepeat,
        handler: options.negative,
      },
      {
        id: id ? `${id}-pos` : undefined,
        key: posKey,
        label: '',
        modifiers: modifiers.length ? modifiers : undefined,
        allowRepeat: options.allowRepeat,
        handler: options.positive,
      },
    ],
  }
}
