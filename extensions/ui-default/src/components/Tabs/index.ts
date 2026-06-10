export interface TabItem {
  id: string
  label: unknown
  content: unknown
  disabled?: boolean
}
export interface TabsProps {
  items: TabItem[]
  activeId?: string
  defaultActiveId?: string
  onChange?: (id: string) => void
  className?: string
}
