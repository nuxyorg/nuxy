
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

export function NumberInput(...args: any[]): unknown {
  return (window.UI as any)?.NumberInput?.(...args) ?? null
}
