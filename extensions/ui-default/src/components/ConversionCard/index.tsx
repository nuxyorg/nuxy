import type { UiChild } from '../../types'
import { h } from '../../h'
import './nuxy-conversion-card.ts'

export interface ConversionCardProps {
  from: UiChild
  to: UiChild
  label?: string
}

export function ConversionCard({ from, to, label }: ConversionCardProps) {
  return h(
    'nuxy-conversion-card',
    null,
    label ? h('div', { 'data-label': '' }, label) : null,
    h('div', { 'data-from': '' }, from),
    h('div', { 'data-to': '' }, to)
  )
}
