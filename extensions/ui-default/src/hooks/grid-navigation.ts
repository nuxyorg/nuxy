import type { KeyAction } from './useToolKeyActions'
import { dualAxisKeyAction } from './paired-key-action'

export interface GridNavigationOptions {
  getActiveIndex: () => number
  setActiveIndex: (index: number | ((prev: number) => number)) => void
  getItemCount: () => number
  getCols: () => number
  /** When true, ArrowUp from the first row clears selection and shows the omnibar. */
  omnibarHandoff?: boolean
}

/** Keyboard actions for 2D grid navigation (↑↓ by row, ←→ by column) as one footer entry. */
export function createGridKeyActions(options: GridNavigationOptions): KeyAction[] {
  const { setActiveIndex, getItemCount, getCols, omnibarHandoff } = options

  return [
    dualAxisKeyAction({
      label: 'Navigate',
      allowRepeat: true,
      up: () => {
        setActiveIndex((prev) => {
          if (prev === -1) return -1
          const cols = getCols()
          const next = prev - cols
          if (next < 0) {
            if (omnibarHandoff) window.core?.shell?.controlOmniBar('show')
            return -1
          }
          return next
        })
      },
      down: () => {
        const total = getItemCount()
        setActiveIndex((prev) => {
          if (prev === -1) {
            if (omnibarHandoff) window.core?.shell?.controlOmniBar('hide')
            return total > 0 ? 0 : -1
          }
          const cols = getCols()
          const next = prev + cols
          return next < total ? next : prev
        })
      },
      left: () => {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
      },
      right: () => {
        const total = getItemCount()
        // Stay inert until a cell is selected (mirrors the old horizontal activeOn guard).
        setActiveIndex((prev) => (prev >= 0 && prev + 1 < total ? prev + 1 : prev))
      },
    }),
  ]
}
