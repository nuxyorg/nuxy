const React = window.React

import type { DbStatus } from '../types.ts'

interface Params {
  regexMode: boolean
  status: DbStatus | null
}

export function useAngrysearchSync({ regexMode, status }: Params): void {
  const { ShortcutSep } = window.UI || {}

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: regexMode ? 'var(--color-danger)' : 'var(--text-muted)' }}>
              {regexMode ? 'Regex Mode' : 'Normal Mode'}
            </span>
            {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
            <span>
              {status === null
                ? 'Loading...'
                : status.isUpdating
                  ? 'Updating DB...'
                  : status.exists
                    ? 'DB Ready'
                    : 'DB Missing'}
            </span>
          </>
        ),
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [regexMode, status])
}
