const React = window.React

import { getFileIconType } from '../utils/itemType.ts'

export function FileIconFor({ ext }: { ext: string }) {
  const { IconImageFile, IconCode, IconDocument, IconPdf, IconArchive, IconFile } = window.UI || {}
  const t = getFileIconType(ext)
  if (t === 'image-file') return IconImageFile ? <IconImageFile /> : null
  if (t === 'code') return IconCode ? <IconCode /> : null
  if (t === 'document') return IconDocument ? <IconDocument /> : null
  if (t === 'pdf') return IconPdf ? <IconPdf /> : null
  if (t === 'archive') return IconArchive ? <IconArchive /> : null
  return IconFile ? <IconFile /> : null
}
