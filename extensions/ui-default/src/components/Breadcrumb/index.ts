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
