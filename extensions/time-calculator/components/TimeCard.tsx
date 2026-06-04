const React = window.React

import type { TimeResultMeta } from '../types.ts'

interface Props {
  meta: TimeResultMeta
}

export function TimeCard({ meta }: Props) {
  const leftText = meta.left ? meta.left.text : meta.sourceText || meta.sourceTime
  const leftBadge = meta.left
    ? meta.left.badge
    : meta.sourceTime +
      (meta.sourceLabel && meta.sourceLabel !== 'Local' ? ` · ${meta.sourceLabel}` : '')
  const rightText = meta.right ? meta.right.text : meta.destTime
  const rightBadge = meta.right ? meta.right.badge : `${meta.destLabel}, ${meta.destTzLabel}`

  const ConversionCard = (window.UI || {}).ConversionCard
  if (ConversionCard) {
    return React.createElement(ConversionCard, {
      from: React.createElement(
        React.Fragment,
        null,
        React.createElement('div', { className: 'tc-panel__time' }, leftText),
        React.createElement('div', { className: 'tc-panel__badge' }, leftBadge)
      ),
      to: React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'div',
          { className: 'tc-panel__time tc-panel__time--large' },
          rightText
        ),
        React.createElement('div', { className: 'tc-panel__badge' }, rightBadge)
      ),
    })
  }

  return React.createElement(
    'div',
    { className: 'tc-card' },

    // Left panel — source
    React.createElement(
      'div',
      { className: 'tc-panel tc-panel--left' },
      React.createElement('div', { className: 'tc-panel__time' }, leftText),
      React.createElement('div', { className: 'tc-panel__badge' }, leftBadge)
    ),

    // Arrow
    (window.UI as any)?.IconArrowRight
      ? React.createElement((window.UI || {}).IconArrowRight, {
          className: 'tc-arrow',
          style: { width: '20px', height: '20px' },
        })
      : React.createElement('div', { className: 'tc-arrow' }, '→'),

    // Right panel — destination
    React.createElement(
      'div',
      { className: 'tc-panel' },
      React.createElement('div', { className: 'tc-panel__time tc-panel__time--large' }, rightText),
      React.createElement('div', { className: 'tc-panel__badge' }, rightBadge)
    )
  )
}
