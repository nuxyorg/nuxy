const React = window.React

import type { Snippet } from '../types.ts'

import { _useListNavigation, _useToolKeyActions } from '../../ui-hooks.ts'

interface Params {
  snippets: Snippet[]
  handleCopy: (item: Snippet) => void
  handleSaveClipboard: () => void
  handleDelete: () => void
  t: (key: string) => string
}

interface KeyboardResult {
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
}

export function useSnippetsKeyboard({
  snippets,
  handleCopy,
  handleSaveClipboard,
  handleDelete,
  t,
}: Params): KeyboardResult {
  const { selectedIndex, setSelectedIndex } = _useListNavigation(snippets, {
    onEnter: (item: Snippet) => handleCopy(item),
    enterLabel: t('actions.copy'),
    enterHint: '↵',
  })

  _useToolKeyActions([
    {
      key: 'Enter',
      label: t('actions.copy'),
      hint: '↵',
      activeOn: () => selectedIndex >= 0,
      handler: () => {
        const item = snippets[selectedIndex]
        if (item) handleCopy(item)
      },
    },
    {
      key: 'n',
      label: t('actions.saveClipboard'),
      hint: 'N',
      handler: handleSaveClipboard,
    },
    {
      key: 'd',
      label: t('actions.delete'),
      hint: 'D',
      activeOn: () => selectedIndex >= 0,
      handler: handleDelete,
    },
  ])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  return { selectedIndex, setSelectedIndex }
}
