export interface CalendarEvent {
  id: string
  title: string
  datetime: number
  notes: string
  remindMin: number
  createdAt: number
}

export interface CalendarEventRow {
  id: string
  title: string
  datetime: number
  notes: string
  remind_min: number
  created_at: number
}

export interface CalendarListPayload {
  from?: number
  to?: number
}

export interface CalendarCreatePayload {
  title: string
  datetime: number
  notes?: string
  remindMin?: number
}

export interface CalendarUpdatePayload {
  id: string
  title?: string
  datetime?: number
  notes?: string
  remindMin?: number
}

export interface CalendarDeletePayload {
  id: string
}
