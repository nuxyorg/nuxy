import { h } from '../../h'
import type { CompareMeta } from './nuxy-compare-card.ts'
import './nuxy-compare-card.ts'

export type { CompareMeta }

export interface CompareCardProps extends Record<string, unknown> {
  itemId: string
  value: string
  meta: CompareMeta
  copied?: boolean
}

export function CompareCard({
  itemId,
  value,
  meta,
  copied,
  ...rest
}: CompareCardProps): HTMLElement {
  return h('nuxy-compare-card', {
    ...rest,
    'item-id': itemId,
    value,
    meta,
    ...(copied ? { copied: true } : {}),
  })
}
