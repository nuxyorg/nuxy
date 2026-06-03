const React = window.React

import type { UseTwoPanelNavResult } from '@nuxy/ui'
import { useSettingsData } from './hooks/useSettingsData.ts'
import { useSettingsMeta } from './hooks/useSettingsMeta.ts'
import { useSettingsActions } from './hooks/useSettingsActions.ts'
import { useSettingsKeyboard } from './hooks/useSettingsKeyboard.ts'
import { SettingsLeftPanel } from './components/SettingsLeftPanel.tsx'
import { SettingsRightPanel } from './components/SettingsRightPanel.tsx'

const _useTwoPanelNav =
  (window.UI || {}).useTwoPanelNav ||
  (({ sections }: { sections: Array<{ id: string }> }) => ({
    focusArea: 'right' as const,
    setFocusArea: () => {},
    activeSectionId: sections[0]?.id ?? '',
    goToSection: () => {},
    sectionStartIndex: {} as Record<string, number>,
    getSectionIdForIndex: () => sections[0]?.id ?? '',
    onItemSelected: () => {},
    setActiveSection: () => {},
  }))

interface Props {
  query: string
}

export default function SettingsView({ query: _query }: Props) {
  const { TwoPanel } = window.UI || {}

  const [selectedRow, setSelectedRow] = React.useState<number>(-1)
  const [activeSelect, setActiveSelect] = React.useState<string | null>(null)
  const [selectFocused, setSelectFocused] = React.useState<number>(0)

  const data = useSettingsData()
  const meta = useSettingsMeta({
    themes: data.themes,
    iconPacks: data.iconPacks,
    systemFonts: data.systemFonts,
    extSchemas: data.extSchemas,
    installedExtensions: data.installedExtensions,
  })
  const actions = useSettingsActions({
    settings: data.settings,
    extValues: data.extValues,
    fontFamilyMap: meta.fontFamilyMap,
    setSettings: data.setSettings,
    setExtValues: data.setExtValues,
    setActiveSelect,
  })

  const rightPanelRef = React.useRef<HTMLDivElement | null>(null)
  const sectionRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})
  const navRef = React.useRef<UseTwoPanelNavResult | null>(null)

  const stateRef = React.useRef({
    settings: data.settings,
    selectedRow,
    activeSelect,
    selectFocused,
    allRows: meta.allRows,
    extValues: data.extValues,
    sectionsToRender: meta.sectionsToRender,
  })
  stateRef.current = {
    settings: data.settings,
    selectedRow,
    activeSelect,
    selectFocused,
    allRows: meta.allRows,
    extValues: data.extValues,
    sectionsToRender: meta.sectionsToRender,
  }

  const rightPanelActions = useSettingsKeyboard({
    stateRef,
    navRef,
    activeSelect,
    setSelectedRow,
    setActiveSelect,
    setSelectFocused,
    inputRefs,
    actions,
  })

  const nav = _useTwoPanelNav({
    sections: meta.navSections,
    selectOpen: activeSelect !== null,
    initialFocusArea: 'right',
    onSectionChange: (id: string) => {
      const el = sectionRefs.current[id]
      if (el && rightPanelRef.current) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    onFocusRight: (id: string) => {
      const startIdx = navRef.current?.sectionStartIndex[id] ?? 0
      setSelectedRow(startIdx)
      setActiveSelect(null)
    },
    rightPanelActions,
  })
  navRef.current = nav

  if (!TwoPanel) return null

  const focusArea: string = nav.focusArea ?? 'right'
  const activeSectionId: string = nav.activeSectionId ?? meta.navSections[0]?.id ?? ''

  const left = (
    <SettingsLeftPanel
      navSections={meta.navSections}
      activeSectionId={activeSectionId}
      sectionStartIndex={nav.sectionStartIndex}
      onTabChange={(id: string) => {
        const startIdx = nav.sectionStartIndex[id] ?? 0
        setSelectedRow(startIdx - 1)
        nav.goToSection(id)
        setActiveSelect(null)
      }}
    />
  )

  const right = (
    <SettingsRightPanel
      sectionsToRender={meta.sectionsToRender}
      settings={data.settings}
      extValues={data.extValues}
      installedExtensions={data.installedExtensions}
      selectedRow={selectedRow}
      activeSelect={activeSelect}
      selectFocused={selectFocused}
      focusArea={focusArea}
      activeSectionId={activeSectionId}
      sectionStartIndex={nav.sectionStartIndex}
      sectionRefs={sectionRefs}
      inputRefs={inputRefs}
      rightPanelRef={rightPanelRef}
      stateRef={stateRef}
      onItemSelect={actions.handleRowSelect}
      onSelectOpen={(rowKey, globalIdx, focusedIdx) => {
        setSelectedRow(globalIdx)
        nav.onItemSelected(globalIdx)
        nav.setFocusArea('right')
        setSelectFocused(focusedIdx)
        setActiveSelect(rowKey)
      }}
      onSelectClose={() => setActiveSelect(null)}
      onItemClick={(globalIdx) => {
        setSelectedRow(globalIdx)
        nav.onItemSelected(globalIdx)
        nav.setFocusArea('right')
      }}
      onExtInputChange={actions.handleExtInputChange}
      onExtInputBlur={actions.handleExtInputBlur}
    />
  )

  return <TwoPanel left={left} right={right} split="auto" />
}
