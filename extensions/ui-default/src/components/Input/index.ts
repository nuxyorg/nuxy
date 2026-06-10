export interface InputProps extends Record<string, unknown> {
  className?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  autoFocus?: boolean
  value?: string | number
  defaultValue?: string | number
}
