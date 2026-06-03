const React = window.React

import type { AnyRow, SelectOption } from '../types.ts'

export interface SettingRowProps {
  row: AnyRow
  value: unknown
  options: SelectOption[]
  isOpen: boolean
  focusedIndex: number
  globalIdx: number
  selectedRow: number
  focusArea: string
  activeSectionId: string
  sectionId: string
  activeSelect: string | null
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  onSelect: (v: unknown) => void
  onOpen: (idx: number) => void
  onClose: () => void
  onItemClick: () => void
  onExtInputChange: (v: string) => void
  onExtInputBlur: (v: string) => void
}

export function SettingRow({
  row,
  value,
  options,
  isOpen,
  focusedIndex,
  globalIdx,
  selectedRow,
  focusArea,
  activeSectionId,
  sectionId,
  activeSelect,
  inputRefs,
  onSelect,
  onOpen,
  onClose,
  onItemClick,
  onExtInputChange,
  onExtInputBlur,
}: SettingRowProps) {
  const { ListItem, ListItemBody, ListItemText, ListItemActions, SelectBox, Input } = window.UI || {}
  if (!ListItem) return null

  const isLanguageRow = 'isLanguage' in row && row.isLanguage
  const isExtToggleRow = 'isExtToggle' in row && row.isExtToggle
  const isSelectType =
    isLanguageRow || isExtToggleRow || !row.isExtension || row.type === 'select' || row.type === 'toggle'

  return (
    <ListItem
      key={row.key}
      active={
        focusArea === 'right' &&
        globalIdx === selectedRow &&
        activeSelect === null &&
        sectionId === activeSectionId
      }
      onClick={onItemClick}
    >
      {ListItemBody && (
        <ListItemBody>
          {ListItemText && <ListItemText>{row.label}</ListItemText>}
          {row.isExtension && row.description && (
            <span style={{ fontSize: '0.75em', opacity: 0.6 }}>{row.description}</span>
          )}
        </ListItemBody>
      )}
      {ListItemActions && (
        <ListItemActions>
          {isSelectType && SelectBox ? (
            <SelectBox
              options={options}
              value={value}
              open={isOpen}
              focusedIndex={focusedIndex}
              placeholder={options?.length === 0 ? '(none)' : '—'}
              searchable={
                isLanguageRow
                  ? true
                  : row.isExtension
                    ? false
                    : ('searchable' in row ? row.searchable : false) || false
              }
              onSelect={onSelect}
              onClose={onClose}
              onOpen={onOpen}
            />
          ) : (
            Input &&
            row.isExtension && (
              <Input
                ref={(el: HTMLInputElement | null) => {
                  inputRefs.current[row.key] = el
                }}
                type={row.type === 'color' ? 'color' : 'text'}
                value={String(value)}
                placeholder={('placeholder' in row ? row.placeholder : '') || ''}
                style={{ width: row.type === 'color' ? '2.5em' : '10em' }}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onExtInputChange(e.target.value)}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) => onExtInputBlur(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter' || e.key === 'Escape') {
                    e.currentTarget.blur()
                  }
                }}
              />
            )
          )}
        </ListItemActions>
      )}
    </ListItem>
  )
}
