// fallow-ignore-file code-duplication

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
}

export function SelectBox(...args: any[]): unknown {
  return (window.UI as any)?.SelectBox?.(...args) ?? null
}
