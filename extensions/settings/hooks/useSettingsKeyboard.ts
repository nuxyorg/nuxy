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
  t: (key: string) => string
}

export interface RightPanelAction {
  key: string
  label: string
  hint?: string
  allowRepeat?: boolean
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
  t,
}: SettingsKeyboardParams): RightPanelAction[] {
  const actionsRef = React.useRef(actions)
  actionsRef.current = actions

  const rightPanelActions = React.useMemo((): RightPanelAction[] => {
    const list: RightPanelAction[] = [
      {
        key: 'ArrowUp',
        label: t('actions.previousSetting'),
        hint: '↑↓',
        allowRepeat: true,
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
        label: t('actions.nextSetting'),
        allowRepeat: true,
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
        label: t('actions.openSetting'),
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
                  actionsRef.current.addLanguage(opt.value as string)
                } else if (isToggle) {
                  actionsRef.current.toggleExtension(row.extId, opt.value as boolean)
                } else if (row.isExtension) {
                  actionsRef.current.updateExtSetting(row.extId, row.fieldKey, opt.value)
                } else {
                  actionsRef.current.updateSetting(activeSelect as keyof NuxySettings, opt.value)
                }
              }
              setActiveSelect(null)
            }
          } else {
            const row = allRows[selectedRow]
            if (row) {
              const isLang = 'isLanguage' in row && row.isLanguage
              const isLangRemove = 'isLanguageRemove' in row && row.isLanguageRemove
              if (isLangRemove) {
                actionsRef.current.removeLanguage(row.langCode)
                return
              }
              if (!isLang && row.isExtension && row.type !== 'select' && row.type !== 'toggle') {
                inputRefs.current[row.key]?.focus()
                inputRefs.current[row.key]?.select()
              } else if (row.options && row.options.length > 0) {
                const currentValue = isLang
                  ? ''
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
        label: t('actions.closeSetting'),
        hint: 'Esc',
        handler: () => setActiveSelect(null),
      })
    }

    return list
  }, [activeSelect])

  return rightPanelActions
}
