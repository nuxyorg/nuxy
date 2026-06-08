import { h } from '../ce-utils.ts'
import {
  ceAlert,
  ceEmptyState,
  ceList,
  ceListItem,
  ceListItemBody,
  ceListItemMeta,
  ceListItemText,
  cePropertiesPanel,
  ceTwoPanel,
} from '../ui-ce.ts'
import type { NyaaController } from './nyaa-controller.ts'
import type { NyaaResult } from './types.ts'

function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function renderNyaaApp(ctrl: NyaaController): HTMLElement {
  return ceTwoPanel(renderLeftPanel(ctrl), renderRightPanel(ctrl), {
    style: { flex: '1', minHeight: '0' },
  })
}

function renderLeftPanel(ctrl: NyaaController): HTMLElement {
  const { results, loading, error, query, selectedIndex, copiedId, multiSelectMode, checkedIds } =
    ctrl.state
  const t = ctrl.t.t

  if (!query.trim()) {
    return ceEmptyState({ message: t('search.empty.message'), hint: t('search.empty.hint') })
  }
  if (loading) {
    return ceEmptyState({ message: t('search.loading.message'), hint: t('search.loading.hint') })
  }
  if (error) {
    return ceAlert({ variant: 'error' }, error)
  }
  if (results.length === 0) {
    return ceEmptyState({ message: t('search.noResults.message'), hint: t('search.noResults.hint') })
  }

  const list = ceList()
  results.forEach((item, idx) => {
    list.appendChild(renderResultItem(ctrl, item, idx, selectedIndex, copiedId, multiSelectMode, checkedIds, t))
  })
  return list
}

function renderResultItem(
  ctrl: NyaaController,
  item: NyaaResult,
  idx: number,
  selectedIndex: number,
  copiedId: string | null,
  multiSelectMode: boolean,
  checkedIds: Set<string>,
  t: (key: string) => string
): HTMLElement {
  const isActive = idx === selectedIndex
  const isCopied = copiedId === item.id
  const isChecked = checkedIds.has(item.id)
  const textVariant = isCopied
    ? 'success'
    : item.status === 'success'
      ? 'success'
      : item.status === 'danger'
        ? 'error'
        : 'default'

  const row = ceListItem({
    active: isActive,
    onClick: () => {
      if (multiSelectMode) ctrl.toggleCheck(item.id)
      else ctrl.setSelectedIndex(idx)
    },
  })

  if (multiSelectMode) {
    const checkWrap = h('div', {
      style: {
        display: 'flex',
        alignItems: 'center',
        paddingRight: 'var(--space-2)',
        flexShrink: '0',
      },
    })
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.checked = isChecked
    checkbox.setAttribute('aria-label', item.title)
    checkbox.style.cssText =
      'width:14px;height:14px;cursor:pointer;accent-color:var(--color-accent, var(--color-primary));flex-shrink:0'
    checkbox.addEventListener('change', () => ctrl.toggleCheck(item.id))
    checkbox.addEventListener('click', (e) => e.stopPropagation())
    checkWrap.appendChild(checkbox)
    row.appendChild(checkWrap)
  }

  row.appendChild(
    ceListItemBody(null,
      ceListItemText({ variant: textVariant }, isCopied ? t('item.copied') : item.title),
      ceListItemMeta(null, `${item.seeds}S / ${item.leeches}L · ${item.size}`)
    )
  )
  return row
}

function renderRightPanel(ctrl: NyaaController): HTMLElement {
  const { multiSelectMode, checkedIds, copiedId } = ctrl.state
  const t = ctrl.t.t
  const selectedItem =
    !multiSelectMode && ctrl.state.selectedIndex >= 0
      ? ctrl.state.results[ctrl.state.selectedIndex]
      : null

  if (multiSelectMode) {
    const count = checkedIds.size
    return h('div', {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: 'var(--space-5)',
        textAlign: 'center',
      },
    },
      h('div', {
        style: {
          fontSize: 'var(--font-lg, 1.25rem)',
          fontWeight: '700',
          color: count > 0 ? 'var(--color-accent, var(--color-primary))' : 'inherit',
          opacity: count > 0 ? '1' : '0.4',
        },
      }, count > 0 ? t('item.selectedCount').replace('{count}', String(count)) : t('item.selectPromptMulti')),
      count > 0
        ? h('div', { style: { fontSize: 'var(--font-xs)', opacity: '0.5' } }, t('item.multiSelectHint'))
        : null
    )
  }

  if (!selectedItem) {
    return h('div', {
      style: {
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: '0.4',
        fontSize: 'var(--font-sm)',
      },
    }, t('item.selectPrompt'))
  }

  const isCopied = copiedId === selectedItem.id
  const statusValue =
    selectedItem.status === 'success'
      ? t('details.status.trusted')
      : selectedItem.status === 'danger'
        ? t('details.status.remake')
        : t('details.status.normal')

  const rows = [
    { label: t('details.category'), value: selectedItem.category },
    { label: t('details.size'), value: selectedItem.size },
    { label: t('details.date'), value: formatDate(selectedItem.date) },
    { label: t('details.seeders'), value: String(selectedItem.seeds) },
    { label: t('details.leechers'), value: String(selectedItem.leeches) },
    { label: t('details.status.label'), value: statusValue },
  ]

  const wrap = h('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      padding: 'var(--space-5)',
      overflow: 'hidden',
      height: 'calc(100% - var(--space-6))',
      gap: 'var(--space-4)',
    },
  })

  wrap.appendChild(
    h('div', {
      style: {
        fontSize: 'var(--font-sm)',
        fontWeight: '600',
        lineHeight: '1.4',
        wordBreak: 'break-word',
        color: isCopied ? 'var(--color-success)' : 'inherit',
      },
    }, isCopied ? t('item.magnetCopied') : selectedItem.title)
  )

  wrap.appendChild(cePropertiesPanel({ title: t('details.title'), rows }))

  wrap.appendChild(
    h('div', {
      style: {
        fontSize: 'var(--font-xs)',
        opacity: '0.35',
        wordBreak: 'break-all',
        overflow: 'hidden',
        maxHeight: '3em',
        fontFamily: 'monospace',
      },
    }, selectedItem.magnet.slice(0, 100) + (selectedItem.magnet.length > 100 ? '…' : ''))
  )

  return wrap
}
