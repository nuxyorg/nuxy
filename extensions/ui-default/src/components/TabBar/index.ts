export interface TabOption {
  id: string
  label: string
  icon?: string
}
export interface TabBarProps extends Record<string, unknown> {
  tabs: TabOption[]
  active: string
  onChange: (id: string) => void
  orientation?: 'horizontal' | 'vertical'
  className?: string
}
