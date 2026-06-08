
export interface TabOption {
  id: string
  label: string
  icon?: string
}

export interface TabBarProps extends Omit<unknown, 'onChange'> {
  tabs: TabOption[]
  active: string
  onChange: (id: string) => void
  orientation?: 'horizontal' | 'vertical'
}

export function TabBar(...args: any[]): unknown {
  return (window.UI as any)?.TabBar?.(...args) ?? null
}
