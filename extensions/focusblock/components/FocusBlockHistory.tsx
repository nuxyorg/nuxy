const React = window.React

import type { Session } from '../types.ts'
import { formatDuration, formatDate } from '../utils/formatters.ts'

interface Props {
  sessions: Session[]
  selectedIndex: number
  duration: number
  label: string
  t: (key: string, vars?: Record<string, string>) => string
  dir: 'ltr' | 'rtl'
}

export function FocusBlockHistory({ sessions, selectedIndex, duration, label, t, dir }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, SectionHeader } =
    window.UI || {}

  if (sessions.length === 0) {
    return (
      <div style={{ direction: dir, height: '100%', overflowY: 'auto' }}>
        {EmptyState && (
          <EmptyState
            message={t('idle.message', { duration: String(duration), label: label || '' })}
            hint={t('idle.hint')}
          />
        )}
      </div>
    )
  }

  return (
    <div style={{ direction: dir, height: '100%', overflowY: 'auto' }}>
      {SectionHeader && <SectionHeader label={t('sections.recent')} />}
      {List && (
        <List>
          {sessions.map((s, i) => (
            <ListItem key={s.id} active={i === selectedIndex}>
              <ListItemBody>
                <ListItemText>{s.label || t('session.untitled')}</ListItemText>
                <ListItemMeta>
                  {formatDuration(s.duration)}
                  {' · '}
                  {s.completed ? t('session.completed') : t('session.stopped')}
                  {' · '}
                  {formatDate(s.endedAt)}
                </ListItemMeta>
              </ListItemBody>
            </ListItem>
          ))}
        </List>
      )}
    </div>
  )
}
