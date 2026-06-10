import { h } from '../../h'
import './nuxy-result-card.ts'

export interface ResultCardProps extends Record<string, unknown> {
  itemId: string
  title: string
  value: string
  providerName?: string
  copied?: boolean
}

export function ResultCard({
  itemId,
  title,
  value,
  providerName,
  copied,
  ...rest
}: ResultCardProps): HTMLElement {
  return h('nuxy-result-card', {
    ...rest,
    'item-id': itemId,
    title,
    value,
    ...(providerName ? { 'provider-name': providerName } : {}),
    ...(copied ? { copied: true } : {}),
  })
}
