import type { UiChild } from '../../types'
import { host } from '../../host'
import './nuxy-checkbox.ts'

export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: UiChild
  id?: string
  className?: string
}

export function Checkbox({
  checked,
  defaultChecked,
  onChange,
  disabled,
  label,
  id,
  className,
}: CheckboxProps): HTMLElement {
  const isControlled = checked !== undefined
  const listeners: Record<string, EventListener> = {}
  if (onChange) {
    listeners['nuxy-checkbox-change'] = (e) => {
      const detail = (e as CustomEvent<{ checked: boolean }>).detail
      onChange(detail.checked)
    }
  }
  return host(
    'nuxy-checkbox',
    {
      class: className,
      ...(id ? { id } : {}),
      ...(disabled ? { disabled: '' } : {}),
      ...(isControlled && checked ? { checked: '' } : {}),
      ...(!isControlled && defaultChecked ? { checked: '' } : {}),
    },
    listeners,
    label
  )
}
