const React = window.React

import type { ClipboardItem } from '../types.ts'
import { getItemType } from '../utils/itemType.ts'

const EXT_ID = 'com.nuxy.clipboard'

interface Params {
  selectedIndex: number
  filteredItems: ClipboardItem[]
}

interface Meta {
  imageDimensions: string | null
  fileExists: boolean | null
}

export function useSelectedItemMeta({ selectedIndex, filteredItems }: Params): Meta {
  const [imageDimensions, setImageDimensions] = React.useState<string | null>(null)
  const [fileExists, setFileExists] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null
    if (selectedItem?.image) {
      const img = new Image()
      img.onload = () => setImageDimensions(`${img.width} × ${img.height}`)
      img.src = selectedItem.image
    } else {
      setImageDimensions(null)
    }
  }, [selectedIndex, filteredItems])

  React.useEffect(() => {
    const selectedItem = selectedIndex >= 0 ? filteredItems[selectedIndex] : null
    const type = selectedItem ? getItemType(selectedItem) : null
    if (type !== 'file') {
      setFileExists(null)
      return
    }
    setFileExists(null)
    window.core?.ipc
      ?.invoke(EXT_ID, 'checkFile', selectedItem!.text?.trim())
      .then((res) => {
        const r = res as { success: boolean; data?: boolean } | null
        if (r?.success) setFileExists(!!r.data)
      })
      .catch(() => setFileExists(false))
  }, [selectedIndex, filteredItems])

  return { imageDimensions, fileExists }
}
