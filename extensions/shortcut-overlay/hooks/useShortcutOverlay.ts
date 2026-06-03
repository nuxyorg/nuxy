const React = window.React

export function useShortcutOverlay(): void {
  const overlayEl = React.useRef<HTMLDivElement | null>(null)
  const escHandler = React.useRef<((e: KeyboardEvent) => void) | null>(null)

  function createOverlay(): HTMLDivElement {
    const el = document.createElement('div')
    el.id = 'nuxy-shortcut-overlay'
    el.style.cssText = [
      'position:fixed', 'inset:0', 'display:none',
      'align-items:center', 'justify-content:center',
      'background:var(--overlay-backdrop, rgba(0,0,0,0.75))',
      'z-index:99999'
    ].join(';')

    const card = document.createElement('div')
    card.style.cssText = [
      'background:var(--surface-raised, #1e1e1e)',
      'border-radius:var(--radius-2, 8px)',
      'padding:var(--space-6, 24px)',
      'min-width:320px',
      'max-width:480px',
      'color:var(--color-text, #fff)',
      'font-family:var(--font-sans, system-ui)',
      'box-shadow:0 8px 32px rgba(0,0,0,0.5)'
    ].join(';')

    const title = document.createElement('h2')
    title.textContent = 'Keyboard Shortcuts'
    title.style.cssText = 'margin:0 0 16px;font-size:var(--font-size-lg, 16px);font-weight:600;color:var(--color-text, #fff)'
    card.appendChild(title)

    const shortcuts = [
      { key: 'Esc', desc: 'Close / Hide' },
      { key: '↑ ↓', desc: 'Navigate list' },
      { key: '↵', desc: 'Select item' },
      { key: '⌫', desc: 'Go back / Clear' },
      { key: 'Ctrl+K', desc: 'Command palette' },
    ]

    for (const { key, desc } of shortcuts) {
      const row = document.createElement('div')
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:var(--space-2, 8px) 0;border-bottom:1px solid var(--border-subtle, rgba(255,255,255,0.08))'

      const keyEl = document.createElement('kbd')
      keyEl.textContent = key
      keyEl.style.cssText = [
        'background:var(--surface-overlay, rgba(255,255,255,0.1))',
        'border:1px solid var(--border-default, rgba(255,255,255,0.2))',
        'border-radius:var(--radius-1, 4px)',
        'padding:2px 8px',
        'font-family:var(--font-mono, monospace)',
        'font-size:var(--font-size-sm, 12px)',
        'color:var(--color-text, #fff)'
      ].join(';')

      const descEl = document.createElement('span')
      descEl.textContent = desc
      descEl.style.cssText = 'color:var(--color-text-muted, rgba(255,255,255,0.6));font-size:var(--font-size-sm, 13px)'

      row.appendChild(keyEl)
      row.appendChild(descEl)
      card.appendChild(row)
    }

    const closeHint = document.createElement('p')
    closeHint.textContent = 'Press Esc or click outside to close'
    closeHint.style.cssText = 'margin:12px 0 0;font-size:var(--font-size-xs, 11px);color:var(--color-text-muted, rgba(255,255,255,0.4));text-align:center'
    card.appendChild(closeHint)

    el.appendChild(card)

    el.addEventListener('click', (e) => {
      if (e.target === el) hideOverlay()
    })

    return el
  }

  function showOverlay(): void {
    if (!overlayEl.current) {
      overlayEl.current = createOverlay()
      document.body.appendChild(overlayEl.current)
    }
    overlayEl.current.style.display = 'flex'

    escHandler.current = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideOverlay()
    }
    window.addEventListener('keydown', escHandler.current)
  }

  function hideOverlay(): void {
    if (overlayEl.current) overlayEl.current.style.display = 'none'
    if (escHandler.current) {
      window.removeEventListener('keydown', escHandler.current)
      escHandler.current = null
    }
  }

  function registerAction(): void {
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', {
      detail: [{
        id: 'shortcut-overlay.show',
        label: 'Keyboard Shortcuts',
        handler: () => showOverlay(),
      }]
    }))
  }

  React.useEffect(() => {
    const onMounted = () => { setTimeout(registerAction, 100) }

    if (document.querySelector('.nuxy-shell-container')) setTimeout(registerAction, 100)

    window.addEventListener('nuxy-shell-mounted', onMounted)

    return () => {
      window.removeEventListener('nuxy-shell-mounted', onMounted)
      if (overlayEl.current) {
        overlayEl.current.remove()
        overlayEl.current = null
      }
    }
  }, [])
}
