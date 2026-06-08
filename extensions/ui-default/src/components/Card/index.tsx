import { h } from '../../h'
import './nuxy-card.ts'

export interface CardProps extends Record<string, unknown> {
  interactive?: boolean
}

export function Card({ children, className, interactive, ...props }: CardProps) {
  return h(
    'nuxy-card',
    {
      ...props,
      class: className,
      ...(interactive ? { interactive: '' } : {}),
    },
    children
  )
}

export interface CardHeaderProps extends Record<string, unknown> {}
export function CardHeader({ children, className, ...props }: CardHeaderProps) {
  return h('nuxy-card-header', { ...props, class: className }, children)
}

export interface CardBodyProps extends Record<string, unknown> {}
export function CardBody({ children, className, ...props }: CardBodyProps) {
  return h('nuxy-card-body', { ...props, class: className }, children)
}

export interface CardFooterProps extends Record<string, unknown> {}
export function CardFooter({ children, className, ...props }: CardFooterProps) {
  return h('nuxy-card-footer', { ...props, class: className }, children)
}
