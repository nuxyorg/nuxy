import { h } from '../../h'
import { host, wireInputRef } from '../../host'
import './nuxy-input.ts'

export interface InputProps extends Record<string, unknown> {
  className?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  autoFocus?: boolean
  value?: string | number
  defaultValue?: string | number
}

export function Input({
  className,
  disabled,
  readOnly,
  required,
  autoFocus,
  value,
  defaultValue,
  ref,
  ...props
}: InputProps & { ref?: unknown }): HTMLElement {
  const el = h('nuxy-input', {
    ...props,
    class: className,
    ...(value !== undefined ? { value: String(value) } : {}),
    ...(defaultValue !== undefined ? { value: String(defaultValue) } : {}),
    ...(disabled ? { disabled: '' } : {}),
    ...(readOnly ? { readonly: '' } : {}),
    ...(required ? { required: '' } : {}),
    ...(autoFocus ? { autofocus: '' } : {}),
  })
  if (ref) wireInputRef(el, ref)
  return el
}
