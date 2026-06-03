const React = window.React

const EXT_ID = 'com.nuxy.color'

import type { SavedColor } from './types.ts'
import { useColorHistory } from './hooks/useColorHistory.ts'
import { useColorActions } from './hooks/useColorActions.ts'
import { useColorKeyboard } from './hooks/useColorKeyboard.ts'
import { ColorPreview } from './components/ColorPreview.tsx'

const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (k: string) => k, dir: 'ltr' as const }))

interface Props {
  query: string
}

export default function ColorView({ query }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, TwoPanel } =
    window.UI || {}

  const { t, dir } = _useTranslation(EXT_ID)

  const { items, setItems } = useColorHistory()
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const [currentColor, setCurrentColor] = React.useState<SavedColor | null>(null)
  const [copyFormat, setCopyFormat] = React.useState('hex')

  React.useEffect(() => {
    window.core.ipc
      .invoke(EXT_ID, 'getCopyFormat')
      .then((res) => {
        const r = res as { success: boolean; data?: string } | null
        if (r?.success && r.data) setCopyFormat(r.data)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    setSelectedIndex(-1)
    if (!query.trim()) {
      setCurrentColor(null)
      return
    }
    window.core.ipc
      .invoke(EXT_ID, 'parseColor', { input: query })
      .then((res) => {
        const r = res as { success: boolean; data?: SavedColor | null } | null
        setCurrentColor(r?.success ? (r.data ?? null) : null)
      })
      .catch(() => setCurrentColor(null))
  }, [query])

  const { handleSave, handleDelete, handleCopy } = useColorActions({ setItems })

  const getFormatted = React.useCallback(
    (color: SavedColor): string => {
      if (copyFormat === 'rgb') return color.rgb
      if (copyFormat === 'hsl') return color.hsl
      return color.hex
    },
    [copyFormat]
  )

  useColorKeyboard({
    items,
    selectedIndex,
    setSelectedIndex,
    currentColor,
    handlers: { handleSave, handleDelete, handleCopy },
    getFormatted,
  })

  const activeColor = selectedIndex >= 0 ? items[selectedIndex] : currentColor

  const leftPanel = List ? (
    <List>
      {items.length === 0 ? (
        EmptyState ? (
          <EmptyState message={t('empty.history')} hint={t('empty.history.hint')} />
        ) : null
      ) : (
        items.map((item, idx) => (
          <ListItem key={item.id} active={idx === selectedIndex} onClick={() => setSelectedIndex(idx)}>
            <ListItemBody>
              <div
                style={{
                  width: 'var(--space-4)',
                  height: 'var(--space-4)',
                  borderRadius: 'var(--radius-1)',
                  backgroundColor: item.hex,
                  flexShrink: 0,
                  marginInlineEnd: 'var(--space-2)',
                }}
              />
              <ListItemText>{item.hex}</ListItemText>
              <ListItemMeta>{item.rgb}</ListItemMeta>
            </ListItemBody>
          </ListItem>
        ))
      )}
    </List>
  ) : null

  const rightPanel = activeColor ? (
    <ColorPreview color={activeColor} t={t} />
  ) : EmptyState ? (
    <EmptyState message={t('empty.hint')} />
  ) : null

  return (
    <div style={{ direction: dir, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {TwoPanel ? (
        <TwoPanel left={leftPanel} right={rightPanel} style={{ flex: 1, minHeight: 0 }} />
      ) : (
        <div style={{ display: 'flex', width: '100%', flex: 1, minHeight: 0 }}>
          <div
            style={{
              flex: '1 1 50%',
              minWidth: 0,
              overflowY: 'auto',
              borderInlineEnd: 'var(--space-px) solid var(--color-border)',
            }}
          >
            {leftPanel}
          </div>
          <div style={{ flex: '1 1 50%', overflowY: 'auto' }}>{rightPanel}</div>
        </div>
      )}
    </div>
  )
}
