/* cspell:ignore Bahasa čeština dansk Deutsch español français italiano Melayu Nederlands norsk polski português română slovenčina svenska tiếng Türkçe Việt ελληνικά русский українська עברית العربية فارسی हिन्दी ภาษาไทย */
import { DEFAULT_FONT_FAMILY_MAP } from '@nuxyorg/extension-sdk'
import type {
  NuxySettings,
  SelectOption,
  SectionDef,
  AnyRow,
  StateSnapshot,
  KbdScheme,
  HoldMsPreset,
} from '../types.ts'
import { resolvePriorityListOrder } from './priority-list.ts'

// ---------------------------------------------------------------------------
// Static option arrays
// ---------------------------------------------------------------------------

export const ZOOM_OPTIONS: SelectOption<string>[] = [
  { value: '75%', label: '75%' },
  { value: '90%', label: '90%' },
  { value: '100%', label: '100%' },
  { value: '110%', label: '110%' },
  { value: '125%', label: '125%' },
  { value: '150%', label: '150%' },
]

export const FONT_OPTIONS_STATIC: SelectOption<string>[] = [
  { value: 'system', label: 'System Default' },
  { value: 'monospace', label: 'Monospace' },
]

export const FONT_WEIGHT_OPTIONS: SelectOption<string>[] = [
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
]

export const ESC_ACTION_OPTIONS: SelectOption<string>[] = [
  { value: 'hide', label: 'Hide' },
  { value: 'minimize', label: 'Minimize' },
  { value: 'quit', label: 'Quit' },
  { value: 'none', label: 'Do Nothing' },
]

export const BACKGROUND_BEHAVIOR_OPTIONS: SelectOption<string>[] = [
  { value: 'reset-on-show', label: 'Reset launcher (default)' },
  { value: 'resume-session', label: 'Resume where I left off' },
]

export const WINDOW_WIDTH_OPTIONS: SelectOption<number>[] = [
  { value: 600, label: '600px' },
  { value: 700, label: '700px' },
  { value: 800, label: '800px' },
  { value: 900, label: '900px' },
  { value: 1000, label: '1000px' },
  { value: 1200, label: '1200px' },
]

export const WINDOW_MAX_HEIGHT_OPTIONS: SelectOption<number>[] = [
  { value: 400, label: '400px' },
  { value: 500, label: '500px' },
  { value: 600, label: '600px' },
  { value: 700, label: '700px' },
  { value: 800, label: '800px' },
]

export const WINDOW_POSITION_OPTIONS: SelectOption<string>[] = [
  { value: '1/2, 1/6', label: 'Top Center' },
  { value: '1/6, 1/2', label: 'Left Center' },
  { value: '1/2, 1/2', label: 'Screen Center (default)' },
  { value: '5/6, 1/2', label: 'Right Center' },
  { value: '1/2, 5/6', label: 'Bottom Center' },
  { value: '1/6, 1/6', label: 'Top Left' },
  { value: '5/6, 1/6', label: 'Top Right' },
  { value: '1/6, 5/6', label: 'Bottom Left' },
  { value: '5/6, 5/6', label: 'Bottom Right' },
  { value: '1/2, 1/3', label: 'Upper Center' },
]

export const OPACITY_OPTIONS: SelectOption<number>[] = [
  { value: 0.7, label: '70%' },
  { value: 0.8, label: '80%' },
  { value: 0.9, label: '90%' },
  { value: 1, label: '100%' },
]

export const BOOL_OPTIONS: SelectOption<boolean>[] = [
  { value: true, label: 'Yes' },
  { value: false, label: 'No' },
]

export const KBD_SCHEME_OPTIONS: SelectOption<KbdScheme>[] = [
  { value: 'auto', label: 'Auto (detect OS)' },
  { value: 'mac', label: 'Mac (⌘ Command)' },
  { value: 'windows', label: 'PC (Ctrl)' },
]

export const HOLD_MS_OPTIONS: SelectOption<HoldMsPreset>[] = [
  { value: 'short', label: 'Short (400 ms)' },
  { value: 'long', label: 'Long (800 ms)' },
]

