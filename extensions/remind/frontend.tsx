const React = window.React
const { useState, useEffect, useCallback } = React

import type { Reminder } from './types.ts'
import { useRemindData } from './hooks/useRemindData.ts'
import { useRemindActions } from './hooks/useRemindActions.ts'
import { looksLikeReminder, formatRemaining } from './utils/parseReminder.ts'

const EXT_ID = 'com.nuxy.remind'

const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

interface Props {
  query: string
}

export default function RemindView({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    EmptyState,
    IconBell,
    IconClock,
    IconTrash,
  } = window.UI || {}

  const { t, dir } = _useTranslation(EXT_ID)

  const isCreating = looksLikeReminder(query)

  const { reminders, preview, refreshReminders } = useRemindData(query)

  // useListNavigation is always called (React hook rules) — activeOn gates behaviour
  const { selectedIndex: navIndex } = _useListNavigation(reminders, {
    onEnter: () => {
      // Enter on a reminder in list-mode shows it's selected; no further action required
    },
    enterLabel: '',
    extraActions: [
      {
        key: 'd',
        label: t('action.cancel'),
        hint: 'D',
        activeOn: () => !isCreating && navIndex >= 0 && navIndex < reminders.length,
        handler: () => {
          const r = reminders[navIndex]
          if (r) handleCancel(r.id)
        },
      },
      {
        key: 'Delete',
        label: '',
        activeOn: () => !isCreating && navIndex >= 0 && navIndex < reminders.length,
        handler: () => {
          const r = reminders[navIndex]
          if (r) handleCancel(r.id)
        },
      },
    ],
  })

  const { handleCreate, handleCancel } = useRemindActions({
    query,
    selectedIndex: navIndex,
    reminders,
    refreshReminders,
  })

  // useToolKeyActions is always called — activeOn gates the create shortcut
  _useToolKeyActions([
    {
      key: 'Enter',
      label: t('action.create'),
      hint: '↵',
      activeOn: () => isCreating,
      handler: handleCreate,
    },
  ])

  // Notify the shell to re-evaluate hint visibility whenever mode or selection changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [navIndex, isCreating])

  // -------------------------------------------------------------------------
  // Create-preview mode
  // -------------------------------------------------------------------------

  if (isCreating) {
    const previewLabel = preview ? `${t('action.create')}: ${preview.label || query}` : query

    return (
      <div style={{ direction: dir }}>
        {List && ListItem && ListItemBody && ListItemText ? (
          <List>
            <ListItem active>
              <ListItemBody>
                {IconBell && (
                  <span style={{ marginInlineEnd: 'var(--space-2)', color: 'var(--color-accent)' }}>
                    <IconBell />
                  </span>
                )}
                <ListItemText
                  primary={previewLabel}
                  secondary={preview ? formatRemaining(preview.delayMs) : ''}
                />
              </ListItemBody>
            </ListItem>
          </List>
        ) : null}
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // List mode
  // -------------------------------------------------------------------------

  return (
    <div style={{ direction: dir }}>
      {reminders.length === 0 ? (
        EmptyState ? (
          <EmptyState icon={IconBell ? <IconBell /> : undefined} title={t('empty.noReminders')} />
        ) : null
      ) : List && ListItem && ListItemBody && ListItemText ? (
        <List>
          {reminders.map((reminder: Reminder, idx: number) => {
            const remaining = reminder.fireAt - Date.now()
            const remainingLabel =
              remaining > 0 ? `${t('label.in')} ${formatRemaining(remaining)}` : t('label.overdue')

            return (
              <ListItem key={reminder.id} active={idx === navIndex}>
                <ListItemBody>
                  {IconClock && (
                    <span
                      style={{
                        marginInlineEnd: 'var(--space-2)',
                        color: remaining <= 0 ? 'var(--color-danger)' : 'var(--color-muted)',
                      }}
                    >
                      <IconClock />
                    </span>
                  )}
                  <ListItemText primary={reminder.label} secondary={remainingLabel} />
                  {ListItemMeta && idx === navIndex && IconTrash ? (
                    <ListItemMeta>
                      <span style={{ color: 'var(--color-muted)' }}>
                        <IconTrash />
                      </span>
                    </ListItemMeta>
                  ) : null}
                </ListItemBody>
              </ListItem>
            )
          })}
        </List>
      ) : null}
    </div>
  )
}
