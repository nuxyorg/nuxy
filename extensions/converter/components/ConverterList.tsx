const React = window.React

import type { ConversionResult } from '../types.ts'

interface Props {
  results: ConversionResult[]
  selectedIndex: number
  copiedId: string | null
  copiedLabel: string
  onSelect: (idx: number) => void
}

export function ConverterList({ results, selectedIndex, copiedId, copiedLabel, onSelect }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta } = window.UI || {}

  if (!List) return null

  return (
    <List>
      {results.map((r, idx) => {
        const isCopied = copiedId === r.id
        const isActive = idx === selectedIndex
        const displayText = isCopied ? copiedLabel : r.formattedResult
        return (
          ListItem && (
            <ListItem key={r.id} active={isActive} onClick={() => onSelect(idx)}>
              {ListItemBody && (
                <ListItemBody>
                  {ListItemText && (
                    <ListItemText variant={isCopied ? 'success' : 'default'}>
                      {displayText}
                    </ListItemText>
                  )}
                  {ListItemMeta && (
                    <ListItemMeta>
                      {r.fromValue} {r.fromSymbol} → {r.toSymbol}
                    </ListItemMeta>
                  )}
                </ListItemBody>
              )}
            </ListItem>
          )
        )
      })}
    </List>
  )
}
