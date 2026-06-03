export interface NyaaResult {
  id: string
  title: string
  magnet: string
  size: string
  date: string
  seeds: number
  leeches: number
  category: string
  status: 'default' | 'success' | 'danger'
}

export interface SearchPayload {
  query: string
}

export interface CopyMagnetPayload {
  magnet: string
}
