
export interface BreadcrumbItem {
  label: unknown
  href?: string
  onClick?: (e: unknown) => void
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  separator?: unknown
  className?: string
}

export function Breadcrumb(...args: any[]): unknown {
  return (window.UI as any)?.Breadcrumb?.(...args) ?? null
}
