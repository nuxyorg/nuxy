const React = window.React

const EXT_ID = 'com.nuxy.prockill'

import type { ProcessInfo } from './types.ts'
import { useProcessData } from './hooks/useProcessData.ts'
import { useProcessActions } from './hooks/useProcessActions.ts'
import { useProcessKeyboard } from './hooks/useProcessKeyboard.ts'
import { ProcessList } from './components/ProcessList.tsx'
import { ProcessAlert } from './components/ProcessAlert.tsx'

interface Props {
  query: string
}

export default function ProcKillView({ query }: Props) {
  const _useTranslation =
    (window.UI || {}).useTranslation || (() => ({ t: (k: string) => k, dir: 'ltr' as const }))

  const { t, dir } = _useTranslation(EXT_ID)

  const { processes, loadProcesses } = useProcessData(query)

  const { killError, handleKill } = useProcessActions({
    loadProcesses,
    killFailedMessage: t('errors.killFailed'),
  })

  const { selectedIndex, setSelectedIndex } = useProcessKeyboard({
    processes,
    handlers: { handleKill, loadProcesses },
    labels: {
      killLabel: t('actions.kill'),
      forceKillLabel: t('actions.forceKill'),
      refreshLabel: t('actions.refresh'),
    },
  })

  return (
    <div style={{ direction: dir }}>
      <ProcessAlert message={killError} />
      <ProcessList
        processes={processes}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
        emptyMessage={query ? t('noResults') : t('empty')}
        emptyHint={query ? t('noResultsHint') : t('emptyHint')}
      />
    </div>
  )
}
