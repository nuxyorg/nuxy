import { parseListFieldValue } from './list-field.ts'
import type { SelectOption, ExtSettingsInfo } from '../types.ts'

export interface PriorityListDisplayItem {
  value: string
  label: string
}

export function resolvePriorityListOrder(raw: unknown, fallback?: unknown): string[] {
  const parsed = parseListFieldValue(raw)
  if (parsed.length > 0) return parsed
  return parseListFieldValue(fallback)
}

export function resolvePriorityListItems(
  order: unknown,
  options: SelectOption[],
  fallback?: unknown
): PriorityListDisplayItem[] {
  const values = resolvePriorityListOrder(order, fallback)
  const labelByValue = new Map(options.map((option) => [String(option.value), option.label]))
  return values.map((value) => ({
    value,
    label: labelByValue.get(value) ?? value,
  }))
}

export function normalizePriorityListFields(
  info: ExtSettingsInfo,
  values: Record<string, unknown>
): Record<string, unknown> {
  const next = { ...values }
  for (const field of info.schema.fields) {
    if (field.type !== 'priority-list') continue
    if (parseListFieldValue(next[field.key]).length > 0) continue
    const fallback = resolvePriorityListOrder(undefined, field.default)
    if (fallback.length === 0) continue
    next[field.key] = fallback
  }
  return next
}

export function swapPriorityListItems(order: string[], indexA: number, indexB: number): string[] {
  if (
    indexA < 0 ||
    indexB < 0 ||
    indexA >= order.length ||
    indexB >= order.length ||
    indexA === indexB
  ) {
    return order
  }
  const next = [...order]
  ;[next[indexA], next[indexB]] = [next[indexB]!, next[indexA]!]
  return next
}
