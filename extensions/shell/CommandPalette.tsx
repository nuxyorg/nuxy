const React = window.React
const { useState, useEffect, useLayoutEffect } = React

import type { CommandPaletteAction, Position } from './types.ts'

const MAX_DEPTH = 10

interface CommandPaletteProps {
  actions: CommandPaletteAction[]
  onClose: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
  position: Position
}

export default function CommandPalette({
  actions,
  onClose,
  containerRef,
  position,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [style, setStyle] = useState<React.CSSProperties>({})
  const [menuStack, setMenuStack] = useState<CommandPaletteAction[][]>([actions])
  const [pathLabels, setPathLabels] = useState<string[]>([])

  const currentLevel = menuStack[menuStack.length - 1]
  const filteredActions = currentLevel.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  )

  const goBack = () => {
    if (menuStack.length > 1) {
      setMenuStack((prev) => prev.slice(0, -1))
      setPathLabels((prev) => prev.slice(0, -1))
      setQuery('')
      setSelectedIndex(0)
    } else {
      onClose()
    }
  }

  const openSubmenu = (action: CommandPaletteAction) => {
    if (!action.children || menuStack.length >= MAX_DEPTH) return
    setMenuStack((prev) => [...prev, action.children!])
    setPathLabels((prev) => [...prev, action.label])
    setQuery('')
    setSelectedIndex(0)
  }

  const executeAction = (action: CommandPaletteAction) => {
    if (action.children) {
      openSubmenu(action)
    } else if (action.onExecute) {
      action.onExecute()
      onClose()
    }
  }

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

      let left = position.x + winWidth - 350
      if (left < 12) left = 12

      let bottom = cssWindowHeight - (position.y + winHeight)
      if (bottom < 12) bottom = 12

      setStyle({
        position: 'absolute',
        bottom: bottom,
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        goBack()
      } else if (e.key === 'ArrowLeft' && query === '' && menuStack.length > 1) {
        e.preventDefault()
        goBack()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, Math.max(0, filteredActions.length - 1)))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const action = filteredActions[selectedIndex]
        if (action) executeAction(action)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        const action = filteredActions[selectedIndex]
        if (action?.children) openSubmenu(action)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [filteredActions, selectedIndex, query, menuStack, onClose])

  return (
    <div
      className="nuxy-command-palette-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="nuxy-command-palette" style={style}>
        {pathLabels.length > 0 && (
          <div className="nuxy-command-palette__breadcrumb">
            <button className="nuxy-command-palette__back" onClick={goBack}>
              ←
            </button>
            <span className="nuxy-command-palette__breadcrumb-path">
              {pathLabels.join(' › ')}
            </span>
          </div>
        )}
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
                onClick={() => executeAction(action)}
              >
                <span>{action.label}</span>
                {action.children ? (
                  <span className="nuxy-command-palette__submenu-arrow">›</span>
                ) : (
                  <span className="nuxy-command-palette__shortcut">Enter</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
