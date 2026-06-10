import { host } from '../../host'
import './nuxy-slider.ts'

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

export function Slider({
  value,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  disabled,
  showValue = false,
  showLabels = false,
  className,
  id,
}: SliderProps): HTMLElement {
  const isControlled = value !== undefined
  const listeners: Record<string, EventListener> = {}
  if (onChange) {
    listeners['nuxy-slider-change'] = (e) => {
      const detail = (e as CustomEvent<{ value: number }>).detail
      onChange(detail.value)
    }
  }
  return host(
    'nuxy-slider',
    {
      class: className,
      ...(id ? { id } : {}),
      min: String(min),
      max: String(max),
      step: String(step),
      ...(disabled ? { disabled: '' } : {}),
      ...(showValue ? { 'show-value': '' } : {}),
      ...(showLabels ? { 'show-labels': '' } : {}),
      ...(isControlled ? { value: String(value) } : { 'default-value': String(defaultValue) }),
    },
    listeners
  )
}
