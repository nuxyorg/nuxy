
export interface PinInputProps {
  length?: number
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  mask?: boolean
  className?: string
}

export function PinInput(...args: any[]): unknown {
  return (window.UI as any)?.PinInput?.(...args) ?? null
}
