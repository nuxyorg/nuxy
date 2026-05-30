export interface KeyActionState {
  mode: 'omnibox' | 'calendar'
  query: string
  calView: 'month' | 'day' | 'create' | 'detail'
  activeSelect: string | null
  listIdx: number
  dayEventsCount: number
  hasEditingEvent: boolean
}

export function canEnterCalendar(s: KeyActionState): boolean {
  return s.mode === 'omnibox' && !s.query.trim()
}

export function canNavigateSearchDown(s: KeyActionState): boolean {
  return s.mode === 'omnibox' && !!s.query.trim()
}

export function canNavigateSearchUp(s: KeyActionState): boolean {
  return s.mode === 'omnibox' && !!s.query.trim() && s.listIdx > -1
}

export function canReturnToOmnibox(s: KeyActionState): boolean {
  return s.mode === 'calendar' && (s.calView === 'month' || s.calView === 'day')
}

export function canNavigateMonth(s: KeyActionState): boolean {
  return s.mode === 'calendar' && s.calView === 'month'
}

export function canNavigateDayList(s: KeyActionState): boolean {
  return s.mode === 'calendar' && s.calView === 'day' && s.activeSelect === null
}

export function canOpenDayEvent(s: KeyActionState): boolean {
  return (
    s.mode === 'calendar' && s.calView === 'day' && s.listIdx >= 0 && s.listIdx < s.dayEventsCount
  )
}

export function canCreateEvent(s: KeyActionState): boolean {
  return s.mode === 'calendar' && (s.calView === 'month' || s.calView === 'day')
}

export function canDeleteEvent(s: KeyActionState): boolean {
  return (
    s.mode === 'calendar' &&
    ((s.calView === 'day' && s.listIdx >= 0 && s.listIdx < s.dayEventsCount) ||
      (s.calView === 'detail' && s.hasEditingEvent))
  )
}

export function canNavigateForm(s: KeyActionState): boolean {
  return (
    s.mode === 'calendar' &&
    (s.calView === 'create' || s.calView === 'detail') &&
    s.activeSelect === null
  )
}

export function canSaveEvent(s: KeyActionState): boolean {
  return canNavigateForm(s)
}

export function canGoBack(s: KeyActionState): boolean {
  return (
    s.mode === 'calendar' &&
    (s.calView === 'day' || s.calView === 'create' || s.calView === 'detail')
  )
}

// Resolves which action the `s` key performs — avoids implicit priority
// by making the routing explicit and testable.
export function sKeyTarget(s: KeyActionState): 'return-to-omnibox' | 'save' | null {
  if (s.mode !== 'calendar') return null
  if (canSaveEvent(s)) return 'save'
  if (canReturnToOmnibox(s)) return 'return-to-omnibox'
  return null
}
