const React = window.React

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

  const [regexMode, setRegexMode] = React.useState<boolean>(false)

  const { items, status, setStatus } = useAngrysearchData(query, regexMode)
  const { handleOpen, handleOpenLocation, triggerUpdate } = useAngrysearchActions({ setStatus })

  const { selectedIndex } = useAngrysearchKeyboard({
    items,
    handleOpen,
    handleOpenLocation,
    triggerUpdate,
    setRegexMode,
  })

  useAngrysearchSync({ regexMode, status })

  return (
    <List>
      {items.length === 0 ? (
        <EmptyState
          message={query.length < 3 ? 'Type to search...' : 'No matches.'}
          hint={query.length < 3 ? 'Enter at least 3 characters.' : 'Try a different search.'}
        />
      ) : (
        items.map((item: AngrysearchItem, idx: number) => (
          <AngrysearchListItem key={item.id} item={item} isActive={idx === selectedIndex} />
        ))
      )}
    </List>
  )
}
