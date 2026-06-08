import type { UiChild } from '../../types'
import { host } from '../../host'
import './nuxy-switch.ts'

export interface SwitchProps {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: UiChild
  id?: string
  className?: string
}

export function Switch({
  checked,
  defaultChecked,
  onChange,
  disabled,
  label,
  id,
  className,
}: SwitchProps): HTMLElement {
  const isControlled = checked !== undefined
  const listeners: Record<string, EventListener> = {}
  if (onChange) {
    listeners['nuxy-switch-change'] = (e) => {
      const detail = (e as CustomEvent<{ checked: boolean }>).detail
      onChange(detail.checked)
    }
  }
  return host(
    'nuxy-switch',
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
