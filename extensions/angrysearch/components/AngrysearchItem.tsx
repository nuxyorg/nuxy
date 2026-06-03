import type { AngrysearchItem } from '../types.ts'

const iconStyle = {
  width: '1em',
  height: '1em',
  marginRight: 'var(--space-1)',
  verticalAlign: 'middle',
} as const

interface Props {
  item: AngrysearchItem
  isActive: boolean
}

export function AngrysearchListItem({ item, isActive }: Props) {
  const { ListItem, ListItemBody, ListItemText, ListItemMeta, IconFolder, IconFile } = window.UI || {}

  return (
    <ListItem active={isActive}>
      <ListItemBody>
        <ListItemText>
          {item.isDir
            ? IconFolder && <IconFolder style={iconStyle} />
            : IconFile && <IconFile style={iconStyle} />}
          {item.title}
        </ListItemText>
        <ListItemMeta>{item.subtitle}</ListItemMeta>
      </ListItemBody>
    </ListItem>
  )
}
