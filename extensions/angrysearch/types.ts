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
