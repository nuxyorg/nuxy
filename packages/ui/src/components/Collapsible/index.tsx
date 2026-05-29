import React from 'react'



export interface CollapsibleProps {
  trigger: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}



export interface AccordionItem {
  id: string
  trigger: React.ReactNode
  content: React.ReactNode
}



export interface AccordionProps {
  items: AccordionItem[]
  defaultOpenId?: string
  allowMultiple?: boolean
  className?: string
}

export function Collapsible(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Collapsible || (() => null);
  return <Impl {...props} />;
}

export function Accordion(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Accordion || (() => null);
  return <Impl {...props} />;
}

