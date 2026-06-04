const React = window.React

import { buildGrid, buildDayAbbr, MONTH_NAMES } from '../utils/calendarGrid.ts'

interface Props {
  calYear: number
  calMonth: number
  weekStart: number
  selectedDay: number
  mode: 'omnibox' | 'calendar'
  todayYear: number
  todayMonth: number
  todayDate: number
  eventDays: Set<number>
  monthEnterDir: 'fromTop' | 'fromBottom' | null
  onSelectDay: (day: number) => void
  onNavigateToMonth: (
    year: number,
    month: number,
    day: number,
    dir: 'fromTop' | 'fromBottom'
  ) => void
  onEnterCalendarMode: () => void
  onEnterDayView: () => void
}

export function CalendarMonthGrid({
  calYear,
  calMonth,
  weekStart,
  selectedDay,
  mode,
  todayYear,
  todayMonth,
  todayDate,
  eventDays,
  monthEnterDir,
  onSelectDay,
  onNavigateToMonth,
  onEnterCalendarMode,
  onEnterDayView,
}: Props) {
  const grid = buildGrid(calYear, calMonth, weekStart)
  const dayAbbr = buildDayAbbr(weekStart)
  const isCurrentCalMonth = calYear === todayYear && calMonth === todayMonth

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4) var(--space-2)',
        }}
      >
        <span style={{ fontSize: 'var(--font-sm)', fontWeight: 600 }}>
          {MONTH_NAMES[calMonth]} {calYear}
        </span>
        {mode === 'calendar' && (
          <span style={{ fontSize: 'var(--font-xs)', opacity: 0.55 }}>
            {new Date(calYear, calMonth, selectedDay).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>

      {/* Day abbreviation row — outside the animated wrapper so it doesn't slide */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '2px',
          padding: '0 var(--space-3) 2px',
        }}
      >
        {dayAbbr.map((abbr) => (
          <div
            key={abbr}
            style={{
              textAlign: 'center',
              fontSize: 'var(--font-xs)',
              opacity: 0.3,
              padding: '0 0 2px',
              fontWeight: 600,
            }}
          >
            {abbr}
          </div>
        ))}
      </div>

      {/* Animated grid — keyed by month so React remounts on month change */}
      <div style={{ overflow: 'clip', flex: 1, minHeight: 0 }}>
        <div
          key={`${calYear}-${calMonth}`}
          style={{
            height: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gridTemplateRows: 'repeat(6, 1fr)',
            gap: '2px',
            padding: '0 var(--space-3) var(--space-3)',
            animation: monthEnterDir
              ? `cal${monthEnterDir === 'fromTop' ? 'FromTop' : 'FromBottom'} 0.22s ease`
              : undefined,
          }}
        >
          {grid.map((cell, idx) => {
            const isCurrent = cell.monthOffset === 0
            const isToday = isCurrent && isCurrentCalMonth && cell.day === todayDate
            const isSelected = isCurrent && mode === 'calendar' && cell.day === selectedDay
            const hasEvent = isCurrent && eventDays.has(cell.day)

            return (
              <div
                key={idx}
                onClick={() => {
                  if (!isCurrent) {
                    const d = new Date(calYear, calMonth + cell.monthOffset, cell.day)
                    onNavigateToMonth(
                      d.getFullYear(),
                      d.getMonth(),
                      cell.day,
                      cell.monthOffset < 0 ? 'fromTop' : 'fromBottom'
                    )
                    if (mode === 'calendar') onEnterDayView()
                    else {
                      onEnterCalendarMode()
                      setTimeout(onEnterDayView, 0)
                    }
                    return
                  }
                  onSelectDay(cell.day)
                  if (mode === 'calendar') onEnterDayView()
                  else {
                    onEnterCalendarMode()
                    setTimeout(onEnterDayView, 0)
                  }
                }}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-xs)',
                  fontWeight: isToday ? 700 : 400,
                  background: isSelected
                    ? 'var(--accent, #6366f1)'
                    : isToday
                      ? 'var(--accent-subtle, rgba(99, 102, 241, 0.15))'
                      : 'transparent',
                  color: isSelected ? 'var(--accent-fg, #fff)' : 'inherit',
                  outline: isToday && !isSelected ? '1.5px solid var(--accent, #6366f1)' : 'none',
                  outlineOffset: '-1px',
                  opacity: !isCurrent ? 0.25 : mode === 'omnibox' ? 0.75 : 1,
                }}
              >
                {cell.day}
                {hasEvent && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      width: '3px',
                      height: '3px',
                      borderRadius: '50%',
                      background: isSelected
                        ? 'var(--accent-fg-muted, rgba(255,255,255,0.7))'
                        : 'var(--accent, #6366f1)',
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
