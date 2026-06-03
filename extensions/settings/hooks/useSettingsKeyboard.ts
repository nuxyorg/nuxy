const React = window.React

import type { NuxySettings, AnyRow, SelectOption, StateSnapshot } from '../types.ts'
import type { UseTwoPanelNavResult } from '@nuxy/ui'
import type { SettingsActions } from './useSettingsActions.ts'

export interface SettingsKeyboardParams {
  stateRef: React.MutableRefObject<StateSnapshot>
  navRef: React.MutableRefObject<UseTwoPanelNavResult | null>
  activeSelect: string | null
  setSelectedRow: React.Dispatch<React.SetStateAction<number>>
  setActiveSelect: React.Dispatch<React.SetStateAction<string | null>>
  setSelectFocused: React.Dispatch<React.SetStateAction<number>>
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>
  actions: SettingsActions
}

export interface RightPanelAction {
  key: string
  label: string
  hint?: string
  handler: () => void
}

export function useSettingsKeyboard({
  stateRef,
  navRef,
  activeSelect,
  setSelectedRow,
  setActiveSelect,
  setSelectFocused,
  inputRefs,
  actions,
}: SettingsKeyboardParams): RightPanelAction[] {
  const { updateSetting, updateLanguageSlot, toggleExtension, updateExtSetting } = actions

  const rightPanelActions = React.useMemo((): RightPanelAction[] => {
    const list: RightPanelAction[] = [
      {
        key: 'ArrowUp',
        label: 'Previous setting',
        hint: '↑↓',
        handler: () => {
          const { activeSelect } = stateRef.current
          if (activeSelect !== null) {
            setSelectFocused((i) => Math.max(i - 1, 0))
          } else {
            setSelectedRow((prev) => {
              if (prev > 0) {
                const nextIdx = prev - 1
                navRef.current?.onItemSelected(nextIdx)
                return nextIdx
              }
              if (prev === 0) return -1
              return prev
            })
          }
        },
      },
      {
        key: 'ArrowDown',
        label: 'Next setting',
        handler: () => {
          const { activeSelect, allRows } = stateRef.current
          if (activeSelect !== null) {
            const row = allRows.find((r: AnyRow) => r.key === activeSelect)
            if (row) setSelectFocused((i) => Math.min(i + 1, row.options.length - 1))
          } else {
            setSelectedRow((prev) => {
              if (prev < 0) {
                const nextIdx = 0
                navRef.current?.onItemSelected(nextIdx)
                return nextIdx
              }
              if (prev < allRows.length - 1) {
                const nextIdx = prev + 1
                navRef.current?.onItemSelected(nextIdx)
                return nextIdx
              }
              return prev
            })
          }
        },
      },
      {
        key: 'Enter',
        label: 'Open setting',
        hint: '↵',
        handler: () => {
          const { selectedRow, activeSelect, selectFocused, allRows, extValues, settings } =
            stateRef.current
          if (activeSelect !== null) {
            const row = allRows.find((r: AnyRow) => r.key === activeSelect)
            if (row) {
              const opt = row.options[selectFocused]
              if (opt) {
                const isLang = 'isLanguage' in row && row.isLanguage
                const isToggle = 'isExtToggle' in row && row.isExtToggle
                if (isLang) {
                  updateLanguageSlot(row.langIndex, opt.value as string)
                } else if (isToggle) {
                  toggleExtension(row.extId, opt.value as boolean)
                } else if (row.isExtension) {
                  updateExtSetting(row.extId, row.fieldKey, opt.value)
                } else {
                  updateSetting(activeSelect as keyof NuxySettings, opt.value)
                }
              }
              setActiveSelect(null)
            }
          } else {
            const row = allRows[selectedRow]
            if (row) {
              const isLang = 'isLanguage' in row && row.isLanguage
              if (!isLang && row.isExtension && row.type !== 'select' && row.type !== 'toggle') {
                inputRefs.current[row.key]?.focus()
                inputRefs.current[row.key]?.select()
              } else if (row.options && row.options.length > 0) {
                const currentValue = isLang
                  ? (settings.preferredLanguages?.[row.langIndex] ?? '')
                  : row.isExtension
                    ? (extValues[row.extId]?.[row.fieldKey] ?? row.default ?? '')
                    : settings[row.key]
                const currentIdx = row.options.findIndex(
                  (o: SelectOption) => String(o.value) === String(currentValue)
                )
                setSelectFocused(Math.max(0, currentIdx))
                setActiveSelect(row.key)
              }
            }
          }
        },
      },
    ]

    if (activeSelect !== null) {
      list.push({
        key: 'Escape',
        label: 'Close setting',
        hint: 'Esc',
        handler: () => setActiveSelect(null),
      })
    }

    return list
  }, [activeSelect])

  return rightPanelActions
}
