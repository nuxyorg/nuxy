export interface CollapsibleProps {
  trigger: unknown
  children: unknown
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  id?: string
}
export interface AccordionItem {
  id: string
  trigger: unknown
  content: unknown
}
export interface AccordionProps {
  items: AccordionItem[]
  defaultOpenId?: string
  allowMultiple?: boolean
  className?: string
}
