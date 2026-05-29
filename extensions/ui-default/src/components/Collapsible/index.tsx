import React from 'react'
import './index.css'

export interface CollapsibleProps {
  trigger: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

export function Collapsible({ trigger, children, defaultOpen = false, open, onOpenChange, className }: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const handleToggle = () => {
    if (!isControlled) setInternalOpen((prev) => !prev)
    onOpenChange?.(!isOpen)
  }

  return (
    <div className={`nuxy-collapsible ${isOpen ? 'nuxy-collapsible--open' : ''} ${className || ''}`}>
      <button
        type="button"
        className="nuxy-collapsible__trigger"
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span>{trigger}</span>
        <span className="nuxy-collapsible__chevron" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      <div className="nuxy-collapsible__content" aria-hidden={!isOpen}>
        {children}
      </div>
    </div>
  )
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

export function Accordion({ items, defaultOpenId, allowMultiple = false, className }: AccordionProps) {
  const [openIds, setOpenIds] = React.useState<Set<string>>(
    defaultOpenId ? new Set([defaultOpenId]) : new Set()
  )

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!allowMultiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className={`nuxy-accordion ${className || ''}`}>
      {items.map((item) => (
        <Collapsible
          key={item.id}
          trigger={item.trigger}
          open={openIds.has(item.id)}
          onOpenChange={() => toggle(item.id)}
        >
          {item.content}
        </Collapsible>
      ))}
    </div>
  )
}
