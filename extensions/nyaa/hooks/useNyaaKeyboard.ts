const React = window.React

import type { NyaaResult } from '../types.ts'
import type { EnterAction } from './useNyaaActions.ts'

interface Params {
  results: NyaaResult[]
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  checkedIds: Set<string>
  onToggleCheck: (id: string) => void
  multiSelectMode: boolean
  setMultiSelectMode: (val: boolean) => void
  enterAction: EnterAction
  onCopyMagnet: (id: string, magnet: string) => void
  onDownloadTorrent: (id: string) => void
  onCopyMagnets: (items: Array<{ id: string; magnet: string }>) => void
  onDownloadTorrents: (ids: string[]) => void
  t: (key: string) => string
}

export function useNyaaKeyboard({
  results,
  selectedIndex,
  setSelectedIndex,
  checkedIds,
  onToggleCheck,
  multiSelectMode,
  setMultiSelectMode,
  enterAction,
  onCopyMagnet,
  onDownloadTorrent,
  onCopyMagnets,
  onDownloadTorrents,
  t,
}: Params): void {
  const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

  // Keep stable refs to avoid stale closures
  const resultsRef = React.useRef(results)
  const selectedIndexRef = React.useRef(selectedIndex)
  const checkedIdsRef = React.useRef(checkedIds)
  const multiSelectModeRef = React.useRef(multiSelectMode)
  const enterActionRef = React.useRef(enterAction)

  React.useLayoutEffect(() => {
    resultsRef.current = results
    selectedIndexRef.current = selectedIndex
    checkedIdsRef.current = checkedIds
    multiSelectModeRef.current = multiSelectMode
    enterActionRef.current = enterAction
  })

  // Primary Enter label depends on mode and setting
  const enterLabel = multiSelectMode
    ? t('actions.checkToggle')
    : enterAction === 'copyMagnet'
      ? t('actions.copyMagnet')
      : t('actions.downloadTorrent')

  const shiftEnterLabel = !multiSelectMode
    ? enterAction === 'copyMagnet'
      ? t('actions.downloadTorrent')
      : t('actions.copyMagnet')
    : ''

  _useToolKeyActions([
    {
      key: 'ArrowUp',
      label: t('actions.navigate'),
      hint: '↑↓',
      handler: () => {
        if (resultsRef.current.length === 0) return
        setSelectedIndex((prev: number) => (prev <= 0 ? -1 : prev - 1))
      },
    },
    {
      key: 'ArrowDown',
      label: '',
      handler: () => {
        if (resultsRef.current.length === 0) return
        setSelectedIndex((prev: number) => Math.min(prev + 1, resultsRef.current.length - 1))
      },
    },
    // Enter — check/uncheck in multi-select, primary action in normal mode
    {
      key: 'Enter',
      label: enterLabel,
      hint: '↵',
      activeOn: () => selectedIndexRef.current >= 0,
      handler: () => {
        const idx = selectedIndexRef.current
        const item = resultsRef.current[idx]
        if (!item) return

        if (multiSelectModeRef.current) {
          onToggleCheck(item.id)
          return
        }

        if (enterActionRef.current === 'copyMagnet') {
          onCopyMagnet(item.id, item.magnet)
        } else {
          onDownloadTorrent(item.id)
        }
      },
    },
    // Shift+Enter — opposite of primary action (normal mode only)
    {
      key: 'Enter',
      modifiers: ['shift'] as const,
      label: shiftEnterLabel,
      hint: ['⇧', '↵'],
      activeOn: () => selectedIndexRef.current >= 0 && !multiSelectModeRef.current,
      handler: () => {
        const idx = selectedIndexRef.current
        const item = resultsRef.current[idx]
        if (!item) return
        if (enterActionRef.current === 'copyMagnet') {
          onDownloadTorrent(item.id)
        } else {
          onCopyMagnet(item.id, item.magnet)
        }
      },
    },
  ])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex, multiSelectMode, enterAction])

  // nuxy-register-actions drives the Ctrl+K context menu
  React.useEffect(() => {
    const actions: Array<{ id: string; label: string; onExecute: () => void }> = []

    if (!multiSelectMode) {
      // "Select Multiple" is always shown when there are results
      if (resultsRef.current.length > 0) {
        actions.push({
          id: 'nyaa-select-multiple',
          label: t('actions.selectMultiple'),
          onExecute: () => setMultiSelectMode(true),
        })
      }

      // Single-item action when something is selected
      const item = selectedIndex >= 0 ? results[selectedIndex] : null
      if (item) {
        if (enterAction === 'copyMagnet') {
          actions.push({
            id: 'nyaa-copy-magnet',
            label: t('actions.copyMagnetLabel'),
            onExecute: () => onCopyMagnet(item.id, item.magnet),
          })
        } else {
          actions.push({
            id: 'nyaa-download-torrent',
            label: t('actions.downloadTorrentLabel'),
            onExecute: () => onDownloadTorrent(item.id),
          })
        }
      }
    } else {
      // Multi-select mode
      actions.push({
        id: 'nyaa-exit-select',
        label: t('actions.exitSelectMultiple'),
        onExecute: () => setMultiSelectMode(false),
      })

      const checkedItems = results.filter((r) => checkedIds.has(r.id))
      if (checkedItems.length > 0) {
        actions.push({
          id: 'nyaa-copy-all',
          label: t('actions.copyAll'),
          onExecute: () => onCopyMagnets(checkedItems),
        })
        actions.push({
          id: 'nyaa-download-all',
          label: t('actions.downloadAll'),
          onExecute: () => onDownloadTorrents(checkedItems.map((i) => i.id)),
        })
      }
    }

    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [selectedIndex, results, multiSelectMode, checkedIds, enterAction])
}
