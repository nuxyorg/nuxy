import { host } from '../../host'
import './nuxy-number-input.ts'

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

export function NumberInput({
  value,
  defaultValue = 0,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  className,
  id,
}: NumberInputProps): HTMLElement {
  const isControlled = value !== undefined
  const listeners: Record<string, EventListener> = {}
  if (onChange) {
    listeners['nuxy-number-input-change'] = (e) => {
      const detail = (e as CustomEvent<{ value: number }>).detail
      onChange(detail.value)
    }
  }
  return host(
    'nuxy-number-input',
    {
      class: className,
      ...(id ? { id } : {}),
      ...(min !== undefined ? { min: String(min) } : {}),
      ...(max !== undefined ? { max: String(max) } : {}),
      step: String(step),
      ...(disabled ? { disabled: '' } : {}),
      ...(isControlled ? { value: String(value) } : { 'default-value': String(defaultValue) }),
    },
    listeners
  )
}
