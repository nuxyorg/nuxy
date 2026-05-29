/**
 * Time Calculator — Frontend
 *
 * This file is loaded by the shell when the time-calculator provider returns
 * a result with `meta` attached. It renders an inline visual card that looks
 * like the screenshot: left panel (source time), arrow, right panel (target time).
 */

const React = window.React

import type { TimeResultMeta, ConvertResponse } from './types.ts'

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_STYLES = `
  .tc-card {
    display: flex;
    width: 100%;
    border-radius: var(--radius-xl, 12px);
    overflow: hidden;
    background: var(--surface-overlay, rgba(20, 20, 20, 0.65));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 4px 32px var(--shadow-dark, rgba(0, 0, 0, 0.4));
    min-height: 110px;
    position: relative;
  }

  .tc-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 28px;
    position: relative;
    gap: 10px;
  }

  .tc-panel--left {
    border-right: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  }

  .tc-panel__time {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text-primary, rgba(255, 255, 255, 0.92));
    line-height: 1;
  }

  .tc-panel__time--large {
    font-size: 40px;
    font-weight: 700;
  }

  .tc-panel__badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    background: var(--surface-inset, rgba(255, 255, 255, 0.08));
    border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
    font-size: var(--font-xs, 11px);
    color: var(--text-secondary, rgba(255, 255, 255, 0.55));
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .tc-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    flex-shrink: 0;
    color: var(--text-dim, rgba(255, 255, 255, 0.3));
    font-size: 20px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .tc-section-label {
    font-size: var(--font-xs, 11px);
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text-subtle, rgba(255, 255, 255, 0.35));
    margin-bottom: 12px;
  }

  .tc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3, 8px);
    padding: 40px 20px;
    opacity: 0.45;
    text-align: center;
  }

  .tc-empty__icon {
    width: 32px;
    height: 32px;
    line-height: 1;
  }

  .tc-empty__text {
    font-size: var(--font-sm, 13px);
    color: var(--text-muted, rgba(255, 255, 255, 0.6));
    line-height: 1.4;
  }

  .tc-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 0;
    padding: var(--space-4, 12px);
  }

  .tc-header {
    font-size: var(--font-xs, 11px);
    font-weight: 600;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: var(--text-subtle, rgba(255, 255, 255, 0.35));
    padding: 0 4px 10px 4px;
  }

  .tc-input-area {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 8px);
    padding: 0 4px 16px 4px;
  }

  .tc-label {
    font-size: var(--font-sm, 12px);
    color: var(--text-muted, rgba(255, 255, 255, 0.4));
    margin-bottom: 2px;
  }

  .tc-hint {
    font-size: var(--font-sm, 12px);
    color: var(--text-subtle, rgba(255, 255, 255, 0.35));
    line-height: 1.5;
    padding: 10px 4px 0 4px;
  }

  .tc-examples {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2, 6px);
    padding: var(--space-3, 8px) 4px 0;
  }

  .tc-example-chip {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 20px;
    background: var(--surface-raised, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
    font-size: var(--font-xs, 11px);
    color: var(--text-secondary, rgba(255, 255, 255, 0.5));
    cursor: pointer;
    transition: background 0.15s;
  }

  .tc-example-chip:hover {
    background: var(--surface-hover, rgba(255, 255, 255, 0.1));
    color: var(--text-default, rgba(255, 255, 255, 0.75));
  }
`

function injectStyles(): void {
  const id = 'nuxy-time-calc-styles'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = CARD_STYLES
  document.head.appendChild(style)
}

// ─── TimeCard component ───────────────────────────────────────────────────────

interface TimeCardProps {
  meta: TimeResultMeta | null
}

