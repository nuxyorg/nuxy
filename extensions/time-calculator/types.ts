export interface TimeParsed {
  hours: number
  minutes: number
}

export interface TimezoneMatch {
  tz: string
  label: string
  isLocal?: boolean
}

export interface ConvertResult {
  time24: string
  time12h: string
  tzLabel: string
}

export interface TimeResultMeta {
  sourceText: string
  sourceTime: string
  sourceLabel: string
  destTime: string
  destTime12h: string
  destLabel: string
  destTzLabel: string
  left: { text: string; badge: string }
  right: { text: string; badge: string }
}

export interface EvalResultItem {
  id: string
  title: string
  subtitle: string
  value: string
  meta?: TimeResultMeta
}

export interface EvalResult {
  items: EvalResultItem[]
}

export interface ConvertPayload {
  time?: string
  from?: string
  to?: string
}

export interface ConvertResponse {
  originalTime?: string
  convertedTime?: string
  timezone?: string
  tzAbbreviation?: string
  meta?: TimeResultMeta
  error?: string
}
