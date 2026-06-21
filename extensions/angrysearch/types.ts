import type { IpcChannelMap } from '@nuxyorg/extension-sdk'

export interface AngrysearchItem {
  id: string
  title: string
  subtitle: string
  value: string
  isDir: boolean
}

export interface SearchPayload {
  query?: string
  regex?: boolean
}

export interface SearchResult {
  items: AngrysearchItem[]
}

export interface DbStatus {
  isUpdating: boolean
  lastUpdate: string | null
  exists: boolean
}

export interface DbRow {
  path: string
  directory: string | number
}

export interface IpcChannels extends IpcChannelMap {
  search: { input: SearchPayload; output: SearchResult }
  getStatus: { input: void; output: DbStatus }
  updateDatabase: { input: void; output: boolean }
  openFile: { input: string; output: boolean }
  openLocation: { input: string; output: boolean }
}
