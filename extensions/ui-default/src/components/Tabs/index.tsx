import type { UiChild } from '../../types'
import { h } from '../../h'
import { host } from '../../host'
import './nuxy-tabs.ts'

export interface TabItem {
  id: string
  label: UiChild
  content: UiChild
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  activeId?: string
  defaultActiveId?: string
  onChange?: (id: string) => void
  className?: string
}

export function Tabs({
  items,
  activeId,
  defaultActiveId,
  onChange,
  className,
}: TabsProps): HTMLElement {
  const active = activeId ?? defaultActiveId ?? items[0]?.id ?? ''
  const itemsJson = JSON.stringify(
    items.map((item) => ({
      id: item.id,
      label: String(item.label),
      disabled: item.disabled,
    }))
  )
  const el = host(
    'nuxy-tabs',
    { class: className, items: itemsJson, active },
    onChange
      ? {
          'nuxy-tabs-change': (e) => {
            const { id } = (e as CustomEvent<{ id: string }>).detail
            onChange(id)
          },
        }
      : undefined,
    items.map((item) => h('div', { 'data-tab-content': item.id }, item.content))
  )
  return el
}
