const React = window.React

import type { ClipboardItem } from '../types.ts'
import type { ItemType } from '../utils/itemType.ts'
import { getFileExtension } from '../utils/itemType.ts'
import { FileIconFor } from './FileIconFor.tsx'

interface Props {
  item: ClipboardItem
  type: ItemType
}

export function ClipboardItemLeading({ item, type }: Props) {
  const { ItemLeading } = window.UI || {}
  if (!ItemLeading) return null

  if (type === 'image') {
    return (
      <ItemLeading>
        <img
          src={item.image!}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          alt=""
        />
      </ItemLeading>
    )
  }

  if (type === 'color') {
    return <ItemLeading color={item.text?.trim() || ''} />
  }

  if (type === 'file') {
    const ext = getFileExtension(item.text?.trim() || '')
    return (
      <ItemLeading>
        <FileIconFor ext={ext} />
      </ItemLeading>
    )
  }

  if (type === 'url') {
    const { IconGlobe } = window.UI || {}
    return <ItemLeading>{IconGlobe && <IconGlobe />}</ItemLeading>
  }

  return null
}
