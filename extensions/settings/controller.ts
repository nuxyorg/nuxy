import type { ShellKeyAction } from '@nuxyorg/core'
import { BaseExtensionController, setToolSearchPlaceholder } from '@nuxyorg/extension-sdk'
import { createSettingsActions, type SettingsActions } from './actions.ts'
import { createDefaultSettingsData, loadSettingsData, type SettingsDataState } from './data.ts'
import { computeSettingsMeta, filterSettingsByQuery, type SettingsMeta } from './meta.ts'
import type { AnyRow, NuxySettings, SelectOption, StateSnapshot } from './types.ts'
import { getRowCurrentValue, getRowOptions } from './utils/settingsOptions.ts'

const EXT_ID = 'com.nuxy.settings'

export interface SettingsUIState {
  selectedRow: number
  activeSelect: string | null
  selectFocused: number
  selectedSectionId: string | null
  focusedPanel: 'left' | 'right'
}

export interface SettingsControllerState extends SettingsDataState, SettingsUIState {}

export class SettingsController extends BaseExtensionController<SettingsControllerState> {
  readonly inputRefs: Record<string, HTMLInputElement | null> = {}

  private actions: SettingsActions | null = null
  private meta: SettingsMeta | null = null
  private filterQuery = ''
  private dataCleanup: (() => void) | null = null
  private pendingExtToggles = new Map<string, boolean>()

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        ...createDefaultSettingsData(),
        selectedRow: -1,
        activeSelect: null,
        selectFocused: 0,
        selectedSectionId: null,
        focusedPanel: 'right',
      },
      onUpdate
    )
  }

  protected onStoreChange(): void {
    this.recomputeMeta()
    this.onUpdate()
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
    this.syncSearchPlaceholder()
    this.bindKeyActions()
  }

  disconnect(): void {
    for (const [extId, enabled] of this.pendingExtToggles) {
      window.core?.ipc?.invoke('kernel', 'setExtensionEnabled', { extId, enabled }).catch(() => {})
    }
    this.pendingExtToggles.clear()
    this.dataCleanup?.()
    this.dataCleanup = null
    this.filterQuery = ''
    this.t.destroy()
    window.core?.shell?.registerKeyActions(null)
  }

  toggleExtPending(extId: string, enabled: boolean): void {
    this.pendingExtToggles.set(extId, enabled)
    this.store.setState((prev) => ({
      installedExtensions: prev.installedExtensions.map((ext) =>
        ext.id === extId ? { ...ext, disabled: !enabled } : ext
      ),
    }))
  }

  setFilterQuery(query: string): void {
    const next = query ?? ''
    if (this.filterQuery === next) return
    this.filterQuery = next
    this.store.setState({ selectedRow: -1, activeSelect: null, focusedPanel: 'right' })
    this.recomputeMeta()
  }

  syncSearchPlaceholder(): void {
    this.recomputeMeta()
    setToolSearchPlaceholder(this.t.t, 'search.placeholder')
  }

  setSelectedRow(index: number | ((prev: number) => number)): void {
    const prev = this.state.selectedRow
    const next = typeof index === 'function' ? index(prev) : index
    this.store.setState({ selectedRow: next })
  }

  setActiveSelect(key: string | null): void {
    this.store.setState({ activeSelect: key })
  }

  get effectiveSectionId(): string | null {
    const id = this.state.selectedSectionId
    const sections = this.meta?.sectionsToRender ?? []
    if (!sections.length) return null
    if (id && sections.some((s) => s.id === id)) return id
    return sections[0].id
  }

  setSelectedSection(id: string): void {
    this.store.setState({
      selectedSectionId: id,
      selectedRow: -1,
      activeSelect: null,
      focusedPanel: 'right',
    })
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
    const base = computeSettingsMeta({
      themes: s.themes,
      iconPacks: s.iconPacks,
      systemFonts: s.systemFonts,
      extSchemas: s.extSchemas,
      installedExtensions: s.installedExtensions,
      ollamaModelOptions: s.ollamaModelOptions,
      preferredLanguages: s.settings.preferredLanguages ?? [],
      t: this.t.t,
    })
    this.meta = filterSettingsByQuery(base, this.filterQuery)
  }

  private bindKeyActions(): void {
    window.core?.shell?.registerKeyActions(() => this.buildKeyActions())
  }

  private buildKeyActions(): ShellKeyAction[] {
    const t = this.t.t
    const { focusedPanel } = this.state

    if (focusedPanel === 'left') {
      return this.buildLeftPanelKeyActions(t)
    }

    return this.buildRightPanelKeyActions(t)
  }

  private buildLeftPanelKeyActions(t: (key: string) => string): ShellKeyAction[] {
    const sections = this.meta?.sectionsToRender ?? []
    const currentIdx = sections.findIndex((s) => s.id === this.effectiveSectionId)

    const enterRight = () => {
      const sectionId = this.effectiveSectionId
      if (!sectionId) return
      const start = this.meta?.sectionStartIndex[sectionId] ?? 0
      this.store.setState({ focusedPanel: 'right', selectedRow: start })
    }

    return [
      {
        key: 'ArrowUp',
        label: t('actions.previousSetting'),
        hint: '↑↓',
        allowRepeat: true,
        handler: () => {
          if (currentIdx > 0) {
            this.store.setState({
              selectedSectionId: sections[currentIdx - 1].id,
              selectedRow: -1,
              activeSelect: null,
            })
          }
        },
      },
      {
        key: 'ArrowDown',
        label: t('actions.nextSetting'),
        allowRepeat: true,
        handler: () => {
          if (currentIdx < sections.length - 1) {
            this.store.setState({
              selectedSectionId: sections[currentIdx + 1].id,
              selectedRow: -1,
              activeSelect: null,
            })
          }
        },
      },
      {
        key: 'ArrowRight',
        label: '',
        handler: enterRight,
      },
      {
        key: 'Enter',
        label: t('actions.openSetting'),
        hint: '↵',
        handler: enterRight,
      },
    ]
  }

  private buildRightPanelKeyActions(t: (key: string) => string): ShellKeyAction[] {
    const list: ShellKeyAction[] = [
      {
        key: 'ArrowLeft',
        label: '',
        handler: () => {
          if (this.state.activeSelect !== null) return
          this.store.setState({ focusedPanel: 'left', selectedRow: -1 })
        },
      },
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
            const sectionId = this.effectiveSectionId
            if (!sectionId) return
            const start = this.meta?.sectionStartIndex[sectionId] ?? 0
            this.setSelectedRow((prev) => {
              if (prev < start) return prev
              if (prev === start) return -1
              return prev - 1
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
            const sectionId = this.effectiveSectionId
            if (!sectionId) return
            const section = snap.sectionsToRender.find((s) => s.id === sectionId)
            if (!section) return
            const start = this.meta?.sectionStartIndex[sectionId] ?? 0
            const lastIdx = start + section.resolvedRows.length - 1
            this.setSelectedRow((prev) => {
              if (prev < start) return start
              return Math.min(prev + 1, lastIdx)
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
            const isExtToggle = 'isExtToggle' in row && row.isExtToggle
            if (isExtToggle) {
              const currentEnabled = !(
                this.state.installedExtensions.find((e) => e.id === row.extId)?.disabled ?? false
              )
              this.toggleExtPending(row.extId, !currentEnabled)
              return
            }
            const isLang = 'isLanguage' in row && row.isLanguage
            if (!isLang && row.isExtension && row.type !== 'select' && row.type !== 'toggle') {
              const focusInput = () => {
                this.inputRefs[row.key]?.focus()
                this.inputRefs[row.key]?.select()
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
    if ('isExtToggle' in row && row.isExtToggle) {
      this.toggleExtPending(row.extId, value as boolean)
      return
    }
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
