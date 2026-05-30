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

function state(overrides: Partial<KeyActionState> = {}): KeyActionState {
  return {
    mode: 'omnibox',
    query: '',
    calView: 'month',
    activeSelect: null,
    listIdx: -1,
    dayEventsCount: 0,
    hasEditingEvent: false,
    ...overrides,
  }
}

describe('canEnterCalendar', () => {
  it('is true in omnibox mode with no query', () => {
    expect(canEnterCalendar(state({ mode: 'omnibox', query: '' }))).toBe(true)
  })

  it('is false when query is non-empty', () => {
    expect(canEnterCalendar(state({ mode: 'omnibox', query: 'lunch' }))).toBe(false)
  })

  it('is false when already in calendar mode', () => {
    expect(canEnterCalendar(state({ mode: 'calendar', query: '' }))).toBe(false)
  })

  it('treats whitespace-only query as empty', () => {
    expect(canEnterCalendar(state({ mode: 'omnibox', query: '   ' }))).toBe(true)
  })
})

describe('canNavigateSearchDown / canNavigateSearchUp', () => {
  it('canNavigateSearchDown is true in omnibox mode with a query', () => {
    expect(canNavigateSearchDown(state({ mode: 'omnibox', query: 'mtg' }))).toBe(true)
  })

  it('canNavigateSearchDown is false when query is empty', () => {
    expect(canNavigateSearchDown(state({ mode: 'omnibox', query: '' }))).toBe(false)
  })

  it('canNavigateSearchDown is false in calendar mode', () => {
    expect(canNavigateSearchDown(state({ mode: 'calendar', query: 'mtg' }))).toBe(false)
  })

  it('canNavigateSearchUp requires listIdx > -1', () => {
    expect(canNavigateSearchUp(state({ mode: 'omnibox', query: 'mtg', listIdx: -1 }))).toBe(false)
    expect(canNavigateSearchUp(state({ mode: 'omnibox', query: 'mtg', listIdx: 0 }))).toBe(true)
  })
})

describe('canReturnToOmnibox', () => {
  it('is true in calendar mode on month view', () => {
    expect(canReturnToOmnibox(state({ mode: 'calendar', calView: 'month' }))).toBe(true)
  })

  it('is true in calendar mode on day view', () => {
    expect(canReturnToOmnibox(state({ mode: 'calendar', calView: 'day' }))).toBe(true)
  })

  it('is false on create view (s saves there instead)', () => {
    expect(canReturnToOmnibox(state({ mode: 'calendar', calView: 'create' }))).toBe(false)
  })

  it('is false on detail view (s saves there instead)', () => {
    expect(canReturnToOmnibox(state({ mode: 'calendar', calView: 'detail' }))).toBe(false)
  })

  it('is false in omnibox mode', () => {
    expect(canReturnToOmnibox(state({ mode: 'omnibox' }))).toBe(false)
  })
})

describe('canNavigateMonth', () => {
  it('is true only in calendar mode on month view', () => {
    expect(canNavigateMonth(state({ mode: 'calendar', calView: 'month' }))).toBe(true)
  })

  it('is false on day view', () => {
    expect(canNavigateMonth(state({ mode: 'calendar', calView: 'day' }))).toBe(false)
  })

  it('is false in omnibox mode', () => {
    expect(canNavigateMonth(state({ mode: 'omnibox', calView: 'month' }))).toBe(false)
  })
})

describe('canNavigateDayList', () => {
  it('is true in calendar day view with no open select', () => {
    expect(
      canNavigateDayList(state({ mode: 'calendar', calView: 'day', activeSelect: null }))
    ).toBe(true)
  })

  it('is false when a select dropdown is open', () => {
    expect(
      canNavigateDayList(state({ mode: 'calendar', calView: 'day', activeSelect: 'time' }))
    ).toBe(false)
  })

  it('is false in omnibox mode', () => {
    expect(canNavigateDayList(state({ mode: 'omnibox', calView: 'day' }))).toBe(false)
  })
})

describe('canOpenDayEvent', () => {
  it('is true when a valid listIdx is selected', () => {
    expect(
      canOpenDayEvent(state({ mode: 'calendar', calView: 'day', listIdx: 0, dayEventsCount: 3 }))
    ).toBe(true)
  })

  it('is false when listIdx is -1 (nothing selected)', () => {
    expect(
      canOpenDayEvent(state({ mode: 'calendar', calView: 'day', listIdx: -1, dayEventsCount: 3 }))
    ).toBe(false)
  })

  it('is false when listIdx equals dayEventsCount (out of bounds)', () => {
    expect(
      canOpenDayEvent(state({ mode: 'calendar', calView: 'day', listIdx: 3, dayEventsCount: 3 }))
    ).toBe(false)
  })
})

