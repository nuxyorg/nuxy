export interface TimerStatus {
  active: boolean
  startedAt: number
  duration: number
  remaining: number
  elapsed: number
  percent: number
  label: string
}

export interface Session {
  id: string
  label: string
  duration: number
  startedAt: number
  endedAt: number
  completed: boolean
}

export interface StartPayload {
  duration?: number
  label?: string
}
