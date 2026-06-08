import { host } from '../../host'
import './nuxy-radio-group.ts'

export interface RadioOption {
  value: string
  label: string
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

export function RadioGroup({
  options,
  value,
  defaultValue,
  onChange,
  orientation = 'vertical',
  name,
  disabled,
  className,
}: RadioGroupProps): HTMLElement {
  const isControlled = value !== undefined
  const optionsJson = JSON.stringify(options)
  return host(
    'nuxy-radio-group',
    {
      class: className,
      options: optionsJson,
      orientation,
      ...(name ? { name } : {}),
      ...(disabled ? { disabled: '' } : {}),
      ...(isControlled ? { value } : defaultValue !== undefined ? { value: defaultValue } : {}),
    },
    onChange
      ? {
          'nuxy-radio-group-change': (e) => {
            const detail = (e as CustomEvent<{ value: string }>).detail
            onChange(detail.value)
          },
        }
      : undefined
  )
}
