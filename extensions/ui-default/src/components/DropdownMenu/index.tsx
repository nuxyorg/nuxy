import type { UiChild } from '../../types'
import { h } from '../../h'
import { host } from '../../host'
import './nuxy-dropdown-menu.ts'

export interface DropdownItemProps {
  onClick?: (e: MouseEvent) => void
  disabled?: boolean
  variant?: 'default' | 'danger'
  children: UiChild
  className?: string
}

export function DropdownItem({
  onClick,
  disabled,
  variant = 'default',
  children,
  className,
}: DropdownItemProps): HTMLElement {
  const el = host(
    'nuxy-dropdown-item',
    {
      variant,
      class: className,
      ...(disabled ? { disabled: '' } : {}),
    },
    undefined,
    children
  )
  if (onClick) {
    el.addEventListener('click', (e) => onClick(e as MouseEvent))
  }
  return el
}

export function DropdownDivider(): HTMLElement {
  return h('nuxy-dropdown-divider')
}

export interface DropdownHeaderProps {
  children: UiChild
}

export function DropdownHeader({ children }: DropdownHeaderProps): HTMLElement {
  return h('nuxy-dropdown-header', null, children)
}

export interface DropdownMenuProps {
  trigger: HTMLElement
  children: UiChild
  align?: 'left' | 'right'
  className?: string
}

export function DropdownMenu({
  trigger,
  children,
  align = 'right',
  className,
}: DropdownMenuProps): HTMLElement {
  return h(
    'nuxy-dropdown-menu',
    { class: className, align },
    h('span', { 'data-trigger': '' }, trigger),
    children
  )
}
