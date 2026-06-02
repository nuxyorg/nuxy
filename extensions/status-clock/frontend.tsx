const React = window.React

import type { ClockSettings } from './types.ts'

const EXT_ID = 'com.nuxy.status-clock'

let clockEl: HTMLDivElement | null = null
let intervalId: ReturnType<typeof setInterval> | null = null
let settings: ClockSettings = { format: '24h', showSeconds: true }

function formatTime(date: Date, fmt: ClockSettings): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const s = date.getSeconds()
  const pad = (n: number) => String(n).padStart(2, '0')

  if (fmt.format === '12h') {
    const hour12 = h % 12 || 12
    const ampm = h < 12 ? 'AM' : 'PM'
    return fmt.showSeconds
      ? `${hour12}:${pad(m)}:${pad(s)} ${ampm}`
      : `${hour12}:${pad(m)} ${ampm}`
  }
  return fmt.showSeconds
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(h)}:${pad(m)}`
}

function updateClock(): void {
  if (!clockEl) return
  clockEl.textContent = formatTime(new Date(), settings)
}

function loadSettings(): void {
  ;(window as any).core?.ipc
    ?.invoke(EXT_ID, 'getSettings', {})
    .then((res: any) => {
      if (res?.success && res?.data) {
        settings = res.data
        updateClock()
      }
    })
    .catch(() => {})
}

function initClock(): void {
  if (document.getElementById('nuxy-status-clock')) return

  clockEl = document.createElement('div')
  clockEl.id = 'nuxy-status-clock'
  Object.assign(clockEl.style, {
    position: 'fixed',
    bottom: 'var(--space-3, 12px)',
    right: 'var(--space-3, 12px)',
    zIndex: '9997',
    background: 'var(--surface-overlay, rgba(0,0,0,0.45))',
    padding: '2px var(--space-3, 12px)',
    borderRadius: 'var(--radius-1, 4px)',
    color: 'var(--color-text-muted, rgba(255,255,255,0.45))',
    fontSize: 'var(--font-size-sm, 12px)',
    fontFamily: 'var(--font-mono, monospace)',
    pointerEvents: 'none',
    userSelect: 'none',
    letterSpacing: '0.05em',
  })

  document.body.appendChild(clockEl)

  loadSettings()
  updateClock()

  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(updateClock, 1000)
}

// Listen for settings updates
window.addEventListener('nuxy-settings-updated', (e: Event) => {
  const detail = (e as CustomEvent).detail
  if (detail?.extId === EXT_ID) loadSettings()
})

// Self-attach on shell mount
window.addEventListener('nuxy-shell-mounted', (e: Event) => {
  const container = (e as CustomEvent).detail?.container
  if (container) initClock()
})

// Fallback: shell container already in DOM
const existing = document.querySelector('.nuxy-shell-container')
if (existing) initClock()

export default function StatusClockView() {
  return null
}
