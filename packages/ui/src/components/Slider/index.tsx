import React from 'react'

export interface SliderProps {
  value?: number
  defaultValue?: number
  min?: number
  max?: number
  step?: number
  onChange?: (value: number) => void
  disabled?: boolean
  showValue?: boolean
  showLabels?: boolean
  className?: string
  id?: string
}

export function Slider(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Slider || (() => null)
  return <Impl {...props} />
}
