import { host } from '../../host'
import './nuxy-pin-input.ts'

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

export function PinInput({
  length = 4,
  value,
  defaultValue = '',
  onChange,
  onComplete,
  disabled = false,
  error = false,
  mask = false,
  className,
}: PinInputProps): HTMLElement {
  const isControlled = value !== undefined
  const listeners: Record<string, EventListener> = {}
  if (onChange) {
    listeners['nuxy-pin-input-change'] = (e) => {
      const detail = (e as CustomEvent<{ value: string }>).detail
      onChange(detail.value)
    }
  }
  if (onComplete) {
    listeners['nuxy-pin-input-complete'] = (e) => {
      const detail = (e as CustomEvent<{ value: string }>).detail
      onComplete(detail.value)
    }
  }
  return host(
    'nuxy-pin-input',
    {
      class: className,
      length: String(length),
      ...(disabled ? { disabled: '' } : {}),
      ...(error ? { error: '' } : {}),
      ...(mask ? { mask: '' } : {}),
      ...(isControlled ? { value } : { 'default-value': defaultValue }),
    },
    listeners
  )
}
