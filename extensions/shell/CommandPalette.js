const React = window.React
const { useState, useEffect, useLayoutEffect } = React

export default function CommandPalette({ actions, onClose, containerRef, position }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [style, setStyle] = useState({})

  const filteredActions = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()))

  useLayoutEffect(() => {
    if (containerRef?.current && position) {
      const getZoom = () => {
        const z = document.documentElement.style.zoom
        if (!z) return 1
        if (z.endsWith('%')) return parseFloat(z) / 100
        return parseFloat(z) || 1
      }
      const zoom = getZoom()
      const cssWindowHeight = window.innerHeight / zoom

      const winWidth = containerRef.current.offsetWidth
      const winHeight = containerRef.current.offsetHeight

      let top = position.y + winHeight + 12
      if (top + 350 > cssWindowHeight) {
        if (position.y - 362 > 0) {
          top = position.y - 362
        } else {
          top = Math.max(12, cssWindowHeight - 362)
        }
      }

      let left = position.x + winWidth - 350
      if (left < 12) left = 12

      setStyle({
        position: 'absolute',
        top: top,
        left: left,
        width: 350,
        margin: 0,
      })
    }
  }, [containerRef, position])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredActions.length - 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const action = filteredActions[selectedIndex]
        if (action && action.onExecute) {
          action.onExecute()
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredActions, selectedIndex, onClose])

  return (
    <div
      className="nuxy-command-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="nuxy-command-palette" style={style}>
        <div className="nuxy-command-palette__input-wrapper">
          <input
            autoFocus
            className="nuxy-command-palette__input"
            placeholder="Search commands..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="nuxy-command-palette__list">
          {filteredActions.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--syntax-comment)' }}>
              No actions available.
            </div>
          ) : (
            filteredActions.map((action, idx) => (
              <div
                key={action.id}
                className={`nuxy-command-palette__item ${idx === selectedIndex ? 'nuxy-command-palette__item--active' : ''}`}
                onClick={() => {
                  if (action.onExecute) action.onExecute()
                  onClose()
                }}
              >
                <span>{action.label}</span>
                <span className="nuxy-command-palette__shortcut">Enter</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
