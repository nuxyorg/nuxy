// fallow-ignore-file code-duplication

export interface RadioOption {
  value: string
  label: unknown
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

export function RadioGroup(...args: any[]): unknown {
  return (window.UI as any)?.RadioGroup?.(...args) ?? null
}