describe('canCreateEvent', () => {
  it('is true in calendar month view', () => {
    expect(canCreateEvent(state({ mode: 'calendar', calView: 'month' }))).toBe(true)
  })

  it('is true in calendar day view', () => {
    expect(canCreateEvent(state({ mode: 'calendar', calView: 'day' }))).toBe(true)
  })

  it('is false in create view (already creating)', () => {
    expect(canCreateEvent(state({ mode: 'calendar', calView: 'create' }))).toBe(false)
  })

  it('is false in omnibox mode', () => {
    expect(canCreateEvent(state({ mode: 'omnibox', calView: 'month' }))).toBe(false)
  })
})

describe('canDeleteEvent', () => {
  it('is true in day view with a valid selection', () => {
    expect(
      canDeleteEvent(state({ mode: 'calendar', calView: 'day', listIdx: 0, dayEventsCount: 1 }))
    ).toBe(true)
  })

  it('is false in day view when listIdx is -1', () => {
    expect(
      canDeleteEvent(state({ mode: 'calendar', calView: 'day', listIdx: -1, dayEventsCount: 2 }))
    ).toBe(false)
  })

  it('is true in detail view when an event is being edited', () => {
    expect(
      canDeleteEvent(state({ mode: 'calendar', calView: 'detail', hasEditingEvent: true }))
    ).toBe(true)
  })

  it('is false in detail view when no event is loaded', () => {
    expect(
      canDeleteEvent(state({ mode: 'calendar', calView: 'detail', hasEditingEvent: false }))
    ).toBe(false)
  })

  it('is false in month view', () => {
    expect(canDeleteEvent(state({ mode: 'calendar', calView: 'month' }))).toBe(false)
  })
})

describe('canNavigateForm / canSaveEvent', () => {
  it('canNavigateForm is true in create view with no active select', () => {
    expect(
      canNavigateForm(state({ mode: 'calendar', calView: 'create', activeSelect: null }))
    ).toBe(true)
  })

  it('canNavigateForm is false when a select dropdown is open', () => {
    expect(
      canNavigateForm(state({ mode: 'calendar', calView: 'create', activeSelect: 'time' }))
    ).toBe(false)
  })

  it('canSaveEvent mirrors canNavigateForm conditions', () => {
    const s1 = state({ mode: 'calendar', calView: 'detail', activeSelect: null })
    expect(canSaveEvent(s1)).toBe(canNavigateForm(s1))

    const s2 = state({ mode: 'calendar', calView: 'create', activeSelect: 'reminder' })
    expect(canSaveEvent(s2)).toBe(canNavigateForm(s2))
  })
})

describe('canGoBack', () => {
  it('is true in day view', () => {
    expect(canGoBack(state({ mode: 'calendar', calView: 'day' }))).toBe(true)
  })

  it('is true in create view', () => {
    expect(canGoBack(state({ mode: 'calendar', calView: 'create' }))).toBe(true)
  })

  it('is true in detail view', () => {
    expect(canGoBack(state({ mode: 'calendar', calView: 'detail' }))).toBe(true)
  })

  it('is false in month view (nothing to go back to)', () => {
    expect(canGoBack(state({ mode: 'calendar', calView: 'month' }))).toBe(false)
  })

  it('is false in omnibox mode', () => {
    expect(canGoBack(state({ mode: 'omnibox', calView: 'day' }))).toBe(false)
  })
})

describe('sKeyTarget — s key routing is unambiguous', () => {
  it('returns "return-to-omnibox" from month view', () => {
    expect(sKeyTarget(state({ mode: 'calendar', calView: 'month' }))).toBe('return-to-omnibox')
  })

  it('returns "return-to-omnibox" from day view', () => {
    expect(sKeyTarget(state({ mode: 'calendar', calView: 'day' }))).toBe('return-to-omnibox')
  })

  it('returns "save" from create view', () => {
    expect(sKeyTarget(state({ mode: 'calendar', calView: 'create', activeSelect: null }))).toBe(
      'save'
    )
  })

  it('returns "save" from detail view', () => {
    expect(sKeyTarget(state({ mode: 'calendar', calView: 'detail', activeSelect: null }))).toBe(
      'save'
    )
  })

  it('returns null when select is open (s is captured by select)', () => {
    expect(
      sKeyTarget(state({ mode: 'calendar', calView: 'create', activeSelect: 'time' }))
    ).toBeNull()
  })

  it('returns null in omnibox mode (s is typed normally)', () => {
    expect(sKeyTarget(state({ mode: 'omnibox', calView: 'month' }))).toBeNull()
  })
})
