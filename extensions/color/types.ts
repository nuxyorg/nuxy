import type { IpcChannelMap } from '@nuxy/extension-sdk'

export interface SavedColor {
  id: string
  hex: string
  rgb: string
  hsl: string
  r: number
  g: number
  b: number
  h: number
  s: number
  l: number
  savedAt: string
}

export interface IpcChannels extends IpcChannelMap {
  parseColor: { input: { input: string }; output: SavedColor | null }
  getHistory: { input: void; output: SavedColor[] }
  saveColor: { input: { color: SavedColor }; output: SavedColor[] }
  deleteColor: { input: { id: string }; output: SavedColor[] }
  copyColor: { input: { text: string }; output: void }
  getCopyFormat: { input: void; output: string }
}
