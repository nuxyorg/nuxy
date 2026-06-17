import { parseJsonArray } from './parse.ts'

export interface SelectOption {
  value: string
  label: string
}

export function parseOptions(raw: string | null): SelectOption[] {
  return parseJsonArray<SelectOption>(raw)
}
