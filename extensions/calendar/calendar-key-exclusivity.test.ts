/**
 * Verifies that for each key, at most one activeOn condition is true for any
 * given state. The shell uses Array.find() to dispatch key actions, so if two
 * handlers for the same key were simultaneously active the result would depend
 * on registration order — a silent, order-dependent bug.
 */
import { describe, it, expect } from 'vitest'
import {
  canEnterCalendar,
  canNavigateSearchDown,
  canNavigateSearchUp,
  canReturnToOmnibox,
  canNavigateMonth,
  canNavigateDayList,
  canOpenDayEvent,
  canCreateEvent,
  canDeleteEvent,
  canNavigateForm,
  canSaveEvent,
  canGoBack,
  sKeyTarget,
  type KeyActionState,
} from './calendar-key-conditions.ts'

// Every combination of (mode × calView × query × activeSelect × listIdx situation)
// that is reachable in the UI.
const ALL_STATES: KeyActionState[] = []

const modes = ['omnibox', 'calendar'] as const
const calViews = ['month', 'day', 'create', 'detail'] as const
const queries = ['', 'meeting'] as const
const activeSelects = [null, 'time', 'reminder'] as const
const listIdxCases = [-1, 0, 2] as const
const dayEventsCounts = [0, 1, 3] as const
const hasEditingEvents = [false, true] as const

for (const mode of modes)
  for (const calView of calViews)
    for (const query of queries)
      for (const activeSelect of activeSelects)
        for (const listIdx of listIdxCases)
          for (const dayEventsCount of dayEventsCounts)
            for (const hasEditingEvent of hasEditingEvents)
              ALL_STATES.push({
                mode,
                query,
                calView,
                activeSelect,
                listIdx,
                dayEventsCount,
                hasEditingEvent,
              })

function countTrue(fns: Array<(s: KeyActionState) => boolean>, s: KeyActionState): number {
  return fns.filter((fn) => fn(s)).length
}

describe('ArrowDown — at most one handler active per state', () => {
  // The registered ArrowDown handlers (in order):
  // 1. canEnterCalendar         — omnibox, no query
  // 2. canNavigateSearchDown    — omnibox, has query
  // 3. canNavigateMonth (down)  — calendar, month view
  // 4. canNavigateDayList (down)— calendar, day view
  // 5. canNavigateForm (down)   — calendar, create/detail view
  const arrowDownHandlers = [
    canEnterCalendar,
    canNavigateSearchDown,
    canNavigateMonth,
    canNavigateDayList,
    canNavigateForm,
  ]

  it('never has more than one active handler for any reachable state', () => {
    for (const s of ALL_STATES) {
      const active = countTrue(arrowDownHandlers, s)
      expect(
        active,
        `ArrowDown: ${active} handlers active for ${JSON.stringify(s)}`
      ).toBeLessThanOrEqual(1)
    }
  })
})

describe('ArrowUp — at most one handler active per state', () => {
  const arrowUpHandlers = [
    canNavigateSearchUp,
    canNavigateMonth,
    canNavigateDayList,
    canNavigateForm,
  ]

  it('never has more than one active handler for any reachable state', () => {
    for (const s of ALL_STATES) {
      const active = countTrue(arrowUpHandlers, s)
      expect(
        active,
        `ArrowUp: ${active} handlers active for ${JSON.stringify(s)}`
      ).toBeLessThanOrEqual(1)
    }
  })
})

describe('s key — routing is always unambiguous', () => {
  it('never returns two targets for the same state', () => {
    for (const s of ALL_STATES) {
      const target = sKeyTarget(s)
      // target is null | 'save' | 'return-to-omnibox' — always exactly one or none
      expect(['save', 'return-to-omnibox', null]).toContain(target)
    }
  })

  it('save and return-to-omnibox are never both true simultaneously', () => {
    for (const s of ALL_STATES) {
      const save = canSaveEvent(s)
      const ret = canReturnToOmnibox(s)
      expect(save && ret, `Both save and return-to-omnibox active: ${JSON.stringify(s)}`).toBe(
        false
      )
    }
  })
})

describe('Enter — at most one handler active per state', () => {
  // Enter handlers:
  // 1. canNavigateMonth (open day)    — calendar, month view
  // 2. canOpenDayEvent                — calendar, day view, valid listIdx
  // 3. canNavigateForm (open/confirm) — calendar, create or detail view
  const enterHandlers = [canNavigateMonth, canOpenDayEvent, canNavigateForm]

  it('never has more than one active handler for any reachable state', () => {
    for (const s of ALL_STATES) {
      const active = countTrue(enterHandlers, s)
      expect(
        active,
        `Enter: ${active} handlers active for ${JSON.stringify(s)}`
      ).toBeLessThanOrEqual(1)
    }
  })
})

describe('n key — createEvent is never active in form views', () => {
  it('canCreateEvent is false when already in create view', () => {
    for (const s of ALL_STATES.filter((s) => s.calView === 'create')) {
      expect(canCreateEvent(s)).toBe(false)
    }
  })

  it('canCreateEvent is false when in detail view', () => {
    for (const s of ALL_STATES.filter((s) => s.calView === 'detail')) {
      expect(canCreateEvent(s)).toBe(false)
    }
  })
})

describe('Escape — canGoBack never conflicts with canEnterCalendar', () => {
  it('canGoBack is only true in calendar mode', () => {
    for (const s of ALL_STATES.filter((s) => s.mode === 'omnibox')) {
      expect(canGoBack(s)).toBe(false)
    }
  })

  it('canGoBack is false on month view (Esc has nothing to go back to from month)', () => {
    for (const s of ALL_STATES.filter((s) => s.mode === 'calendar' && s.calView === 'month')) {
      expect(canGoBack(s)).toBe(false)
    }
  })
})
