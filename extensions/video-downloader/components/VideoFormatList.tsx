const React = window.React

import type { VideoFormat } from '../types.ts'
import { fmtSize, getFormatBadge } from '../utils/format.ts'

interface Props {
  formats: VideoFormat[]
  selectedIndex: number
  focusArea: string
}

export function VideoFormatList({ formats, selectedIndex, focusArea }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, Badge, Text } =
    window.UI || {}

  if (!(List as unknown) || !(Text as unknown)) return null

  if (formats.length === 0) {
    return EmptyState ? <EmptyState message="No matching formats for this category." /> : null
  }

  return (
    <List>
      {formats.map((f, idx) => {
        const isActive = focusArea === 'right' && idx === selectedIndex
        const { variant: badgeVariant, text: badgeText } = getFormatBadge(f)

        return (
          <ListItem key={f.formatId + '-' + idx} active={isActive}>
            <ListItemBody>
              <ListItemText>
                <Text as="span" bold style={{ display: 'inline', marginRight: 'var(--space-2)' }}>
                  {f.resolution}
                </Text>
                {Badge && <Badge variant={badgeVariant}>{badgeText}</Badge>}
                <Text
                  as="span"
                  variant="muted"
                  size="sm"
                  style={{ display: 'inline', marginLeft: 'var(--space-3)' }}
                >
                  {f.note}
                </Text>
              </ListItemText>
              <ListItemMeta>{fmtSize(f.filesize)}</ListItemMeta>
            </ListItemBody>
          </ListItem>
        )
      })}
    </List>
  )
}
