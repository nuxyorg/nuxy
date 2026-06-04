const React = window.React

const EXT_ID = 'com.nuxy.angrysearch'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import type { AngrysearchItem } from './types.ts'
import { useAngrysearchData } from './hooks/useAngrysearchData.ts'
import { useAngrysearchActions } from './hooks/useAngrysearchActions.ts'
import { useAngrysearchKeyboard } from './hooks/useAngrysearchKeyboard.ts'
import { useAngrysearchSync } from './hooks/useAngrysearchSync.tsx'
import { AngrysearchListItem } from './components/AngrysearchItem.tsx'

interface Props {
  query: string
}

export default function AngrysearchView({ query }: Props) {
  const { List, EmptyState } = window.UI || {}
  const { t } = _useTranslation(EXT_ID)

  const [regexMode, setRegexMode] = React.useState<boolean>(false)

  const { items, status, setStatus } = useAngrysearchData(query, regexMode)
  const { handleOpen, handleOpenLocation, triggerUpdate } = useAngrysearchActions({ setStatus })

  const { selectedIndex } = useAngrysearchKeyboard({
    items,
    handleOpen,
    handleOpenLocation,
    triggerUpdate,
    setRegexMode,
    t,
  })

  useAngrysearchSync({ regexMode, status, t })

  return (
    <List>
      {items.length === 0 ? (
        <EmptyState
          message={query.length < 3 ? t('empty.typeToSearch') : t('empty.noMatches')}
          hint={query.length < 3 ? t('empty.typeHint') : t('empty.noMatchesHint')}
        />
      ) : (
        items.map((item: AngrysearchItem, idx: number) => (
          <AngrysearchListItem key={item.id} item={item} isActive={idx === selectedIndex} />
        ))
      )}
    </List>
  )
}
