export interface ProcessInfo {
  pid: number
  name: string
  command: string
  cpu: string
  mem: string
  user: string
}

export interface ListProcessesPayload {
  query: string
  includeSystem?: boolean
}

export interface KillProcessPayload {
  pid: number
  signal: 'SIGTERM' | 'SIGKILL'
}

export interface KillResult {
  success: boolean
  pid: number
  error?: string
}