export const LANGUAGE_OPTIONS: SelectOption<string>[] = [
  { value: '', label: '— (none)' },
  { value: 'ar', label: 'Arabic (العربية)' },
  { value: 'zh-Hans', label: 'Chinese, Simplified (简体中文)' },
  { value: 'zh-Hant', label: 'Chinese, Traditional (繁體中文)' },
  { value: 'cs', label: 'Czech (čeština)' },
  { value: 'da', label: 'Danish (dansk)' },
  { value: 'nl', label: 'Dutch (Nederlands)' },
  { value: 'en', label: 'English' },
  { value: 'fi', label: 'Finnish (suomi)' },
  { value: 'fr', label: 'French (français)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'el', label: 'Greek (ελληνικά)' },
  { value: 'he', label: 'Hebrew (עברית)' },
  { value: 'hi', label: 'Hindi (हिन्दी)' },
  { value: 'hu', label: 'Hungarian (magyar)' },
  { value: 'id', label: 'Indonesian (Bahasa Indonesia)' },
  { value: 'it', label: 'Italian (italiano)' },
  { value: 'ja', label: 'Japanese (日本語)' },
  { value: 'ko', label: 'Korean (한국어)' },
  { value: 'ms', label: 'Malay (Bahasa Melayu)' },
  { value: 'no', label: 'Norwegian (norsk)' },
  { value: 'fa', label: 'Persian (فارسی)' },
  { value: 'pl', label: 'Polish (polski)' },
  { value: 'pt', label: 'Portuguese (português)' },
  { value: 'ro', label: 'Romanian (română)' },
  { value: 'ru', label: 'Russian (русский)' },
  { value: 'sk', label: 'Slovak (slovenčina)' },
  { value: 'es', label: 'Spanish (español)' },
  { value: 'sv', label: 'Swedish (svenska)' },
  { value: 'th', label: 'Thai (ภาษาไทย)' },
  { value: 'tr', label: 'Turkish (Türkçe)' },
  { value: 'uk', label: 'Ukrainian (українська)' },
  { value: 'vi', label: 'Vietnamese (tiếng Việt)' },
]

export const LANGUAGE_ADD_LABEL = 'Add Language'

// ---------------------------------------------------------------------------
// Default settings
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: NuxySettings = {
  theme: 'dark',
  iconPack: '',
  zoom: '100%',
  font: 'system',
  fontWeight: '400',
  escAction: 'hide',
  blurAction: 'hide',
  backgroundBehavior: 'reset-on-show',
  windowWidth: 800,
  windowMaxHeight: 600,
  alwaysOnTop: false,
  opacity: 1,
  showInTaskbar: false,
  showOnStartup: false,
  windowPosition: '1/2, 1/2',
  preferredLanguages: [],
  kbdScheme: 'auto',
  holdMs: 'long',
}

// ---------------------------------------------------------------------------
// Section definitions
// ---------------------------------------------------------------------------

export const SECTIONS: SectionDef[] = [
  {
    id: 'general',
    label: 'General',
    rows: (themes, iconPacks, fontOptions) => [
      { key: 'theme', label: 'Theme', options: themes },
      { key: 'iconPack', label: 'Icon Pack', options: iconPacks },
      { key: 'zoom', label: 'Zoom', options: ZOOM_OPTIONS },
      { key: 'font', label: 'Font', options: fontOptions, searchable: true },
      { key: 'fontWeight', label: 'Font Weight', options: FONT_WEIGHT_OPTIONS },
      { key: 'kbdScheme', label: 'Keyboard Shortcut Style', options: KBD_SCHEME_OPTIONS },
      { key: 'holdMs', label: 'Hold Key Duration', options: HOLD_MS_OPTIONS },
    ],
  },
  {
    id: 'window',
    label: 'Window',
    rows: () => [
      { key: 'escAction', label: 'Esc Key Action', options: ESC_ACTION_OPTIONS },
      { key: 'blurAction', label: 'Focus-Out Action', options: ESC_ACTION_OPTIONS },
      {
        key: 'backgroundBehavior',
        label: 'Background behaviour',
        options: BACKGROUND_BEHAVIOR_OPTIONS,
      },
      { key: 'windowWidth', label: 'Window Width', options: WINDOW_WIDTH_OPTIONS },
      { key: 'windowMaxHeight', label: 'Max Height', options: WINDOW_MAX_HEIGHT_OPTIONS },
      { key: 'windowPosition', label: 'Launch Position', options: WINDOW_POSITION_OPTIONS },
      { key: 'opacity', label: 'Opacity', options: OPACITY_OPTIONS },
      { key: 'alwaysOnTop', label: 'Always on Top', options: BOOL_OPTIONS },
      { key: 'showInTaskbar', label: 'Show in Taskbar', options: BOOL_OPTIONS },
      { key: 'showOnStartup', label: 'Show on Startup', options: BOOL_OPTIONS },
    ],
  },
]

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function buildFontFamilyMap(systemFonts: string[]): Record<string, string> {
  const base: Record<string, string> = { ...DEFAULT_FONT_FAMILY_MAP }
  systemFonts.forEach((name) => {
    base[name] = `'${name}', sans-serif`
  })
  return base
}

export function buildFontOptions(systemFonts: string[]): SelectOption<string>[] {
  return [...FONT_OPTIONS_STATIC, ...systemFonts.map((name) => ({ value: name, label: name }))]
}

/**
 * True for any row whose value is a plain boolean — extension enable rows,
 * extension fields declared `type: "toggle"`, and kernel rows backed by
 * BOOL_OPTIONS. These render as a switch instead of a Yes/No select-box.
 */
export function isBooleanRow(row: AnyRow): boolean {
  if ('isExtToggle' in row && row.isExtToggle) return true
  if (row.isExtension) return row.type === 'toggle'
  return row.options.length === 2 && row.options.every((o) => typeof o.value === 'boolean')
}

export function getRowOptions(row: AnyRow, state: StateSnapshot): SelectOption[] {
  if ('isLanguage' in row && row.isLanguage) {
    const selected = new Set(state.settings.preferredLanguages.filter(Boolean))
    return row.options.filter((o) => !o.value || !selected.has(o.value as string))
  }
  return row.options
}

export function getRowCurrentValue(
  row: AnyRow,
  settings: NuxySettings,
  extValues: Record<string, Record<string, unknown>>,
  installedExtensions: Array<{
    id: string
    manifest: { name: string; bootstrap?: boolean; type: string }
    disabled?: boolean
  }>
): unknown {
  const isLanguageRow = 'isLanguage' in row && row.isLanguage
  const isExtToggleRow = 'isExtToggle' in row && row.isExtToggle
  if (isLanguageRow) return ''
  if (isExtToggleRow)
    return !(installedExtensions.find((e) => e.id === row.extId)?.disabled ?? false)
  if (row.isExtension && row.type === 'priority-list') {
    return resolvePriorityListOrder(extValues[row.extId]?.[row.fieldKey], row.default)
  }
  if (row.isExtension) return extValues[row.extId]?.[row.fieldKey] ?? row.default ?? ''
  return settings[row.key]
}
