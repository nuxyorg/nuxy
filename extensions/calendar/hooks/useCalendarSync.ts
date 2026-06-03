const React = window.React

import type { CalendarEvent } from '../types.ts'

interface SyncState {
  mode: 'omnibox' | 'calendar'
  calView: 'month' | 'day' | 'create' | 'detail'
  listIdx: number
  activeSelect: string | null
  formFieldIdx: number
  selectedDay: number
}

interface RestoreResult {
  didRestore: boolean
}

interface RestoreSetters {
  setCalYear: React.Dispatch<React.SetStateAction<number>>
  setCalMonth: React.Dispatch<React.SetStateAction<number>>
  setSelectedDay: React.Dispatch<React.SetStateAction<number>>
  setTimeValue: React.Dispatch<React.SetStateAction<string>>
  setMode: React.Dispatch<React.SetStateAction<'omnibox' | 'calendar'>>
  setCalView: React.Dispatch<React.SetStateAction<'month' | 'day' | 'create' | 'detail'>>
  setFormFieldIdx: React.Dispatch<React.SetStateAction<number>>
  setActiveSelect: React.Dispatch<React.SetStateAction<string | null>>
}

interface UseCalendarDataSyncParams {
  calYear: number
  calMonth: number
  query: string
  todayYear: number
  todayMonth: number
  mode: 'omnibox' | 'calendar'
  loadMonthEvents: (year: number, month: number) => void
  loadSearchRange: (year: number, month: number) => void
  setCalView: (v: 'month' | 'day' | 'create' | 'detail') => void
  setListIdx: (i: number) => void
}

const EXT_ID = 'com.nuxy.calendar'

export function useCalendarDataSync({
  calYear,
  calMonth,
  query,
  todayYear,
  todayMonth,
  mode,
  loadMonthEvents,
  loadSearchRange,
  setCalView,
  setListIdx,
}: UseCalendarDataSyncParams): void {
  React.useEffect(() => { loadMonthEvents(calYear, calMonth) }, [calYear, calMonth])
  React.useEffect(() => { if (!!(query || '').trim()) loadSearchRange(todayYear, todayMonth) }, [!!(query || '').trim()])
  React.useEffect(() => { if (mode === 'omnibox') { setCalView('month'); setListIdx(-1) } }, [mode])
}

/**
 * Injects the month-slide CSS animations into the document once, on mount.
 */
export function useCalendarAnimations(): void {
  React.useEffect(() => {
    if (document.getElementById('cal-slide-anim')) return
    const s = document.createElement('style')
    s.id = 'cal-slide-anim'
    s.textContent = [
      '@keyframes calFromTop{from{transform:translateY(-24px);opacity:0}to{transform:translateY(0);opacity:1}}',
      '@keyframes calFromBottom{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}',
    ].join('')
    document.head.appendChild(s)
  }, [])
}

/**
 * Dispatches `nuxy-key-hints-changed` whenever the key-relevant state changes.
 */
export function useCalendarKeyHintsSync({
  mode,
  calView,
  listIdx,
  activeSelect,
  formFieldIdx,
  selectedDay,
}: SyncState): void {
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [mode, calView, listIdx, activeSelect, formFieldIdx, selectedDay])
}

/**
 * On mount, checks if the backend has a pending `getLastResult` that should
 * pre-populate the create form (e.g., after a natural-language date parse).
 */
export function useCalendarLastResultRestore(setters: RestoreSetters): void {
  const {
    setCalYear,
    setCalMonth,
    setSelectedDay,
    setTimeValue,
    setMode,
    setCalView,
    setFormFieldIdx,
    setActiveSelect,
  } = setters

  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getLastResult')
      .then((res: unknown) => {
        const r = res as { success: boolean; data?: { title?: string; datetime?: number } } | null
        if (r?.success && r.data?.datetime) {
          const d = new Date(r.data.datetime)
          setCalYear(d.getFullYear())
          setCalMonth(d.getMonth())
          setSelectedDay(d.getDate())
          setTimeValue(String(d.getHours()))
          setMode('calendar')
          setCalView('create')
          setFormFieldIdx(0)
          setActiveSelect(null)
          window.dispatchEvent(
            new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } })
          )
        }
      })
      .catch(() => {})
  }, [])
}
