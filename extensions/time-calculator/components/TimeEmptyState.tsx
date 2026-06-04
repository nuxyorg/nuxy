const React = window.React

import { EXAMPLE_QUERIES } from '../utils/constants.ts'

interface Props {
  loading: boolean
  t: (key: string) => string
}

export function TimeEmptyState({ loading, t }: Props) {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'div',
      { className: 'tc-empty' },
      React.createElement(
        'div',
        { className: 'tc-empty__icon' },
        (window.UI as any)?.IconClock
          ? React.createElement((window.UI || {}).IconClock!, {
              style: { width: '32px', height: '32px' },
            })
          : null
      ),
      React.createElement(
        'div',
        { className: 'tc-empty__text' },
        loading ? t('loading.calculating') : t('empty.prompt')
      )
    ),
    !loading &&
      React.createElement(
        'div',
        { className: 'tc-hint' },
        t('hint.tryExamples'),
        React.createElement(
          'div',
          { className: 'tc-examples' },
          ...EXAMPLE_QUERIES.map((ex) => {
            const Chip = (window.UI || {}).Chip
            return Chip
              ? React.createElement(Chip, { key: ex }, ex)
              : React.createElement('span', { key: ex, className: 'tc-example-chip' }, ex)
          })
        )
      )
  )
}
