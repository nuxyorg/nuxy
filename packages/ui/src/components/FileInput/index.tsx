import React from 'react'

export interface FileInputProps {
  onChange?: (files: File[]) => void
  onRemove?: (index: number) => void
  value?: File[]
  multiple?: boolean
  accept?: string
  disabled?: boolean
  label?: string
  hint?: string
  className?: string
  id?: string
}

export function FileInput(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.FileInput || (() => null)
  return <Impl {...props} />
}
