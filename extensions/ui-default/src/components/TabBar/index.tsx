import { h } from '../../h'
import { host } from '../../host'
import './nuxy-tab-bar.ts'

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

export function TabBar({
  tabs,
  active,
  onChange,
  orientation = 'horizontal',
  className,
  ...rest
}: TabBarProps): HTMLElement {
  const tabsJson = JSON.stringify(tabs)
  return host(
    'nuxy-tab-bar',
    { class: className, tabs: tabsJson, active, orientation, ...rest },
    {
      'nuxy-tab-bar-change': (e) => {
        const detail = (e as CustomEvent<{ id: string }>).detail
        onChange(detail.id)
      },
    }
  )
}
