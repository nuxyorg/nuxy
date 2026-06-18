import type { KeyAction } from './useToolKeyActions'

export interface GridNavigationOptions {
  getActiveIndex: () => number
  setActiveIndex: (index: number | ((prev: number) => number)) => void
  getItemCount: () => number
  getCols: () => number
  /** When true, ArrowUp from the first row clears selection and shows the omnibar. */
  omnibarHandoff?: boolean
}

/** Keyboard actions for 2D grid navigation (↑↓ by row, ←→ by column). */
export function createGridKeyActions(options: GridNavigationOptions): KeyAction[] {
  const { getActiveIndex, setActiveIndex, getItemCount, getCols, omnibarHandoff } = options

  return [
    {
      key: 'ArrowUp',
      label: 'Navigate',
      hint: '↑↓',
      allowRepeat: true,
      handler: () => {
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
    },
    {
      key: 'ArrowDown',
      label: '',
      allowRepeat: true,
      handler: () => {
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
    },
    {
      key: 'ArrowLeft',
      label: 'Navigate',
      hint: '←→',
      allowRepeat: true,
      activeOn: () => getActiveIndex() >= 0,
      handler: () => {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
      },
    },
    {
      key: 'ArrowRight',
      label: '',
      allowRepeat: true,
      activeOn: () => getActiveIndex() >= 0,
      handler: () => {
        const total = getItemCount()
        setActiveIndex((prev) => (prev + 1 < total ? prev + 1 : prev))
      },
    },
  ]
}
