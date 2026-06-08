import { h } from '../../h'
import { host } from '../../host'
import './nuxy-select-box.ts'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectBoxProps {
  options: SelectOption[]
  value?: string
  open: boolean
  focusedIndex: number
  onSelect: (value: string) => void
  onClose: () => void
  onOpen?: (startIndex: number) => void
  placeholder?: string
  searchable?: boolean
  className?: string
}

export function SelectBox({
  options,
  value,
  open,
  focusedIndex,
  onSelect,
  onClose,
  onOpen,
  placeholder = '—',
  searchable = false,
  className,
}: SelectBoxProps): HTMLElement {
  return host(
    'nuxy-select-box',
    {
      class: className,
      placeholder,
      ...(searchable ? { searchable: '' } : {}),
      ...(open ? { open: '' } : {}),
      ...(value !== undefined ? { value } : {}),
      'focused-index': String(focusedIndex),
      options: JSON.stringify(options),
    },
    {
      'nuxy-select-box-select': (e) => {
        const detail = (e as CustomEvent<{ value: string }>).detail
        onSelect(detail.value)
      },
      'nuxy-select-box-close-request': () => onClose(),
      'nuxy-select-box-open-request': (e) => {
        const detail = (e as CustomEvent<{ startIndex: number }>).detail
        onOpen?.(detail.startIndex)
      },
    }
  )
}
