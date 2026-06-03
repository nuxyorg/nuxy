const React = window.React

import type { ConversionResult } from '../types.ts'

const EXT_ID = 'com.nuxy.converter'

interface ConverterActions {
  copiedId: string | null
  handleCopy: (item: ConversionResult) => void
}

export function useConverterActions(): ConverterActions {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopy = (item: ConversionResult): void => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'copyResult', { value: item.formattedResult })
      .then(() => {
        setCopiedId(item.id)
        setTimeout(() => setCopiedId(null), 1800)
      })
      .catch(() => {})
  }

  return { copiedId, handleCopy }
}
