import type { UiChild } from '../../types'
import { h } from '../../h'
import { host } from '../../host'
import './nuxy-collapsible.ts'
import './nuxy-accordion.ts'

export interface CollapsibleProps {
  trigger: UiChild
  children: UiChild
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
  id?: string
}

export function Collapsible({
  trigger,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
  id,
}: CollapsibleProps): HTMLElement {
  const isControlled = open !== undefined
  const listeners: Record<string, EventListener> = {}
  if (onOpenChange) {
    listeners['nuxy-collapsible-change'] = (e) => {
      const detail = (e as CustomEvent<{ open: boolean }>).detail
      onOpenChange(detail.open)
    }
  }
  return host(
    'nuxy-collapsible',
    {
      class: className,
      ...(id ? { 'data-id': id } : {}),
      ...(isControlled ? (open ? { open: '' } : {}) : {}),
      ...(!isControlled && defaultOpen ? { 'default-open': '' } : {}),
    },
    listeners,
    h('span', { slot: 'trigger' }, trigger),
    h('div', { slot: 'content' }, children)
  )
}

export interface AccordionItem {
  id: string
  trigger: UiChild
  content: UiChild
}

export interface AccordionProps {
  items: AccordionItem[]
  defaultOpenId?: string
  allowMultiple?: boolean
  className?: string
}

export function Accordion({
  items,
  defaultOpenId,
  allowMultiple = false,
  className,
}: AccordionProps): HTMLElement {
  return h(
    'nuxy-accordion',
    {
      class: className,
      ...(allowMultiple ? { 'allow-multiple': '' } : {}),
    },
    ...items.map((item) =>
      Collapsible({
        id: item.id,
        trigger: item.trigger,
        defaultOpen: item.id === defaultOpenId,
        className: undefined,
        children: item.content,
      })
    )
  )
}
