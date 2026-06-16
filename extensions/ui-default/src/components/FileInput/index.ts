export interface FileInputProps {
  onChange?: (files: File[]) => void
  onRemove?: (index: number) => void
  value?: File[]
  multiple?: boolean
  accept?: string
  disabled?: boolean
  label?: string
  hint?: string
  className?: string
  id?: string
}
