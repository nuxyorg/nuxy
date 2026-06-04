const React = window.React

import type { Snippet } from './types.ts'
import { timeAgo } from './utils/format.ts'
import { useSnippetsData } from './hooks/useSnippetsData.ts'
import { useSnippetsActions } from './hooks/useSnippetsActions.ts'
import { useSnippetsKeyboard } from './hooks/useSnippetsKeyboard.ts'

const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

const EXT_ID = 'com.nuxy.snippets'

interface Props {
  query: string
}

export default function SnippetsView({ query }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState } = window.UI || {}
  const { t, dir } = _useTranslation(EXT_ID)

  const { snippets, setSnippets, loadSnippets } = useSnippetsData(query)

  // Stable action refs allow the keyboard hook to reference actions without creating
  // a circular dependency — refs are updated each render via useLayoutEffect.
  const handleCopyRef = React.useRef<(item: Snippet) => void>(() => {})
  const handleSaveClipboardRef = React.useRef<() => void>(() => {})
  const handleDeleteRef = React.useRef<() => void>(() => {})

  const { selectedIndex, setSelectedIndex } = useSnippetsKeyboard({
    snippets,
    handleCopy: (item) => handleCopyRef.current(item),
    handleSaveClipboard: () => handleSaveClipboardRef.current(),
    handleDelete: () => handleDeleteRef.current(),
    t,
  })

  const { copiedId, handleCopy, handleSaveClipboard, handleDelete } = useSnippetsActions({
    snippets,
    selectedIndex,
    setSnippets,
    setSelectedIndex,
    query,
    loadSnippets,
  })

  React.useLayoutEffect(() => {
    handleCopyRef.current = handleCopy
    handleSaveClipboardRef.current = handleSaveClipboard
    handleDeleteRef.current = handleDelete
  })

  return (
    <div style={{ direction: dir, height: '100%', overflowY: 'auto' }}>
      {snippets.length === 0
        ? EmptyState && (
            <EmptyState
              message={Boolean(query) ? t('noResults') : t('empty')}
              hint={Boolean(query) ? t('noResultsHint') : t('emptyHint')}
            />
          )
        : List && (
            <List>
              {snippets.map((snippet: Snippet, idx: number) => {
                const isCopied = copiedId === snippet.id
                const isActive = idx === selectedIndex
                const meta = [
                  snippet.tags.length > 0 ? snippet.tags.join(', ') : null,
                  timeAgo(snippet.updatedAt),
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <ListItem
                    key={snippet.id}
                    active={isActive}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    <ListItemBody>
                      <ListItemText variant={isCopied ? 'success' : 'default'}>
                        {isCopied ? t('copied') : snippet.title}
                      </ListItemText>
                      <ListItemMeta>{meta}</ListItemMeta>
                    </ListItemBody>
                  </ListItem>
                )
              })}
            </List>
          )}
    </div>
  )
}
