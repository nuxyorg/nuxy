export interface CalcResultItem {
  id: string
  title: string
  subtitle: string
  value: number
}

export interface EvalResult {
  items: CalcResultItem[]
}
