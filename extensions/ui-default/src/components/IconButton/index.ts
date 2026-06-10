export interface IconButtonProps extends Record<string, unknown> {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'danger'
  children: unknown
}
