import { h } from '../ce-utils.ts'
import {
  ceInput,
  ceList,
  ceListItem,
  ceListItemActions,
  ceListItemBody,
  ceListItemText,
  ceScrollArea,
  ceSectionHeader,
  ceSelectBox,
  ceTabBar,
  ceTwoPanel,
} from '../ui-ce.ts'
import type { SettingsController } from './settings-controller.ts'
import type { AnyRow, RenderSection } from './types.ts'

function renderSettingRow(ctrl: SettingsController, section: RenderSection, row: AnyRow, i: number): HTMLElement {
  const meta = ctrl.computedMeta
  const nav = ctrl.navigation
  if (!meta || !nav) return document.createElement('div')

  const globalIdx = (nav.sectionStartIndex[section.id] ?? 0) + i
  const currentValue = ctrl.getRowValue(row)
  const options = ctrl.getRowOpts(row)
  const { selectedRow, activeSelect, selectFocused } = ctrl.state
  const focusArea = nav.focusArea
  const activeSectionId = nav.activeSectionId

  const isLanguageRow = 'isLanguage' in row && row.isLanguage
  const isLanguageRemoveRow = 'isLanguageRemove' in row && row.isLanguageRemove
  const isExtToggleRow = 'isExtToggle' in row && row.isExtToggle
  const isSelectType =
    isLanguageRow ||
    isExtToggleRow ||
    !row.isExtension ||
    row.type === 'select' ||
    row.type === 'toggle'

  const isActive =
    focusArea === 'right' &&
    globalIdx === selectedRow &&
    activeSelect === null &&
    section.id === activeSectionId

  if (isLanguageRemoveRow) {
    return ceListItem({ active: isActive, onClick: () => ctrl.onItemClick(globalIdx) },
      ceListItemBody(null, ceListItemText(null, row.label)),
      ceListItemActions(null, h('span', { style: { fontSize: '0.75em', opacity: '0.35' } }, '↵ remove'))
    )
  }

  const actionsChildren: HTMLElement[] = []
  if (isSelectType) {
    actionsChildren.push(
      ceSelectBox({
        options,
        value: currentValue,
        open: activeSelect === row.key,
        focusedIndex: selectFocused,
        placeholder: options?.length === 0 ? '(none)' : '—',
        searchable: isLanguageRow
          ? true
          : row.isExtension
            ? false
            : ('searchable' in row ? row.searchable : false) || false,
        onSelect: (v) => ctrl.handleRowSelect(row, v),
        onClose: () => ctrl.setActiveSelect(null),
        onOpen: (idx) => ctrl.onSelectOpen(row.key, globalIdx, idx),
      })
    )
  } else if (row.isExtension) {
    actionsChildren.push(
      ceInput({
        type: row.type === 'color' ? 'color' : 'text',
        value: String(currentValue),
        placeholder: ('placeholder' in row ? row.placeholder : '') || '',
        style: { width: row.type === 'color' ? '2.5em' : '10em' },
        ref: (el) => {
          ctrl.inputRefs[row.key] = el
        },
        onChange: (v) => ctrl.handleExtInputChange(row, v),
        onBlur: (v) => ctrl.handleExtInputBlur(row, v),
        onKeyDown: (e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            ;(e.target as HTMLInputElement).blur()
          }
        },
      })
    )
  }

  const bodyChildren: HTMLElement[] = [ceListItemText(null, row.label)]
  if (row.isExtension && row.description) {
    bodyChildren.push(h('span', { style: { fontSize: '0.75em', opacity: '0.6' } }, row.description))
  }

  return ceListItem({ active: isActive, onClick: () => ctrl.onItemClick(globalIdx) },
    ceListItemBody(null, ...bodyChildren),
    ceListItemActions(null, ...actionsChildren)
  )
}

export function renderSettingsApp(ctrl: SettingsController): HTMLElement | null {
  const meta = ctrl.computedMeta
  const nav = ctrl.navigation
  if (!meta || !nav) return null

  const left = ceTabBar({
    tabs: meta.navSections,
    active: nav.activeSectionId,
    orientation: 'vertical',
    onChange: (id) => ctrl.onTabChange(id),
  })

  const rightSections: HTMLElement[] = []
  for (const section of meta.sectionsToRender) {
    rightSections.push(
      ceSectionHeader({
        label: section.label,
        ref: (el) => {
          ctrl.sectionRefs[section.id] = el
        },
      })
    )
    const list = ceList()
    section.resolvedRows.forEach((row, i) => {
      list.appendChild(renderSettingRow(ctrl, section, row, i))
    })
    rightSections.push(list)
    if (section.id === 'language') {
      rightSections.push(
        h('div', { style: { padding: '2px 12px 10px', fontSize: '0.75em', opacity: '0.45' } },
          ctrl.t.t('language.hint'))
      )
    }
  }

  const right = ceScrollArea(
    { style: { flex: '1' }, ref: (el) => { ctrl.rightPanelRef = el as HTMLDivElement } },
    ...rightSections
  )

  return ceTwoPanel(left, right, {
    split: 'auto',
    style: { flex: '1', minHeight: '0', maxHeight: 'calc(100vh - 60px)', overflow: 'hidden' },
  })
}
