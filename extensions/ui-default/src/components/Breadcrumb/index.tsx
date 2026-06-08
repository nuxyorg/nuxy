import { host } from '../../host'
import './nuxy-breadcrumb.ts'
import './index.css'

export interface BreadcrumbItem {
  label: string
  href?: string
  onClick?: (e: MouseEvent) => void
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: string
  className?: string
}

export function Breadcrumb({
  items,
  separator = '/',
  className,
}: BreadcrumbProps): HTMLElement {
  const itemsJson = JSON.stringify(
    items.map((item, idx) => ({
      label: item.label,
      href: item.href,
      index: idx,
    }))
  )
  const el = host('nuxy-breadcrumb', {
    class: className,
    items: itemsJson,
    separator,
  })
  el.addEventListener('nuxy-breadcrumb-navigate', (e) => {
    const { index } = (e as CustomEvent<{ index: number }>).detail
    items[index]?.onClick?.(e as unknown as MouseEvent)
  })
  return el
}
