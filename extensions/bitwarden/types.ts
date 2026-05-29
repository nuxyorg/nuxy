export type OsType = 'macos' | 'arch' | 'debian' | 'linux'

export type BackendType = 'rbw' | 'bw' | 'none'

export interface BitwardenStatus {
  installed: boolean
  configured: boolean
  email?: string | null
  locked: boolean
  backend: BackendType
  os: OsType
}

export interface BitwardenItem {
  id: string
  name: string
  username?: string
  backend: BackendType
}

export interface SearchPayload {
  query?: string
}

export interface SetEmailPayload {
  email?: string
}

export interface GetTotpPayload {
  name: string
}

export interface CopyTotpPayload {
  code: string
}

export interface GetPasswordResult {
  password: string
}

export interface GetTotpResult {
  code: string
}

export interface RbwConfig {
  [key: string]: string
}
