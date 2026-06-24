export type EscAction = 'hide' | 'minimize' | 'quit' | 'none'
export type BlurAction = 'hide' | 'minimize' | 'quit' | 'none'
export type BackgroundBehavior = 'reset-on-show' | 'resume-session'
export type Theme = string
export type ZoomLevel = string
export type FontFamily = string
export type FontWeight = string
export type KbdScheme = 'auto' | 'mac' | 'windows'
export type HoldMsPreset = 'short' | 'long'

export interface NuxySettings {
  theme: Theme
  iconPack: string
  zoom: ZoomLevel
  font: FontFamily
  fontWeight: FontWeight
  escAction: EscAction
  blurAction: BlurAction
  backgroundBehavior: BackgroundBehavior
  windowWidth: number
  windowMaxHeight: number
  alwaysOnTop: boolean
  opacity: number
  showInTaskbar: boolean
  showOnStartup: boolean
  windowPosition: string
  /** Ordered list of BCP 47 locale codes (most preferred first). */
  preferredLanguages: string[]
  /** Controls how modifier keys are displayed in keyboard shortcut hints. */
  kbdScheme: KbdScheme
  /** Duration for hold-to-confirm keyboard shortcuts. */
  holdMs: HoldMsPreset
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

export interface LanguageRow {
  key: string
  label: string
  options: SelectOption[]
  isExtension: false
  isLanguage: true
  searchable: true
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

export interface ExtFieldShowIf {
  key: string
  equals: unknown
}

export interface ExtFieldDef {
  key: string
  label: string
  type: string
  default?: unknown
  options?: Array<{ value: unknown; label: string }>
  placeholder?: string
  description?: string
  /** Only render this field when another field in the same schema currently equals this value. */
  showIf?: ExtFieldShowIf
}

export interface ExtSettingsInfo {
  extId: string
  name: string
  schema: { version?: number; fields: ExtFieldDef[] }
}

export interface BaseRow extends SectionRow {
  isExtension: false
}

export interface ExtSectionRow {
  key: string
  label: string
  options: SelectOption[]
  isExtension: true
  extId: string
  fieldKey: string
  type: string
  description?: string
  placeholder?: string
  default?: unknown
}

export interface ExtToggleRow {
  key: string
  label: string
  options: SelectOption[]
  isExtension: false
  isExtToggle: true
  extId: string
}

export interface LanguageRemoveRow {
  key: string
  label: string
  options: SelectOption[]
  isExtension: false
  isLanguageRemove: true
  langCode: string
}

export interface ExtListAddRow {
  key: string
  label: string
  options: SelectOption[]
  isExtension: false
  isExtListAdd: true
  extId: string
  fieldKey: string
  placeholder?: string
}

export interface ExtListRemoveRow {
  key: string
  label: string
  options: SelectOption[]
  isExtension: false
  isExtListRemove: true
  extId: string
  fieldKey: string
  itemValue: string
}

export type AnyRow =
  | BaseRow
  | ExtSectionRow
  | LanguageRow
  | LanguageRemoveRow
  | ExtToggleRow
  | ExtListAddRow
  | ExtListRemoveRow

export interface RenderSection {
  id: string
  label: string
  isExtension: boolean
  resolvedRows: AnyRow[]
}

export interface StateSnapshot {
  settings: NuxySettings
  selectedRow: number
  activeSelect: string | null
  activePriorityList: string | null
  selectFocused: number
  priorityFocused: number
  allRows: AnyRow[]
  extValues: Record<string, Record<string, unknown>>
  sectionsToRender: RenderSection[]
}
