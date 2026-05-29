import React from 'react'

export interface NumberInputProps {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
  disabled?: boolean
  className?: string
  id?: string
}

export function NumberInput(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.NumberInput || (() => null)
  return <Impl {...props} />
}
