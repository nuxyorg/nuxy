
export interface CollapsibleProps {
  trigger: unknown
  children: unknown
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
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

export function Collapsible(...args: any[]): unknown {
  return (window.UI as any)?.Collapsible?.(...args) ?? null
}

export function Accordion(...args: any[]): unknown {
  return (window.UI as any)?.Accordion?.(...args) ?? null
}
