import { createStore } from '@nuxyorg/extension-sdk'
import { useToolKeyActions, type KeyAction } from './useToolKeyActions'
import { useTranslation } from './useTranslation'

export interface UseListNavigationOptions<T> {
  onEnter?: (item: T, index: number) => void
  enterLabel?: string
  enterHint?: string
  loop?: boolean
  extraActions?: KeyAction[]
}

export interface UseListNavigationResult<T> {
  selectedIndex: number
  setSelectedIndex: (index: number | ((prev: number) => number)) => void
  selectedItem: T | null
}

export function useListNavigation<T>(
  items: T[],
  options: UseListNavigationOptions<T> = {}
): UseListNavigationResult<T> {
  const { t } = useTranslation('com.nuxy.shell')

  const {
    onEnter,
    enterLabel = t('keyboard.select'),
    enterHint = 'Enter',
    loop = false,
    extraActions = [],
  } = options

  const store = createStore({ selectedIndex: -1, itemsLen: items.length })
  store.setState({ itemsLen: items.length })

  const getIndex = () => store.getState().selectedIndex

  const moveUp = () => {
    store.setState((s) => {
      const i = s.selectedIndex
      if (i <= 0) return { selectedIndex: loop ? items.length - 1 : -1 }
      return { selectedIndex: i - 1 }
    })
  }

  const moveDown = () => {
    store.setState((s) => {
      const i = s.selectedIndex
      if (i >= items.length - 1) return { selectedIndex: loop ? 0 : items.length - 1 }
      return { selectedIndex: i + 1 }
    })
  }

  const handleEnter = () => {
    const i = getIndex()
    if (onEnter && i >= 0 && i < items.length) onEnter(items[i], i)
  }

  useToolKeyActions([
    {
      key: 'ArrowUp',
      label: t('keyboard.navigate'),
      hint: '↑↓',
      handler: moveUp,
      allowRepeat: true,
    },
    { key: 'ArrowDown', label: '', handler: moveDown, allowRepeat: true },
    ...(onEnter
      ? [{ key: 'Enter', label: enterLabel, hint: enterHint, handler: handleEnter }]
      : []),
    ...extraActions,
  ])

  const idx = store.getState().selectedIndex
  return {
    selectedIndex: idx,
    setSelectedIndex: (v) => {
      store.setState({
        selectedIndex: typeof v === 'function' ? v(store.getState().selectedIndex) : v,
      })
    },
    selectedItem: idx >= 0 && idx < items.length ? items[idx] : null,
  }
}
