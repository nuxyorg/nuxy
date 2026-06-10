export interface SearchInputProps extends Record<string, unknown> {
  value?: string
  onChange?: (value: string) => void
  onClear?: () => void
  className?: string
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
}
