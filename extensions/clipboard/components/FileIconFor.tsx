const React = window.React

import { getFileIconType } from '../utils/itemType.ts'

const FILE_ICON_MAP: Record<string, string> = {
  'image-file': 'ImageFile',
  code: 'Code',
  document: 'Document',
  pdf: 'Pdf',
  archive: 'Archive',
}

export function FileIconFor({ ext }: { ext: string }) {
  const { Icon } = window.UI || {}
  if (!Icon) return null
  const name = FILE_ICON_MAP[getFileIconType(ext)] ?? 'File'
  return <Icon name={name} />
}
