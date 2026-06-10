import type { CompareMeta } from './nuxy-compare-card.ts'
export type { CompareMeta }
export interface CompareCardProps extends Record<string, unknown> {
  itemId: string
  value: string
  meta: CompareMeta
  copied?: boolean
}
