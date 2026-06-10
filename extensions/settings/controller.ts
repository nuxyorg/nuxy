import type { ShellKeyAction } from '@nuxy/core'
import { createStore, type Store } from '../store.ts'
import { createTranslator, type Translator } from '../shell-i18n.ts'
import { createSettingsActions, type SettingsActions } from './actions.ts'
import { createDefaultSettingsData, loadSettingsData, type SettingsDataState } from './data.ts'
import { computeSettingsMeta, type SettingsMeta } from './meta.ts'
import type { AnyRow, NuxySettings, SelectOption, StateSnapshot } from './types.ts'
import { getRowCurrentValue, getRowOptions } from './utils/settingsOptions.ts'

const EXT_ID = 'com.nuxy.settings'

export interface SettingsUIState {
  selectedRow: number
  activeSelect: string | null
  selectFocused: number
}

export interface SettingsControllerState extends SettingsDataState, SettingsUIState {}

export class SettingsController {
  readonly store: Store<SettingsControllerState>
  readonly t: Translator
  readonly sectionRefs: Record<string, HTMLDivElement | null> = {}
  readonly inputRefs: Record<string, HTMLInputElement | null> = {}

  private actions: SettingsActions | null = null
  private meta: SettingsMeta | null = null
  private dataCleanup: (() => void) | null = null

  constructor(private onUpdate: () => void) {
    this.store = createStore<SettingsControllerState>({
      ...createDefaultSettingsData(),
      selectedRow: -1,
      activeSelect: null,
      selectFocused: 0,
    })
    this.t = createTranslator(EXT_ID, () => {
      window.core?.shell?.refreshKeyHints()
      this.onUpdate()
    })
    this.store.subscribe(() => {
      this.recomputeMeta()
      this.onUpdate()
    })
  }

  get state(): SettingsControllerState {
    return this.store.getState()
  }

  get computedMeta(): SettingsMeta | null {
    return this.meta
  }

  connect(): void {
    this.actions = createSettingsActions({
      getSettings: () => this.state.settings,
      getExtValues: () => this.state.extValues,
      getFontFamilyMap: () => this.meta?.fontFamilyMap ?? {},
      setSettings: (next) => this.store.setState({ settings: next }),
      patchExtValues: (extId, values) => {
        this.store.setState((prev) => ({
          extValues: { ...prev.extValues, [extId]: values },
        }))
      },
      setActiveSelect: (key) => this.store.setState({ activeSelect: key }),
    })

    this.dataCleanup = loadSettingsData((patch) => {
      this.store.setState((prev) => {
        const next = { ...prev, ...patch }
        if (patch.extValues) {
          next.extValues = { ...prev.extValues, ...patch.extValues }
        }
        return next
      })
    })

    this.recomputeMeta()
    this.bindKeyActions()
  }

  disconnect(): void {
    this.dataCleanup?.()
    this.dataCleanup = null
    this.t.destroy()
    window.core?.shell?.registerKeyActions(null)
  }

