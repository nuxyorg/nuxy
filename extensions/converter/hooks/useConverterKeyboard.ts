const React = window.React

import type { ConversionResult } from '../types.ts'

interface Params {
  results: ConversionResult[]
  handleCopy: (item: ConversionResult) => void
  enterLabel: string
}

interface KeyboardResult {
  selectedIndex: number
  setSelectedIndex: (idx: number) => void
}

export function useConverterKeyboard({ results, handleCopy, enterLabel }: Params): KeyboardResult {
  const _useListNavigation =
    (window.UI || {}).useListNavigation ||
    (() => ({ selectedIndex: -1, setSelectedIndex: () => {} }))

  const { selectedIndex, setSelectedIndex } = _useListNavigation(results, {
    onEnter: (item: ConversionResult) => handleCopy(item),
    enterLabel,
    enterHint: '↵',
  })

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  return { selectedIndex, setSelectedIndex }
}
