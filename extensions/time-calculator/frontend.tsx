const React = window.React

const EXT_ID = 'com.nuxy.time-calculator'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import type { TimeResultMeta } from './types.ts'
import { injectStyles } from './utils/styles.ts'
import { useTimeCalculatorData } from './hooks/useTimeCalculatorData.ts'
import { TimeCard } from './components/TimeCard.tsx'
import { TimeEmptyState } from './components/TimeEmptyState.tsx'

interface Props {
  query: string
}

export default function TimeCalculatorView({ query }: Props) {
  injectStyles()
  const { t } = _useTranslation(EXT_ID)

  const { result, loading, fromAI } = useTimeCalculatorData(query)
  const meta: TimeResultMeta | null = (result?.meta as TimeResultMeta) ?? null

  return React.createElement(
    'div',
    { className: 'tc-wrapper' },

    React.createElement(
      'div',
      { className: 'tc-header', style: { display: 'flex', alignItems: 'center', gap: 8 } },
      t('header.calculator'),
      fromAI &&
        React.createElement(
          'span',
          {
            style: {
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.5px',
              padding: '2px 7px',
              borderRadius: 20,
              background: 'var(--surface-accent, rgba(120, 80, 255, 0.18))',
              border: '1px solid var(--border-accent, rgba(120, 80, 255, 0.35))',
              color: 'var(--color-accent, rgba(160, 130, 255, 0.9))',
              textTransform: 'uppercase',
            },
          },
          t('header.ai')
        )
    ),

    meta
      ? React.createElement(TimeCard, { meta })
      : React.createElement(TimeEmptyState, { loading, t })
  )
}

// Expose card renderer for shell inline use
;(window as unknown as { __nuxyTimeCalcCard: typeof TimeCard }).__nuxyTimeCalcCard = TimeCard
