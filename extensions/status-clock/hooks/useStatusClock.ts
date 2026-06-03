const React = window.React

import type { ClockSettings } from '../types.ts'
import { formatTime } from '../utils/clockFormat.ts'

const EXT_ID = 'com.nuxy.status-clock'

export function useStatusClock(): void {
  const clockElRef = React.useRef<HTMLDivElement | null>(null)
  const intervalIdRef = React.useRef<ReturnType<typeof setInterval> | null>(null)
  const settingsRef = React.useRef<ClockSettings>({ format: '24h', showSeconds: true })

  React.useEffect(() => {
    function updateClock(): void {
      if (!clockElRef.current) return
      clockElRef.current.textContent = formatTime(new Date(), settingsRef.current)
    }

    function loadSettings(): void {
      ;(window as any).core?.ipc
        ?.invoke(EXT_ID, 'getSettings', {})
        .then((res: any) => {
          if (res?.success && res?.data) {
            settingsRef.current = res.data
            updateClock()
          }
        })
        .catch(() => {})
    }

    function initClock(): void {
      if (document.getElementById('nuxy-status-clock')) return

      const el = document.createElement('div')
      el.id = 'nuxy-status-clock'
      Object.assign(el.style, {
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

      document.body.appendChild(el)
      clockElRef.current = el

      loadSettings()
      updateClock()

      if (intervalIdRef.current) clearInterval(intervalIdRef.current)
      intervalIdRef.current = setInterval(updateClock, 1000)
    }

    const onSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.extId === EXT_ID) loadSettings()
    }

    const onShellMounted = (e: Event) => {
      const container = (e as CustomEvent).detail?.container
      if (container) initClock()
    }

    window.addEventListener('nuxy-settings-updated', onSettingsUpdated)
    window.addEventListener('nuxy-shell-mounted', onShellMounted)

    if (document.querySelector('.nuxy-shell-container')) initClock()

    return () => {
      window.removeEventListener('nuxy-settings-updated', onSettingsUpdated)
      window.removeEventListener('nuxy-shell-mounted', onShellMounted)
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current)
        intervalIdRef.current = null
      }
      if (clockElRef.current) {
        clockElRef.current.remove()
        clockElRef.current = null
      }
    }
  }, [])
}
