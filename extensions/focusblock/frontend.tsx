const React = window.React

import { useFocusBlockData } from './hooks/useFocusBlockData.ts'
import { useFocusBlockActions } from './hooks/useFocusBlockActions.ts'
import { useFocusBlockKeyboard } from './hooks/useFocusBlockKeyboard.ts'
import { useFocusBlockSync } from './hooks/useFocusBlockSync.ts'
import { FocusBlockTimer } from './components/FocusBlockTimer.tsx'
import { FocusBlockHistory } from './components/FocusBlockHistory.tsx'
import { parseQuery } from './utils/formatters.ts'

const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

const EXT_ID = 'com.nuxy.focusblock'

interface Props {
  query: string
}

export default function FocusBlock({ query }: Props) {
  const { t, dir } = _useTranslation(EXT_ID)

  const [selectedIndex, setSelectedIndex] = React.useState(-1)

  const { status, setStatus, sessions, defaultDuration, refreshStatus, refreshHistory } =
    useFocusBlockData()

  const active = status?.active ?? false
  const { duration, label } = parseQuery(query, defaultDuration)

  const { handleStart, handleStop } = useFocusBlockActions({
    duration,
    label,
    setStatus,
    refreshStatus,
    refreshHistory,
  })

  useFocusBlockKeyboard({ active, sessions, selectedIndex, setSelectedIndex, handleStart, handleStop, t })
  useFocusBlockSync(active, selectedIndex)

  if (active && status) {
    return <FocusBlockTimer status={status} dir={dir} />
  }

  return (
    <FocusBlockHistory
      sessions={sessions}
      selectedIndex={selectedIndex}
      duration={duration}
      label={label}
      t={t}
      dir={dir}
    />
  )
}