function TimeCard({ meta }: TimeCardProps) {
  if (!meta) return null

  const leftText = meta.left ? meta.left.text : meta.sourceText || meta.sourceTime
  const leftBadge = meta.left
    ? meta.left.badge
    : meta.sourceTime +
      (meta.sourceLabel && meta.sourceLabel !== 'Local' ? ` · ${meta.sourceLabel}` : '')
  const rightText = meta.right ? meta.right.text : meta.destTime
  const rightBadge = meta.right ? meta.right.badge : `${meta.destLabel}, ${meta.destTzLabel}`

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
    React.createElement('div', { className: 'tc-arrow' }, '→'),

    // Right panel — destination
    React.createElement(
      'div',
      { className: 'tc-panel' },
      React.createElement('div', { className: 'tc-panel__time tc-panel__time--large' }, rightText),
      React.createElement('div', { className: 'tc-panel__badge' }, rightBadge)
    )
  )
}

// ─── Main tool view (when opened as full tool) ────────────────────────────────

const EXT_ID = 'com.nuxy.time-calculator'

const EXAMPLE_QUERIES = [
  '12pm here in london',
  '3pm istanbul in tokyo',
  '9am new york in paris',
  '6pm sydney in los angeles',
  '15:30 berlin in dubai',
]

interface Props {
  query: string
}

export default function TimeCalculatorView({ query }: Props) {
  injectStyles()

  const [result, setResult] = React.useState<ConvertResponse | null>(null)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [fromAI, setFromAI] = React.useState<boolean>(false)

  const currentQuery = query || ''

  // On mount: check if there's a last result from the AI orchestrator
  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getLastResult')
      .then((res: unknown) => {
        const r = res as { success: boolean; data: ConvertResponse } | null
        if (r?.success && r.data?.meta) {
          setResult(r.data)
          setFromAI(true)
        }
      })
      .catch(() => {})
  }, [])

  // Live eval when user types in omnibar
  React.useEffect(() => {
    if (!currentQuery.trim()) {
      if (!fromAI) setResult(null)
      return
    }

    setFromAI(false)
    setLoading(true)
    const timer = setTimeout(() => {
      if (!window.core?.ipc?.invoke) {
        setLoading(false)
        return
      }
      window.core.ipc
        .invoke(EXT_ID, 'eval', { text: currentQuery })
        .then((res: unknown) => {
          setLoading(false)
          const r = res as { success: boolean; data: { items: ConvertResponse[] } } | null
          if (r?.success && r.data?.items?.length > 0) {
            setResult(r.data.items[0])
          } else {
            setResult(null)
          }
        })
        .catch(() => {
          setLoading(false)
          setResult(null)
        })
    }, 80)

    return () => clearTimeout(timer)
  }, [currentQuery])

  const meta: TimeResultMeta | null = (result?.meta as TimeResultMeta) ?? null

  return React.createElement(
    'div',
    { className: 'tc-wrapper' },

    React.createElement(
      'div',
      {
        className: 'tc-header',
        style: { display: 'flex', alignItems: 'center', gap: 8 },
      },
      'Calculator',
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
          'AI'
        )
    ),

    meta
      ? React.createElement(TimeCard, { meta })
      : React.createElement(
          'div',
          { className: 'tc-empty' },
          React.createElement(
            'div',
            { className: 'tc-empty__icon' },
            (window.UI || {}).IconClock
              ? React.createElement((window.UI || {}).IconClock!, {
                  style: { width: '32px', height: '32px' },
                })
              : null
          ),
          React.createElement(
            'div',
            { className: 'tc-empty__text' },
            loading ? 'Calculating…' : 'Type a time conversion query above'
          )
        ),

    !meta &&
      !loading &&
      React.createElement(
        'div',
        { className: 'tc-hint' },
        'Try these examples:',
        React.createElement(
          'div',
          { className: 'tc-examples' },
          ...EXAMPLE_QUERIES.map((ex) =>
            React.createElement(
              'span',
              {
                key: ex,
                className: 'tc-example-chip',
                onClick: () => {
                  window.dispatchEvent(
                    new CustomEvent('nuxy-shell-set-query', { detail: { query: ex } })
                  )
                },
              },
              ex
            )
          )
        )
      )
  )
}

// ─── Expose card renderer for shell inline use ────────────────────────────────
;(window as unknown as { __nuxyTimeCalcCard: typeof TimeCard }).__nuxyTimeCalcCard = TimeCard
