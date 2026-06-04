const React = window.React

import type { AnyRow, NuxySettings, RenderSection, StateSnapshot } from '../types.ts'
import type { InstalledExtension } from '../hooks/useSettingsData.ts'
import { getRowCurrentValue, getRowOptions } from '../utils/settingsOptions.ts'
import { SettingRow } from './SettingRow.tsx'

export interface SettingsRightPanelProps {
  sectionsToRender: RenderSection[]
  settings: NuxySettings
  extValues: Record<string, Record<string, unknown>>
  installedExtensions: InstalledExtension[]
  selectedRow: number
  activeSelect: string | null
  selectFocused: number
  focusArea: string
  activeSectionId: string
  sectionStartIndex: Record<string, number>
  sectionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  rightPanelRef: React.MutableRefObject<HTMLDivElement | null>
  stateRef: React.MutableRefObject<StateSnapshot>
  languageHintText: string
  onItemSelect: (row: AnyRow, value: unknown) => void
  onSelectOpen: (rowKey: string, globalIdx: number, focusedIdx: number) => void
  onSelectClose: () => void
  onItemClick: (globalIdx: number) => void
  onExtInputChange: (row: AnyRow, value: string) => void
  onExtInputBlur: (row: AnyRow, value: string) => void
}

export function SettingsRightPanel({
  sectionsToRender,
  settings,
  extValues,
  installedExtensions,
  selectedRow,
  activeSelect,
  selectFocused,
  focusArea,
  activeSectionId,
  sectionStartIndex,
  sectionRefs,
  inputRefs,
  rightPanelRef,
  stateRef,
  languageHintText,
  onItemSelect,
  onSelectOpen,
  onSelectClose,
  onItemClick,
  onExtInputChange,
  onExtInputBlur,
}: SettingsRightPanelProps) {
  const { List, SectionHeader, ScrollArea } = window.UI || {}
  if (!ScrollArea) return null

  return (
    <ScrollArea ref={rightPanelRef} style={{ flex: 1 }}>
      {sectionsToRender.map((section: RenderSection) => {
        const sectionOffset = sectionStartIndex[section.id] ?? 0
        return (
          <React.Fragment key={section.id}>
            {SectionHeader && (
              <SectionHeader
                ref={(el: HTMLDivElement | null) => {
                  sectionRefs.current[section.id] = el
                }}
                label={section.label}
              />
            )}
            {List && (
              <List>
                {section.resolvedRows.map((row: AnyRow, i: number) => {
                  const globalIdx = sectionOffset + i
                  const currentValue = getRowCurrentValue(
                    row,
                    settings,
                    extValues,
                    installedExtensions
                  )
                  const options = getRowOptions(row, stateRef.current)

                  return (
                    <SettingRow
                      key={row.key}
                      row={row}
                      value={currentValue}
                      options={options}
                      isOpen={activeSelect === row.key}
                      focusedIndex={selectFocused}
                      globalIdx={globalIdx}
                      selectedRow={selectedRow}
                      focusArea={focusArea}
                      activeSectionId={activeSectionId}
                      sectionId={section.id}
                      activeSelect={activeSelect}
                      inputRefs={inputRefs}
                      onSelect={(v: unknown) => onItemSelect(row, v)}
                      onClose={onSelectClose}
                      onOpen={(idx: number) => onSelectOpen(row.key, globalIdx, idx)}
                      onItemClick={() => onItemClick(globalIdx)}
                      onExtInputChange={(v: string) => onExtInputChange(row, v)}
                      onExtInputBlur={(v: string) => onExtInputBlur(row, v)}
                    />
                  )
                })}
              </List>
            )}
            {section.id === 'language' && (
              <div style={{ padding: '2px 12px 10px', fontSize: '0.75em', opacity: 0.45 }}>
                {languageHintText}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </ScrollArea>
  )
}
