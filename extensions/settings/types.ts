export type EscAction = 'hide' | 'minimize' | 'quit' | 'none'
export type BlurAction = 'hide' | 'minimize' | 'quit' | 'none'
export type Theme = string
export type ZoomLevel = string
export type FontFamily = string

export interface NuxySettings {
  theme: Theme
  iconPack: string
  zoom: ZoomLevel
  font: FontFamily
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

export interface SelectOption<T = unknown> {
  value: T
  label: string
}

export interface SectionRow {
  key: string
  label: string
  options: SelectOption[]
  searchable?: boolean
}

export interface SectionDef {
  id: string
  label: string
  rows: (
    themes: SelectOption[],
    iconPacks: SelectOption[],
    fontOptions: SelectOption[]
  ) => SectionRow[]
}

export interface ResolvedSection extends SectionDef {
  resolvedRows: SectionRow[]
}

export interface NavSection {
  id: string
  label: string
  itemCount: number
}

export interface StateSnapshot {
  settings: NuxySettings
  selectedRow: number
  activeSelect: string | null
  selectFocused: number
  allRows: any[]
}
