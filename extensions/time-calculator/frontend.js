/**
 * Time Calculator — Frontend
 *
 * This file is loaded by the shell when the time-calculator provider returns
 * a result with `meta` attached. It renders an inline visual card that looks
 * like the screenshot: left panel (source time), arrow, right panel (target time).
 *
 * The shell renders provider results as standard list items. To get the richer
 * card UI we export a default React component that the shell mounts when this
 * provider is selected as a tool, AND we also provide a standalone card
 * component used by the provider item renderer via `window.__timeCalcCard`.
 */

const React = window.React

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_STYLES = `
  .tc-card {
    display: flex;
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    background: rgba(30, 10, 10, 0.65);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow:
      0 4px 32px rgba(0, 0, 0, 0.4),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
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
    border-right: 1px solid rgba(255, 255, 255, 0.08);
  }

  .tc-panel__time {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: rgba(255, 255, 255, 0.92);
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
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .tc-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    flex-shrink: 0;
    color: rgba(255, 255, 255, 0.3);
    font-size: 20px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .tc-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.35);
    margin-bottom: 12px;
  }

  .tc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 20px;
    opacity: 0.45;
    text-align: center;
  }

  .tc-empty__icon {
    font-size: 32px;
    line-height: 1;
  }

  .tc-empty__text {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    line-height: 1.4;
  }

  .tc-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 0;
    padding: 12px;
  }

  .tc-header {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.35);
    padding: 0 4px 10px 4px;
  }

  .tc-input-area {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0 4px 16px 4px;
  }

  .tc-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 2px;
  }

  .tc-hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.35);
    line-height: 1.5;
    padding: 10px 4px 0 4px;
  }

  .tc-examples {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 4px 0;
  }

  .tc-example-chip {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: background 0.15s;
  }

  .tc-example-chip:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.75);
  }
`

function injectStyles() {
  const id = 'nuxy-time-calc-styles'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = CARD_STYLES
  document.head.appendChild(style)
}

// ─── TimeCard component ───────────────────────────────────────────────────────

function TimeCard({ meta }) {
  if (!meta) return null

  const leftText = meta.left ? meta.left.text : (meta.sourceText || meta.sourceTime)
  const leftBadge = meta.left ? meta.left.badge : (meta.sourceTime + (meta.sourceLabel && meta.sourceLabel !== 'Local' ? ` · ${meta.sourceLabel}` : ''))
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
      React.createElement(
        'div',
        { className: 'tc-panel__badge' },
        leftBadge
      )
    ),

    // Arrow
    React.createElement('div', { className: 'tc-arrow' }, '→'),

    // Right panel — destination
    React.createElement(
      'div',
      { className: 'tc-panel' },
      React.createElement(
        'div',
        { className: 'tc-panel__time tc-panel__time--large' },
        rightText
      ),
      React.createElement(
        'div',
        { className: 'tc-panel__badge' },
        rightBadge
      )
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

export default function TimeCalculatorView({ query }) {
  injectStyles()

  const [result, setResult] = React.useState(null)
  const [loading, setLoading] = React.useState(false)
  const [fromAI, setFromAI] = React.useState(false)

  const currentQuery = query || ''

  // On mount: check if there's a last result from the AI orchestrator
  React.useEffect(() => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc
      .invoke(EXT_ID, 'getLastResult')
      .then((res) => {
        if (res?.success && res.data?.meta) {
          setResult(res.data)
          setFromAI(true)
          console.info('[Time Calculator] Loaded orchestrator result:', res.data)
        }
      })
      .catch(() => {})
  }, [])

  // Live eval when user types in omnibar
  React.useEffect(() => {
    if (!currentQuery.trim()) {
      // Don't wipe AI result when query is empty (tool opened without typing)
      if (!fromAI) setResult(null)
      return
    }

    // User is typing — switch to live mode
    setFromAI(false)
    setLoading(true)
    const timer = setTimeout(() => {
      if (!window.core?.ipc?.invoke) {
        setLoading(false)
        return
      }
      window.core.ipc
        .invoke(EXT_ID, 'eval', { text: currentQuery })
        .then((res) => {
          setLoading(false)
          if (res?.success && res.data?.items?.length > 0) {
            setResult(res.data.items[0])
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

  const meta = result?.meta ?? null

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
              background: 'rgba(120, 80, 255, 0.18)',
              border: '1px solid rgba(120, 80, 255, 0.35)',
              color: 'rgba(160, 130, 255, 0.9)',
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
          React.createElement('div', { className: 'tc-empty__icon' }, '🕐'),
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
                  // Dispatch to omnibar to fill in the query
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
window.__nuxyTimeCalcCard = TimeCard
