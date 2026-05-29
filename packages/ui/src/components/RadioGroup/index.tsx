import React from 'react'



export interface RadioOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}



export interface RadioGroupProps {
  options: RadioOption[]
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  orientation?: 'vertical' | 'horizontal'
  name?: string
  disabled?: boolean
  className?: string
}

export function RadioGroup(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.RadioGroup || (() => null);
  return <Impl {...props} />;
}