  setSelectedRow(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedRow
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedRow: next })
    this.scrollRowIntoView(next)
  }

  setActiveSelect(key: string | null): void {
    this.store.setState({ activeSelect: key })
  }

  setSelectFocused(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectFocused
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectFocused: next })
  }

  getStateSnapshot(): StateSnapshot {
    const meta = this.meta
    return {
      settings: this.state.settings,
      selectedRow: this.state.selectedRow,
      activeSelect: this.state.activeSelect,
      selectFocused: this.state.selectFocused,
      allRows: meta?.allRows ?? [],
      extValues: this.state.extValues,
      sectionsToRender: meta?.sectionsToRender ?? [],
    }
  }

  private recomputeMeta(): void {
    const s = this.state
    this.meta = computeSettingsMeta({
      themes: s.themes,
      iconPacks: s.iconPacks,
      systemFonts: s.systemFonts,
      extSchemas: s.extSchemas,
      installedExtensions: s.installedExtensions,
      ollamaModelOptions: s.ollamaModelOptions,
      preferredLanguages: s.settings.preferredLanguages ?? [],
      t: this.t.t,
    })
  }

  private scrollRowIntoView(rowIdx: number): void {
    if (rowIdx < 0 || !this.meta) return
    const meta = this.meta
    let offset = 0
    for (const s of meta.navSections) {
      if (rowIdx < offset + s.itemCount) {
        const sectionEl = this.sectionRefs[s.id]
        if (sectionEl) {
          const smooth = (window.UI as { smoothScrollIntoViewIfNeeded?: (el: HTMLElement) => void })
            ?.smoothScrollIntoViewIfNeeded
          if (smooth) smooth(sectionEl)
          else sectionEl.scrollIntoView({ block: 'nearest' })
        }
        break
      }
      offset += s.itemCount
    }
  }

  private bindKeyActions(): void {
    window.core?.shell?.registerKeyActions(() => this.buildKeyActions())
  }

  private buildKeyActions(): ShellKeyAction[] {
    const t = this.t.t
    const list: ShellKeyAction[] = [
      {
        key: 'ArrowUp',
        label: t('actions.previousSetting'),
        hint: '↑↓',
        allowRepeat: true,
        handler: () => {
          const { activeSelect } = this.state
          if (activeSelect !== null) {
            this.setSelectFocused((i) => Math.max(i - 1, 0))
          } else {
            this.setSelectedRow((prev) => {
              if (prev > 0) return prev - 1
              if (prev === 0) return -1
              return prev
            })
          }
        },
      },
      {
        key: 'ArrowDown',
        label: t('actions.nextSetting'),
        allowRepeat: true,
        handler: () => {
          const snap = this.getStateSnapshot()
          if (snap.activeSelect !== null) {
            const row = snap.allRows.find((r) => r.key === snap.activeSelect)
            if (row) this.setSelectFocused((i) => Math.min(i + 1, row.options.length - 1))
          } else {
            this.setSelectedRow((prev) => {
              if (prev < 0) return 0
              if (prev < snap.allRows.length - 1) return prev + 1
              return prev
            })
          }
        },
      },
      {
        key: 'Enter',
        label: t('actions.openSetting'),
        hint: '↵',
        handler: () => {
          const snap = this.getStateSnapshot()
          if (snap.activeSelect !== null) {
            const row = snap.allRows.find((r) => r.key === snap.activeSelect)
            if (row) {
              const opt = row.options[snap.selectFocused]
              if (opt) this.actions?.handleRowSelect(row, opt.value)
              this.setActiveSelect(null)
            }
          } else {
            const row = snap.allRows[snap.selectedRow]
            if (!row) return
            const isLangRemove = 'isLanguageRemove' in row && row.isLanguageRemove
            if (isLangRemove) {
              this.actions?.removeLanguage((row as { langCode: string }).langCode)
              return
            }
            const isLang = 'isLanguage' in row && row.isLanguage
            if (!isLang && row.isExtension && row.type !== 'select' && row.type !== 'toggle') {
              const focusInput = () => {
                const input = this.inputRefs[row.key]?.isConnected
                  ? this.inputRefs[row.key]
                  : (document.querySelector(
                      '.nuxy-list-item--active nuxy-input input'
                    ) as HTMLInputElement | null)
                input?.focus()
                input?.select()
              }
              focusInput()
              queueMicrotask(focusInput)
              setTimeout(focusInput, 0)
            } else if (row.options && row.options.length > 0) {
              const currentValue = isLang
                ? ''
                : row.isExtension
                  ? (snap.extValues[(row as { extId: string }).extId]?.[
                      (row as { fieldKey: string }).fieldKey
                    ] ??
                    (row as { default?: unknown }).default ??
                    '')
                  : snap.settings[row.key as keyof NuxySettings]
              const currentIdx = row.options.findIndex(
                (o: SelectOption) => String(o.value) === String(currentValue)
              )
              this.setSelectFocused(Math.max(0, currentIdx))
              this.setActiveSelect(row.key)
            }
          }
        },
      },
    ]

    if (this.state.activeSelect !== null) {
      list.push({
        key: 'Escape',
        label: t('actions.closeSetting'),
        hint: 'Esc',
        handler: () => this.setActiveSelect(null),
      })
    }

    return list
  }

  handleRowSelect(row: AnyRow, value: unknown): void {
    this.actions?.handleRowSelect(row, value)
  }

  handleExtInputChange(row: AnyRow, value: string): void {
    this.actions?.handleExtInputChange(row, value)
  }

  handleExtInputBlur(row: AnyRow, value: string): void {
    this.actions?.handleExtInputBlur(row, value)
  }

  onSelectOpen(rowKey: string, globalIdx: number, focusedIdx: number): void {
    this.store.setState({ selectedRow: globalIdx, selectFocused: focusedIdx, activeSelect: rowKey })
  }

  onItemClick(globalIdx: number): void {
    this.store.setState({ selectedRow: globalIdx, activeSelect: null })
  }

  getRowValue(row: AnyRow): unknown {
    return getRowCurrentValue(
      row,
      this.state.settings,
      this.state.extValues,
      this.state.installedExtensions
    )
  }

  getRowOpts(row: AnyRow): SelectOption[] {
    return getRowOptions(row, this.getStateSnapshot())
  }
}
