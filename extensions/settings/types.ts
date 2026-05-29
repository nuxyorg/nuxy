export type EscAction = 'hide' | 'minimize' | 'quit' | 'none'
export type BlurAction = 'hide' | 'minimize' | 'quit' | 'none'
export type Theme = string
export type ZoomLevel = string
export type FontFamily = string

export interface NuxySettings {
  // Appearance
  theme: Theme
  iconPack: string
  zoom: ZoomLevel
  font: FontFamily
  // Window behaviour
  escAction: EscAction
  blurAction: BlurAction
  windowWidth: number
  windowMaxHeight: number
  alwaysOnTop: boolean
  opacity: number
  showInTaskbar: boolean
  showOnStartup: boolean
  windowPosition: string
  [key: string]: unknown
}

export interface GetSettingsPayload {
  [key: string]: unknown
}

export interface SaveSettingsPayload {
  [key: string]: unknown
}
