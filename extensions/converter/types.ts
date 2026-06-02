export interface UnitDef {
  symbol: string
  label: string
  aliases: string[] // alternative spellings accepted in query
  system: 'metric' | 'imperial' | 'both'
}

export interface ConversionResult {
  id: string
  fromValue: number
  fromUnit: string
  fromSymbol: string
  toValue: number
  toUnit: string
  toSymbol: string
  formattedResult: string // e.g. "62.14 mi"
  category: UnitCategory
}

export type UnitCategory =
  | 'length'
  | 'weight'
  | 'temperature'
  | 'area'
  | 'volume'
  | 'speed'
  | 'time'
  | 'data'

export interface ConvertPayload {
  query: string
}

export interface CopyResultPayload {
  value: string
}

export type UnitSystem = 'metric' | 'imperial' | 'both'
