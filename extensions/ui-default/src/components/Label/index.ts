export interface LabelProps extends Record<string, unknown> {
  required?: boolean
}
export interface HelperTextProps extends Record<string, unknown> {
  variant?: 'default' | 'error' | 'success'
}
