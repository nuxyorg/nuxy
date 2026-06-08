import { h } from '../../h'
import { host, wireInputRef } from '../../host'
import './nuxy-search-input.ts'

export interface SearchInputProps extends Record<string, unknown> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  className?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
}

export function SearchInput({
  value,
  onChange,
  onClear,
  className,
  placeholder = 'Search…',
  disabled,
  autoFocus,
  ref,
  ...props
}: SearchInputProps & { ref?: unknown }): HTMLElement {
  const el = host('nuxy-search-input', {
    ...props,
    class: className,
    placeholder,
    ...(value !== undefined ? { value } : {}),
    ...(disabled ? { disabled: '' } : {}),
    ...(autoFocus ? { autofocus: '' } : {}),
  })
  if (onChange) {
    el.addEventListener('input', () => {
      const input = el.querySelector('input')
      onChange(input?.value ?? '')
    })
  }
  if (onClear) {
    el.addEventListener('nuxy-search-clear', () => onClear())
  }
  if (ref) wireInputRef(el, ref)
  return el
}
